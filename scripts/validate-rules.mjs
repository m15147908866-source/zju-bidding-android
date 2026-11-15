#!/usr/bin/env node
/* ============================================================================
   scripts/validate-rules.mjs — 规则数据校验（CI 门禁）
   检查项：
     1. 结构：必需字段、叫品/形态、hcp 区间、shape 键名
     2. 可推荐性：hcp 与 shape 同时为空时 recommendable 必须为 false
     3. 语境键：每个 key 必须能由一副真实叫牌过程生成（防止手写错位）
     4. 唯一性：同一 (seatRole, contextKey, 叫品) 只能有一条规则；
        形态规则按「该语境下的合法叫品」展开后再判重
     5. 说明与约定：contextKeys 合法、答叫表叫品合法
   用法：node scripts/validate-rules.mjs
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { Auction } = require(path.join(ROOT, 'core/auction.js'));
const C = require(path.join(ROOT, 'core/calls.js'));
const X = require(path.join(ROOT, 'core/context.js'));
const R = require(path.join(ROOT, 'core/rules.js'));

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const FORM_TYPES = ['newSuit', 'jumpNewSuit', 'raise', 'jumpRaise', 'doubleRaise', 'tripleRaise',
  'gameRaise', 'inviteRaise', 'rebidOwn', 'jumpRebidOwn', 'doubleJumpOwn', 'gameOwn',
  'splinter', 'exclusion', 'reverse', 'cue', 'jumpSuit'];
const ROLES = ['opener', 'responder', 'overcaller', 'advancer'];
const SUIT_KEYS = ['S', 'H', 'D', 'C'];

/* ---------------- 由 contextKey 还原一副真实叫牌 ---------------- */
/**
 * 键里省略了「对手的 Pass」，所以还原时要按座位顺序把 Pass 补回去：
 * M:1H P:1S 实际是 N-1H, E-Pass, S-1S。
 */
function auctionForKey(key) {
  if (!key) return { dealer: 'N', calls: [], seat: 'N' };
  const toks = key.split(' ');
  const firstRel = toks[0][0];
  const dealer = firstRel === 'M' ? 'N' : firstRel === 'P' ? 'S' : 'E';
  const seat = 'N';
  const calls = [];
  let next = dealer;
  for (const t of toks) {
    const rel = t[0];
    const call = t.slice(2);
    let guard = 0;
    while (X.relOf(next, seat) !== rel) {
      if (++guard > 4) throw new Error('contextKey 的座位顺序不成立：' + key);
      calls.push('P');
      next = C.NEXT[next];
    }
    calls.push(call);
    next = C.NEXT[next];
  }
  return { dealer, calls, seat };
}

function keyIsReachable(key) {
  if (key === '') return true;
  const toks = key.split(' ');
  for (const t of toks) {
    if (!/^[MOP]:/.test(t)) return false;
    const call = t.slice(2);
    if (call === '*') continue;                // 整段通配
    // 只支持整段通配：2*、1N* 这类半截通配永远匹配不上真实叫品
    if (call.includes('*')) return false;
    if (!C.normalizeCall(call)) return false;
  }
  // 与 core/context.js 的规范化保持一致：不得出现对手 Pass，也不得以 Pass 开头
  if (/(^| )O:P( |$)/.test(key)) return false;
  if (/^[MOP]:P( |$)/.test(key)) return false;
  // 通配符键跳过还原校验（无法枚举）
  if (key.includes('*')) return true;
  try {
    const { dealer, calls, seat } = auctionForKey(key);
    const a = Auction.fromCalls(dealer, calls);
    return X.contextKey(a, seat) === key;
  } catch (e) {
    return false;
  }
}

function legalBidsForKey(key) {
  if (key.includes('*')) return null;
  try {
    const { dealer, calls, seat } = auctionForKey(key);
    const a = Auction.fromCalls(dealer, calls);
    if (a.complete) return [];
    return { auction: a, bids: a.legalCalls(), seat };
  } catch (e) {
    return null;
  }
}

function keyOverlap(a, b) {
  const sa = a.split(' '), sb = b.split(' ');
  if (sa.length !== sb.length) return false;
  for (let i = 0; i < sa.length; i++) {
    if (sa[i][0] !== sb[i][0]) return false;
    const ca = sa[i].slice(2), cb = sb[i].slice(2);
    if (ca === '*' || cb === '*') continue;
    if (ca !== cb) return false;
  }
  return true;
}

