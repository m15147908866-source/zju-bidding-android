#!/usr/bin/env node
/* ============================================================================
   tools/compare-real-deals.mjs — 用真实赛事牌局对拍引擎推荐（可选工具，不进 CI）

   数据包不入库，按需从外部传入：
     node tools/compare-real-deals.mjs path/to/deals.json
     node tools/compare-real-deals.mjs path/to/deals.json --system zju

   deals.json 每条形如：
     { "id": "1325", "dealer": "S", "deal": "N:KJ942.Q2.K52.K92 ...",
       "auction": "1S P 2C P ..." }

   输出：总步数、按角色的首选命中率、首轮应叫语境命中率，以及
   「同伴开叫 1M、应叫人 13~14 点、将牌 2 张、无五张套」的缺口牌例。
   公开赛事不记录体系，低命中率不等于引擎错误；只把缺口清单当作人工复核线索。
   ========================================================================== */
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const requireHere = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BC = {};
for (const f of ['calls', 'auction', 'context', 'hand', 'rules', 'recommend']) {
  Object.assign(BC, requireHere(path.join(ROOT, 'core', f + '.js')));
}
const data = requireHere(path.join(ROOT, 'data/bridge-data.js'));

const args = process.argv.slice(2);
const file = args.find((x) => !x.startsWith('--'));
const sysKey = (args.find((x) => x.startsWith('--system=')) || '').split('=')[1] || 'sayc';

if (!file) {
  console.error('用法：node tools/compare-real-deals.mjs <deals.json> [--system=sayc|zju|xinrui]');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error('找不到牌局文件：' + file);
  process.exit(1);
}
const sys = data.systems.find((s) => s.key === sysKey);
if (!sys) {
  console.error('未知体系：' + sysKey + '（可选 ' + data.systems.map((s) => s.key).join(' / ') + '）');
  process.exit(1);
}
const STORE = BC.createStore(sys);
const SEATS = ['N', 'E', 'S', 'W'];
const PARTNER = { N: 'S', S: 'N', E: 'W', W: 'E' };

function parseDeal(text) {
  const hands = {};
  text.trim().split(/\s+/).forEach((part, i) => {
    const suits = part.replace(/^[NESW]:/, '').split('.');
    const h = { S: suits[0].length, H: suits[1].length, D: suits[2].length, C: suits[3].length, hcp: 0 };
    for (const ch of suits.join('')) {
      h.hcp += ch === 'A' ? 4 : ch === 'K' ? 3 : ch === 'Q' ? 2 : ch === 'J' ? 1 : 0;
    }
    hands[SEATS[i]] = h;
  });
  return hands;
}

function callsOf(text) {
  return text.trim().split(/\s+/).map((x) => {
    const n = BC.normalizeCall(x);
    if (!n) throw new Error('无法识别的叫品：' + x);
    return n;
  });
}

function bump(bucket, key, field) {
  bucket[key] = bucket[key] || { n: 0, top1: 0, top3: 0, none: 0 };
  bucket[key].n++;
  if (field) bucket[key][field]++;
}

const deals = JSON.parse(fs.readFileSync(file, 'utf8'));
const byRole = {};
const byKey = {};
const gaps = [];
let total = 0;

for (const deal of deals) {
  const hands = parseDeal(deal.deal);
  const calls = callsOf(deal.auction);
  const dealer = SEATS.indexOf(deal.dealer);
  for (let i = 0; i < calls.length; i++) {
    const seat = SEATS[(dealer + i) % 4];
    const actual = calls[i];
    let auction;
    let res;
    try {
      auction = BC.Auction.fromCalls(deal.dealer, calls.slice(0, i));
      res = BC.recommend(STORE, auction, seat, hands[seat]);
    } catch (e) {
      continue;
    }
    const idx = res.candidates.findIndex((c) => c.bid === actual);
    total++;
    bump(byRole, res.role || 'unknown', idx === 0 ? 'top1' : idx > 0 && idx < 3 ? 'top3' : 'none');
    bump(byKey, res.key || '(open)', idx === 0 ? 'top1' : idx > 0 && idx < 3 ? 'top3' : 'none');

    // 缺口：同伴开叫 1M、对手未插叫、应叫人 13~14 点、2 张将牌、无五张套
    const before = calls.slice(0, i);
    const openerIdx = before.findIndex((c) => c !== 'P' && c !== 'X' && c !== 'XX');
    if (openerIdx < 0) continue;
    const openerSeat = SEATS[(dealer + openerIdx) % 4];
    const opened = before[openerIdx];
    if (PARTNER[seat] !== openerSeat) continue;
    if (before.slice(openerIdx + 1).some((c) => c !== 'P')) continue;
    if (!/^1[H,S]$/.test(opened)) continue;
    // 只取应叫人的第一次叫牌，排除已经 Pass 过再叫的情况
    const acted = before.some((_, j) => j > openerIdx && SEATS[(dealer + j) % 4] === seat);
    if (acted) continue;
    const h = hands[seat];
    if (h.hcp < 13 || h.hcp > 14) continue;
    if (h[opened[1]] !== 2 || Math.max(h.S, h.H, h.D, h.C) > 4) continue;
    gaps.push({
      id: deal.id, seat, opener: opened, actual,
      hand: [h.S, h.H, h.D, h.C].join('-') + ' / ' + h.hcp + ' 点',
      engine: res.candidates.slice(0, 4).map((c) => c.bid).join(' ')
    });
  }
}

const pct = (a, b) => b ? ((a / b) * 100).toFixed(1) + '%' : '-';
console.log(`体系 ${sys.name}（${sysKey}），牌局 ${deals.length} 副，叫牌 ${total} 步`);
console.log('\n按角色（首选 / 前三 / 未命中）：');
for (const [k, v] of Object.entries(byRole).sort((a, b) => b[1].n - a[1].n)) {
  console.log(`  ${k.padEnd(12)} ${String(v.n).padStart(6)}  ${pct(v.top1, v.n).padStart(6)}  ${pct(v.top1 + v.top3, v.n).padStart(6)}  ${pct(v.none, v.n).padStart(6)}`);
}
console.log('\n首轮应叫语境（首选 / 样本）：');
for (const [k, v] of Object.entries(byKey)
  .filter(([k]) => /^P:1[CDHSN]$/.test(k))
  .sort((a, b) => b[1].n - a[1].n)) {
  console.log(`  ${k.padEnd(10)} ${pct(v.top1, v.n).padStart(6)}  ${String(v.n).padStart(5)}`);
}
console.log(`\n1M 应叫缺口：${gaps.length} 副`);
for (const g of gaps) {
  console.log(`  ${g.id}  ${g.opener}—? ${g.hand}  实战 ${g.actual}  引擎 ${g.engine || '（无候选）'}`);
}
console.log('\n注：公开赛事不记录体系，命中率只作线索，不作回归断言。');