/* ---------------- 规则校验 ---------------- */
function validateRule(rule, sysKey, file) {
  const at = `${file} ${rule.id || '(无 id)'}`;
  if (!rule.id) err(`${at} 缺少 id`);
  if (rule.system !== sysKey) err(`${at} system 字段与文件名不一致`);
  if (!ROLES.includes(rule.seatRole)) err(`${at} seatRole 非法：${rule.seatRole}`);
  if (!Array.isArray(rule.contextKeys) || !rule.contextKeys.length) err(`${at} contextKeys 为空`);
  (rule.contextKeys || []).forEach((k) => {
    if (typeof k !== 'string') err(`${at} contextKey 必须是字符串`);
    else if (!keyIsReachable(k)) err(`${at} contextKey 不可达：${k}`);
    else if (X.roleOfKey(k) !== rule.seatRole) {
      err(`${at} seatRole=${rule.seatRole} 与 contextKey「${k}」推导出的 ${X.roleOfKey(k)} 不一致`);
    }
  });

  if (rule.bid == null && !rule.bidForm) err(`${at} 既没有 bid 也没有 bidForm`);
  if (rule.bid != null) {
    if (!C.normalizeCall(rule.bid)) err(`${at} bid 非法：${rule.bid}`);
  }
  if (rule.bidForm) {
    if (!FORM_TYPES.includes(rule.bidForm.type)) err(`${at} bidForm.type 未知：${rule.bidForm.type}`);
    if (rule.bidForm.level != null && (rule.bidForm.level < 1 || rule.bidForm.level > 7)) {
      err(`${at} bidForm.level 越界`);
    }
  }

  if (rule.hcp) {
    if (typeof rule.hcp.min !== 'number') err(`${at} hcp.min 必须是数字`);
    if (rule.hcp.max != null && rule.hcp.max < rule.hcp.min) err(`${at} hcp 区间倒置`);
    if (rule.hcp.min < 0 || (rule.hcp.max || 0) > 37) err(`${at} hcp 越界`);
  }
  if (rule.shape) {
    const keys = Object.keys(rule.shape);
    if (!keys.length) err(`${at} shape 是空对象`);
    keys.forEach((k) => {
      if (!['balanced', 'suitMin', 'suitMax', 'shortage'].includes(k)) err(`${at} shape.${k} 不是支持的字段`);
      if (k === 'suitMin' || k === 'suitMax') {
        Object.keys(rule.shape[k]).forEach((s) => {
          if (!SUIT_KEYS.includes(s) && s !== 'bid') err(`${at} shape.${k} 花色非法：${s}`);
        });
      }
      if (k === 'shortage' && !['any', ...SUIT_KEYS].includes(rule.shape[k])) {
        err(`${at} shape.shortage 非法：${rule.shape[k]}`);
      }
    });
  }

  const hasConstraint = !!(rule.hcp && typeof rule.hcp.min === 'number') ||
    !!(rule.shape && Object.keys(rule.shape).length);
  if (!hasConstraint && rule.recommendable !== false) {
    err(`${at} 既无 hcp 也无 shape，必须 recommendable:false（审计 P0-4）`);
  }
  if (!rule.meaning || !String(rule.meaning).trim()) err(`${at} meaning 为空`);
  if (!rule.source) warn(`${at} 缺少 source`);
  if (rule.excludeKeys) {
    rule.excludeKeys.forEach((e) => {
      if (!rule.contextKeys.some((k) => keyOverlap(e, k))) {
        err(`${at} excludeKeys「${e}」没有命中任何 contextKey`);
      }
    });
  }
}

/* ---------------- 唯一性 ---------------- */
const FORM_PRIORITY = {
  cue: 60, splinter: 55, exclusion: 55, reverse: 55,
  jumpNewSuit: 50, jumpRebidOwn: 50, doubleJumpOwn: 50, jumpRaise: 50,
  tripleRaise: 45, doubleRaise: 40, gameRaise: 40, gameOwn: 40,
  newSuit: 30, rebidOwn: 30, raise: 30, inviteRaise: 25, jumpSuit: 20
};
function specificity(r) {
  if (r.bid) return 1000;
  return (FORM_PRIORITY[r.bidForm.type] || 10) + (r.bidForm.level ? 5 : 0);
}

/**
 * 同一 (语境, 叫品) 允许「具体叫品 + 若干形态」并存，但：
 *   - 两条具体叫品规则 → 冲突（错误）
 *   - 两条同优先级的形态规则 → 冲突（错误）
 *   - 具体 vs 形态、形态 vs 更宽形态 → 允许（运行时按优先级取最具体的一条）
 */
function checkUnique(rules, sysKey) {
  const claims = new Map();     // `${key}|${bid}` -> [{id, spec}]
  const byKey = new Map();

  for (const r of rules) {
    for (const key of r.contextKeys) {
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(r);
    }
  }

  function claim(key, bid, r) {
    if ((r.excludeKeys || []).some((e) => X.keyMatches(e, key))) return;
    const id = `${key}|${bid}`;
    if (!claims.has(id)) claims.set(id, []);
    claims.get(id).push({ id: r.id, spec: specificity(r) });
  }

  for (const [key, group] of byKey) {
    const lit = legalBidsForKey(key);
    if (!lit) continue;                       // 通配符键：只做字面判重
    for (const r of group) {
      const bids = r.bid ? [r.bid] : lit.bids.filter((b) => R.bidFormMatches(r.bidForm, b, lit.auction, lit.seat));
      for (const b of bids) claim(key, b, r);
    }
  }

  for (const [id, list] of claims) {
    if (list.length < 2) continue;
    const top = Math.max(...list.map((x) => x.spec));
    const tied = list.filter((x) => x.spec === top);
    if (tied.length > 1) {
      err(`${sysKey} 「${id.replace('|', '」叫品 ')}」被同优先级的 ${tied.map((x) => x.id).join(' 与 ')} 重复定义`);
    }
  }

  // 通配符键与字面键的重叠（同样按优先级判定）
  const keys = Array.from(byKey.keys()).filter((k) => !k.includes('*'));
  for (const [wk, group] of byKey) {
    if (!wk.includes('*')) continue;
    for (const r of group) {
      for (const lk of keys) {
        if (!X.keyMatches(wk, lk)) continue;
        const lit = legalBidsForKey(lk);
        if (!lit) continue;
        const bids = r.bid ? [r.bid] : lit.bids.filter((b) => R.bidFormMatches(r.bidForm, b, lit.auction, lit.seat));
        for (const b of bids) claim(lk, b, r);
      }
    }
  }

  for (const [id, list] of claims) {
    if (list.length < 2) continue;
    const top = Math.max(...list.map((x) => x.spec));
    const tied = list.filter((x) => x.spec === top);
    if (tied.length > 1) {
      err(`${sysKey} 「${id.replace('|', '」叫品 ')}」被同优先级的 ${tied.map((x) => x.id).join(' 与 ')} 重复定义（含通配规则）`);
    }
  }
}

/* ---------------- 主流程 ---------------- */
const systemsMeta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/systems.json'), 'utf8'));
const metaByKey = Object.fromEntries(systemsMeta.map((s) => [s.key, s]));

for (const meta of systemsMeta) {
  const file = `data/rules/${meta.key}.json`;
  const rules = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  rules.forEach((r) => validateRule(r, meta.key, file));
  checkUnique(rules, meta.key);

  (meta.notes || []).forEach((n) => {
    (n.contextKeys || []).forEach((k) => {
      if (!keyIsReachable(k)) err(`${meta.key} 说明 ${n.id} 的 contextKey 不可达：${k}`);
      else if (n.seatRole && X.roleOfKey(k) !== n.seatRole) {
        warn(`${meta.key} 说明 ${n.id} 的 seatRole 与 ${k} 不一致`);
      }
    });
    if (!n.text) err(`${meta.key} 说明 ${n.id} 缺少 text`);
  });

  for (const [ask, table] of Object.entries(meta.answers || {})) {
    if (!['blackwood', 'blackwoodK', 'gerber', 'gerberK'].includes(ask)) err(`${meta.key} 答叫表键名未知：${ask}`);
    for (const bid of Object.keys(table)) {
      if (!C.isBid(bid)) err(`${meta.key} 答叫表叫品非法：${bid}`);
    }
  }

  const rec = rules.filter((r) => r.recommendable !== false).length;
  console.log(`${meta.key}: ${rules.length} 条规则，其中可推荐 ${rec} 条；说明 ${(meta.notes || []).length} 条`);
}

console.log(`\n错误 ${errors.length}，警告 ${warnings.length}`);
errors.slice(0, 60).forEach((e) => console.log('  ✖ ' + e));
warnings.slice(0, 30).forEach((w) => console.log('  ⚠ ' + w));
if (errors.length) process.exitCode = 1;
