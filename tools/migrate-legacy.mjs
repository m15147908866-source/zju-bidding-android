#!/usr/bin/env node
/* ============================================================================
   tools/migrate-legacy.mjs — 已冻结的一次性迁移脚本（仅用于追溯，CI 不再执行）
   把 legacy/data*.js 里的扁平规则，转换成 data/rules/<system>.json：
   每条规则带规范叫品、contextKeys、hcp、shape。

   数据源已收口为 data/rules/*.json：日常改规则请直接改 JSON，不要再跑本脚本；
   它只用于回答「当年这 599 条是怎么变成 768 条的」，不保证与现行 JSON 同步。
   默认只计算并打印统计，不写文件；确需重放历史迁移时显式加 --write。

   迁移原则：
     1. 叫牌含义（d）、来源（s）、标签（k）逐字保留，不改写桥牌语义；
     2. contextKeys 由「模拟一副叫牌过程 + contextKey()」生成，与运行时同源；
     3. 点数文案解析为 hcp 区间；解析不出的保留 legacyP 并标 needsReview；
     4. 无点数也无牌型约束的规则 recommendable=false（只解释，不推荐）。
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* 冻结后默认只读：不写 data/，避免误把现行规则回退成历史迁移结果 */
const WRITE = process.argv.includes('--write');
const { Auction } = require(path.join(ROOT, 'core/auction.js'));
const C = require(path.join(ROOT, 'core/calls.js'));
const X = require(path.join(ROOT, 'core/context.js'));
const R = require(path.join(ROOT, 'core/rules.js'));

const LEGACY = [
  { file: 'legacy/data.js', arr: 'RULES_SAYC', key: 'sayc' },
  { file: 'legacy/data-zju.js', arr: 'RULES_ZJU', key: 'zju' },
  { file: 'legacy/data-xinrui.js', arr: 'RULES_XR', key: 'xinrui' }
];

/* ---------------- 读取旧数据 ---------------- */
function loadLegacy(file, arrName) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const register = (sys) => { register.__last = sys; };
  const fn = new Function('registerSystem', 'useSystem', 'state',
    src + `\n;return { rules: ${arrName}, system: registerSystem.__last };`);
  return fn(register, () => {}, {});
}

/* ---------------- 点数文案解析 ---------------- */
function parsePits(p, r) {
  if (p == null) return { hcp: null, shape: null, needsReview: false };
  const s = String(p).trim();

  let m = /^(\d+)\s*~\s*(\d+)$/.exec(s);
  if (m) return { hcp: { min: +m[1], max: +m[2] }, shape: null, needsReview: false };

  m = /^(\d+)\s*以上$/.exec(s);
  if (m) return { hcp: { min: +m[1], max: 37 }, shape: null, needsReview: false };

  m = /^(\d+)\s*以下$/.exec(s);
  if (m) return { hcp: { min: 0, max: +m[1] }, shape: null, needsReview: false };

  m = /^(\d+)\s*张以上\s*([SHDC])$/.exec(s);
  if (m) {
    const suit = m[2];
    return { hcp: null, shape: { suitMin: { [suit]: +m[1] } }, needsReview: false };
  }

  if (s === '弱') return { hcp: { min: 6, max: 10 }, shape: null, needsReview: false, note: '无局 6~10，有局 8~10' };

  m = /^(\d+)\s*左右$/.exec(s);
  if (m) return { hcp: { min: +m[1] - 1, max: +m[1] + 1 }, shape: null, needsReview: false };

  return { hcp: null, shape: null, needsReview: true };
}

/* ---------------- 从说明文字补牌型约束 ----------------
   旧资料的「点力」字段只写了 HCP，真正决定能不能叫的牌型写在说明里，
   例如「3 张以上红心支持」「6 张以上所叫花色」「否认 4 张黑桃」。
   这里只解析含义明确的句式，不猜没有写出来的要求：
     - 明确花色名、『所叫花色/高花/低花』、『N 张支持』
     - 『均型』（排除『半均型/非均型』）
     - 『带单缺』、『否认/不足 N 张』
   解析结果与 p 字段已有的 shape 合并取更严格的边界。 */
const CN_NUM = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function cnNums(text) {
  return String(text).replace(/[零一二两三四五六七八九十]+/g, (m) => {
    if (m.length === 1) return String(CN_NUM[m]);
    // 十一、十二 …… 十九
    if (m[0] === '十') return String(10 + (CN_NUM[m[1]] || 0));
    if (m[1] === '十' && m.length === 2) return String(CN_NUM[m[0]] * 10);
    if (m[1] === '十' && m.length === 3) return String(CN_NUM[m[0]] * 10 + (CN_NUM[m[2]] || 0));
    return m;
  });
}

const SUIT_CN = { 红心: 'H', 黑桃: 'S', 方块: 'D', 梅花: 'C' };

function addMin(shape, suit, n) {
  if (!suit || !n) return;
  shape.suitMin = shape.suitMin || {};
  shape.suitMin[suit] = Math.max(shape.suitMin[suit] || 0, n);
}

function addMax(shape, suit, n) {
  if (!suit || n == null) return;
  shape.suitMax = shape.suitMax || {};
  shape.suitMax[suit] = Math.min(shape.suitMax[suit] == null ? 13 : shape.suitMax[suit], n);
}

/** 说明文字 → shape；没有可靠信息时返回 null */
function shapeFromMeaning(text, bid) {
  if (!text) return null;
  const raw = cnNums(text);
  const shape = {};
  const own = bid && C.isBid(bid) ? C.strainOf(bid) : null;
  // 括号里通常是例外说明（“三张也可”“持 4-3-3-3 除外”），先判断再移除
  const clauses = raw.split(/[，。；、]/).map((x) => x.trim()).filter(Boolean);

  for (const rawClause of clauses) {
    if (!rawClause) continue;
    const soft = /(通常|除外|可选|非原版|不保证|可能|或许)/.test(rawClause);
    const clause = rawClause.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '');
    const relaxed = /也可|亦可|至少可/.test(rawClause);
    const num = (m) => {
      let n = +m[1];
      if (relaxed && n > 1) n -= 1;     // “6 张以上（5 张也可）” → 按 5 张兜底
      return n;
    };

    // 均型（半均型/非均型不算）
    if (/均型|平均牌型/.test(clause) && !/半均型|非均型/.test(clause)) {
      shape.balanced = true;
    }
    // 斯台曼：至少一门四张高花
    let mm = clause.match(/至少\s*[一1]\s*门\s*(\d+)\s*张高花/);
    if (mm && +mm[1] === 4) {
      shape.major4 = true;
      continue;
    }
    // 至少一门低花 N 张（2♠ 弱低花接力 / 拼搏 3NT）
    mm = clause.match(/^(\d+)\s*[~-]\s*(\d+)\s*张.*低花/);
    if (mm) {
      shape.anyMinorMin = +mm[1];
      continue;
    }
    mm = clause.match(/^(\d+)\s*张以上低花/);
    if (mm) {
      shape.anyMinorMin = +mm[1];
      continue;
    }
    // 单缺
    if (/单缺/.test(clause) && !/无单缺|否认/.test(clause)) {
      const m = clause.match(/(红心|黑桃|方块|梅花)单缺/);
      if (m) {
        shape.shortage = SUIT_CN[m[1]];
      } else {
        shape.shortage = 'any';
      }
    }

    // 否认 / 不足 N 张（同一句里可能同时否认两门花色）
    if (/否认|不足|无\s*\d+\s*张高花/.test(clause)) {
      if (!soft) {
        for (const m of clause.matchAll(/(\d+)\s*张\s*(红心|黑桃|方块|梅花)/g)) {
          addMax(shape, SUIT_CN[m[2]], +m[1] - 1);
        }
        for (const m of clause.matchAll(/(\d+)\s*张高花/g)) {
          addMax(shape, 'H', +m[1] - 1);
          addMax(shape, 'S', +m[1] - 1);
        }
      }
      continue;
    }
    // “可以是/允许”只是描述可能性，不是要求
    if (/可以是|允许|也可|亦可/.test(clause)) continue;
    let m;

    // N 张以上支持 / N 张支持 / N~M 张支持 / 至少 N 张
    m = clause.match(/(\d+)\s*张(?:以上)?\s*(红心|黑桃|方块|梅花)?\s*支持/);
    if (m) {
      // 2NT 这类无将叫品说「N 张支持」时，指的是支持同伴的花色
      const suit = m[2] ? SUIT_CN[m[2]] : (own === 'N' ? 'partner' : (own || 'bid'));
      if (m[1] === '2' && !/以上/.test(clause)) {
        addMax(shape, suit, 2);       // “两张红心支持”= 恰好两张
      } else {
        addMin(shape, suit, num(m));
      }
      continue;
    }
    m = clause.match(/(\d+)\s*[~-]\s*(\d+)\s*张\s*(红心|黑桃|方块|梅花)?\s*支持/);
    if (m) {
      const suit = m[3] ? SUIT_CN[m[3]] : (own || 'bid');
      addMin(shape, suit, +m[1]);
      continue;
    }
    m = clause.match(/至少\s*(\d+)\s*张/);
    if (m && !/高花|低花/.test(clause)) {
      addMin(shape, own || 'bid', +m[1]);
      continue;
    }
    m = clause.match(/保证\s*(\d+)\s*张/);
    if (m && !/高花|低花/.test(clause)) {
      addMin(shape, own || 'bid', +m[1]);
      continue;
    }

    // N 张以上 + 花色
    m = clause.match(/(\d+)\s*张以上\s*(所叫花色|所叫高花|所叫低花|红心|黑桃|方块|梅花|该花色)/);
    if (m) {
      const suit = SUIT_CN[m[2]] || own || 'bid';
      addMin(shape, suit, num(m));
      continue;
    }
    // N 张 + 花色（限制性加叫等）
    m = clause.match(/(\d+)\s*张\s*(红心|黑桃|方块|梅花)/);
    if (m && !soft) {
      addMin(shape, SUIT_CN[m[2]], num(m));
      continue;
    }
    // 「N 张所叫花色」「N 张以上好套」（争叫类，未写出具体花色）
    m = clause.match(/(\d+)\s*张(?:以上)?\s*(?:好套|所叫花色)/);
    if (m && !soft) {
      addMin(shape, own || 'bid', num(m));
      continue;
    }
    // “4 张以上”但没有花色名：只在明确说“新花色/原花色/开叫花色”时归到所叫花色
    m = clause.match(/(\d+)\s*张以上/);
    if (m && /新花色|原花色|开叫花色|开叫低花|开叫高花|所叫/.test(clause)) {
      addMin(shape, own || 'bid', num(m));
    }
  }

  const keys = Object.keys(shape);
  if (!keys.length) return null;
  if (shape.suitMin) {
    for (const s of Object.keys(shape.suitMin)) {
      if (shape.suitMax && shape.suitMax[s] != null && shape.suitMin[s] > shape.suitMax[s]) {
        delete shape.suitMax[s];
      }
    }
    if (!Object.keys(shape.suitMin).length) delete shape.suitMin;
  }
  if (shape.suitMax && !Object.keys(shape.suitMax).length) delete shape.suitMax;
  return Object.keys(shape).length ? shape : null;
}

function mergeShape(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const out = JSON.parse(JSON.stringify(a));
  if (b.balanced != null) out.balanced = b.balanced;
  if (b.shortage) out.shortage = b.shortage;
  for (const key of ['suitMin', 'suitMax']) {
    if (!b[key]) continue;
    out[key] = out[key] || {};
    for (const s of Object.keys(b[key])) {
      if (key === 'suitMin') addMin(out, s, b[key][s]);
      else addMax(out, s, b[key][s]);
    }
  }
  return out;
}

/* ---------------- 语境键生成 ---------------- */
const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/**
 * 手写键里的叫品可能写成旧编码（1NT / PASS），统一规范成内部编码（1N / P）。
 * 通配符段原样保留，非法叫品也原样保留，交给校验脚本报错。
 */
function normalizeKey(key) {
  return key.split(' ').map((t) => {
    const rel = t[0];
    const call = t.slice(2);
    if (call.includes('*')) return t;
    const n = C.normalizeCall(call);
    return n ? `${rel}:${n}` : t;
  }).join(' ');
}

function auctionOf(calls, dealer = 'N') {
  return Auction.fromCalls(dealer, calls);
}

/* 旧数据沿用中文习惯：双加叫 = 3 阶、三加叫 = 4 阶；
   新内核用「最低加叫 +N」命名（jumpRaise=+1、doubleRaise=+2），这里按原意对齐。 */
const LEGACY_FORM_ALIAS = { doubleRaise: 'jumpRaise', tripleRaise: 'doubleRaise' };

function toCoreForm(spec) {
  if (!spec || typeof spec !== 'object' || !spec.type) return spec;
  const type = LEGACY_FORM_ALIAS[spec.type];
  return type ? { ...spec, type } : spec;
}

/* 开叫的点力字段只有点数，张数写在同一条旧规则的说明里。
   这里把说明中明写的张数/牌型补成 shape，供「推荐」做硬约束；
   不额外推断说明里没写的内容（bid 表示「所叫花色」）。 */
const OPEN_SHAPE = {
  sayc: {
    '1C': { suitMin: { C: 3 } },
    '1D': { suitMin: { D: 4 } },
    '1H': { suitMin: { H: 5 } },
    '1S': { suitMin: { S: 5 } },
    '1N': { balanced: true },
    '2N': { balanced: true },
    '3N': { anyMinorMin: 7 },
    '2D': { suitMin: { bid: 6 } },
    '2H': { suitMin: { bid: 6 } },
    '2S': { suitMin: { bid: 6 } },
    '3C': { suitMin: { bid: 7 } },
    '3D': { suitMin: { bid: 7 } },
    '3H': { suitMin: { bid: 7 } },
    '3S': { suitMin: { bid: 7 } },
    '4C': { suitMin: { bid: 8 } },
    '4D': { suitMin: { bid: 8 } },
    '4H': { suitMin: { bid: 8 } },
    '4S': { suitMin: { bid: 8 } }
  },
  zju: {
    '1C': { suitMin: { C: 3 }, suitMax: { H: 4, S: 4 } },
    '1D': { suitMin: { D: 3 }, suitMax: { H: 4, S: 4 } },
    '1H': { suitMin: { H: 5 } },
    '1S': { suitMin: { S: 5 } },
    '1N': { balanced: true },
    '2D': { suitMin: { H: 4, S: 4 } },
    '2H': { suitMin: { H: 6 } },
    '2S': { suitMin: { S: 6 } },
    '3C': { suitMin: { C: 6 } },
    '3D': { suitMin: { D: 6 } },
    '3H': { suitMin: { H: 6 } },
    '3S': { suitMin: { S: 6 } },
    '4C': { suitMin: { H: 7 } },
    '4D': { suitMin: { S: 7 } },
    '4H': { suitMin: { H: 8 } },
    '4S': { suitMin: { S: 8 } },
    '5C': { suitMin: { C: 9 } },
    '5D': { suitMin: { D: 9 } }
  },
  xinrui: {
    '1C': { suitMin: { C: 3 } },
    '1D': { suitMin: { D: 3 } },
    '1H': { suitMin: { H: 5 } },
    '1S': { suitMin: { S: 5 } },
    '1N': { balanced: true },
    '2N': { balanced: true }
  }
};

function openShapeOf(systemKey, bid) {
  const table = OPEN_SHAPE[systemKey];
  return (table && table[bid]) || null;
}

function keyOf(calls, seat, dealer = 'N') {
  return X.contextKey(auctionOf(calls, dealer), seat);
}

/** 把「同伴的应叫」展开成具体叫品：form 形态则枚举合法叫品 */
function expandCall(o, spec) {
  if (spec == null) return [];
  if (typeof spec === 'string') return [spec];
  if (Array.isArray(spec)) return spec.flatMap((x) => expandCall(o, x));
  if (typeof spec === 'object' && spec.type) {
    const a = auctionOf([o, 'P']);
    return a.legalCalls().filter((b) => b !== 'P' && R.bidFormMatches(toCoreForm(spec), b, a, 'S'));
  }
  return [];
}

function contextKeysOf(rule) {
  const t = rule.t;
  if (t === 'open') return [''];
  if (t === 'resp') {
    return arr(rule.o).map((o) => keyOf([o, 'P'], 'S'));
  }
  if (t === 'opener') {
    const out = [];
    for (const o of arr(rule.o)) {
      for (const r of expandCall(o, rule.r)) {
        // o 与 r 是「或」的集合，必须逐组合校验合法性：1D 开叫后不存在 1D 应叫
        try { out.push(keyOf([o, 'P', r], 'N')); } catch (e) { /* 跳过不存在的组合 */ }
      }
    }
    return out;
  }
  if (t === 'responder') {
    const out = [];
    for (const o of arr(rule.o)) {
      for (const r of arr(rule.r)) {
        for (const rb of arr(rule.rb)) out.push(keyOf([o, 'P', r, 'P', rb], 'S'));
      }
    }
    return out;
  }
  return [];
}

/* ---------------- 争叫类人工归位（审计 P0-6：8 条 X 撞在一起） ---------------- */
const DEF_OVERRIDE = {
  'sayc:157': { keys: ['O:*', 'O:* P:P'], note: '同伴已在平衡位 pass 后同样适用' },
  'sayc:158': { keys: ['O:*', 'O:* P:P'] },
  'sayc:159': { keys: ['O:*', 'O:* P:P'] },
  'sayc:160': { keys: ['O:*', 'O:* P:P'] },
  'sayc:216': { keys: ['O:*'] },
  'sayc:161': { keys: ['O:*'] },
  'sayc:162': { keys: ['O:*'] },
  'sayc:163': { keys: ['O:* M:* O:X P:P'], note: '同伴叫过牌、我争叫被惩罚性加倍后' },

  'zju:310': { keys: ['O:*'] },
  'zju:311': { keys: ['O:*'] },
  'zju:312': { keys: ['O:* P:P'] },
  'zju:313': { keys: ['O:*'] },
  'zju:314': { keys: ['O:*'], excludeKeys: ['O:1N'] },
  'zju:315': { keys: ['O:*'], excludeKeys: ['O:1N'] },
  'zju:316': { keys: ['O:*'] },
  'zju:317': { keys: ['O:*'] },
  'zju:318': { keys: ['O:*'], excludeKeys: ['O:1N'] },
  'zju:319': { keys: ['O:* M:* O:X P:P'] },
  'zju:320': { keys: ['O:1N'] },
  'zju:321': { keys: ['O:1N'] },
  'zju:322': { keys: ['O:1N'] },
  'zju:323': { keys: ['O:1N'] },
  /* 「2 阶阻击」按原文展开到具体的二阶花色叫牌；2NT 不是阻击，
     2♣ 在自然/精确体系里通常是强开叫或约定叫，都不纳入。
     原文讲的是「加倍之后用 Lebensohl」，加倍本身的含义已由 318「技术性加倍」覆盖，
     这里降级为语境说明，避免同一语境下两条同优先级的 X 规则互相冲突。 */
  'zju:324': {
    toNote: true,
    keys: ['O:2D', 'O:2H', 'O:2S'],
    why: '加倍本身的含义见「技术性加倍」，本条说明加倍后的 Lebensohl 后续'
  },
  'zju:325': { keys: ['O:* P:X'] },
  'zju:326': { keys: ['O:* P:X'] },
  'zju:327': { keys: ['P:* O:*'] },
  'zju:328': { keys: ['M:* O:* P:*'] },
  'zju:329': { keys: ['O:* P:X O:*'] },

  'xinrui:45': { keys: ['O:*'] },
  'xinrui:46': { keys: ['O:*'] },
  'xinrui:47': { split: [
    { keys: ['O:*'], p: '15~18', desc: '1NT 争叫（第二家）：15~18 点。' },
    { keys: ['O:* P:P'], p: '12~15', desc: '1NT 争叫（第四家 / 平衡位置）：12~15 点。' }
  ] },
  'xinrui:48': { keys: ['O:* P:P'] },
  'xinrui:49': { keys: ['O:*'] },
  'xinrui:50': { keys: ['O:*'] },
  'xinrui:51': { keys: ['O:1N'] },
  'xinrui:52': { keys: ['M:* P:*', 'M:* O:* P:*'], recommendable: false },

  /* 旧数据里的「汇总行」与重复描述：内容已被更精确的条目覆盖 */
  'zju:71': {
    desc: '4 阶原花：封局止叫；强牌时邀请应叫人高限进局。',
    tags: ['止叫', '邀局']
  },
  'zju:72': {
    drop: true,
    why: '与 71 同为 1C/1D—3C/3D 后的 4 阶原花；两条含义合并到 71'
  },
  /* 阻击开叫 / Namyats 后的「止叫」：应叫人没有自己的花色，
     旧数据用 gameOwn 表达「在同伴花色上进局」，这里改成两条明确叫品。 */
  'zju:283': {
    split: [
      { keys: ['P:3H'], bids: ['4H'], desc: '4♥ 止叫。' },
      { keys: ['P:3S'], bids: ['4S'], desc: '4♠ 止叫。' }
    ]
  },
  'zju:297': {
    split: [
      { keys: ['P:4C'], bids: ['4H'], desc: '4♥ 止叫（同伴 4♣ 示红心）。' },
      { keys: ['P:4D'], bids: ['4S'], desc: '4♠ 止叫（同伴 4♦ 示黑桃）。' }
    ]
  },
  'sayc:142': { drop: true, why: '与 134~138 重复；且 2C—2D 后不存在再叫 2D（叫品必须高于 2D）' },
  'zju:97': { drop: true, why: '与 101「再叫原花：好 6 张或 7 张套」重复' },
  'zju:80': { toNote: true, why: '与 81 二盖一在同一语境冲突；逆朱瑞只在「应叫人已 PASS 过」时成立，当前不跟踪 PASS 状态' },
  'zju:105': { toNote: true, why: '原文「跳叫 2NT」与 98「2NT 12~14 均型」在同一语境冲突；1NT 应叫后 2NT 不是跳叫，故降级为语境说明' },
  'zju:277': { toNote: true, why: '与 279 RKCB 4D 在同一语境（3♣—4♦）冲突，保留更常用且更明确的 RKCB' },
  'zju:109': { keys: ['M:1H P:2C', 'M:1H P:2D', 'M:1S P:2C', 'M:1S P:2D', 'M:1S P:2H'] },
  'zju:117': { keys: ['M:1H P:2H', 'M:1S P:2S'] },

  /* 「加叫应叫人花色」只在应叫人叫了另一门时成立；
     应叫人加叫的是开叫人的花色时，3 阶原花由 117「3 原花：止叫」负责 */
  'zju:113': { excludeKeys: ['M:1H P:2H', 'M:1S P:2S'], why: '与 117「3 原花：止叫」同叫品，按更具体的 117 处理' },

  /* 三阶示特征叫：3D 在 2D 开叫后是叫回原花，不算旁花；按开叫花色拆分 */
  'sayc:152': { split: [
    { keys: ['M:2D P:2N'], bids: ['3C', '3H', '3S'] },
    { keys: ['M:2H P:2N'], bids: ['3C', '3D', '3S'] },
    { keys: ['M:2S P:2N'], bids: ['3C', '3D', '3H'] }
  ] },
  'sayc:153': { split: [
    { keys: ['M:2D P:2N'], bids: ['3D'] },
    { keys: ['M:2H P:2N'], bids: ['3H'] },
    { keys: ['M:2S P:2N'], bids: ['3S'] }
  ] }
};

/* 语义不明确、宁可当语境说明也不当作叫品规则（审计：首攻指示加倍/高限争叫加倍） */
const TO_NOTES = {
  'zju:330': { keys: ['O:* M:* O:*'], label: '高限争叫加倍' },
  'zju:331': { split: [
    { keys: ['O:* M:* O:*'], label: '首攻指示加倍' },
    { keys: ['M:* O:* P:*'], label: '首攻指示加倍' }
  ] }
};

/* ---------------- 标签 → 逼叫属性 ---------------- */
const ALERT_TAGS = ['约定叫', '约定', '转移', '转移叫', '爆裂叫', '赌博', '扣叫'];
function forcingOf(tags) {
  if (tags.includes('进局')) return 'game';
  if (tags.includes('逼叫')) return 'one_round';
  return 'none';
}

/* ---------------- 主流程 ---------------- */
const systems = [];
const problems = [];
const dropped = [];

for (const leg of LEGACY) {
  const { rules, system } = loadLegacy(leg.file, leg.arr);
  const out = [];
  const seen = new Map();
  const notesExtra = [];

  rules.forEach((rule, idx) => {
    const id = `${leg.key}:${idx}`;
    if (TO_NOTES[id]) return;                       // 移到 notes
    const ov = DEF_OVERRIDE[id] || {};
    if (ov.drop) { dropped.push(`${id} 已删除：${ov.why}`); return; }
    if (ov.toNote) {
      const noteKeys = (ov.keys ? ov.keys.map(normalizeKey) : contextKeysOf(rule));
      notesExtra.push({
        id: `${leg.key}.note.legacy${idx}`,
        seatRole: X.roleOfKey(noteKeys[0] || ''),
        contextKeys: noteKeys,
        text: `${rule.d}（${ov.why}）`,
        source: rule.s,
        tags: rule.k || []
      });
      dropped.push(`${id} 转为语境说明：${ov.why}`);
      return;
    }

    let variants;
    if (ov.split) {
      variants = ov.split.map((v) => ({ ...ov, ...v, excludeKeys: v.excludeKeys || [] }));
    } else {
      let keys = ov.keys;
      if (!keys) {
        try {
          keys = contextKeysOf(rule);
        } catch (e) {
          problems.push(`${id} 语境生成失败（${e.message}）o=${JSON.stringify(rule.o)} r=${JSON.stringify(rule.r)} rb=${JSON.stringify(rule.rb)} b=${JSON.stringify(rule.b)}`);
          return;
        }
      }
      variants = [{ keys, excludeKeys: ov.excludeKeys || [], desc: ov.desc, tags: ov.tags }];
    }
    variants = variants.map((v) => ({
      ...v,
      keys: (v.keys || []).map(normalizeKey),
      excludeKeys: (v.excludeKeys || []).map(normalizeKey)
    }));

    const bidsAll = arr(rule.b);
    if (!bidsAll.length) { problems.push(`${id} 没有叫品`); return; }

    for (const v of variants) {
      if (!v.keys || !v.keys.length) { problems.push(`${id} 生成不出 contextKey：${JSON.stringify(rule.o)}`); continue; }
      const pText = v.p !== undefined ? v.p : rule.p;
      const parsed = parsePits(pText, rule);
      const bids = v.bids ? v.bids : bidsAll;

      for (const rawBid of bids) {
        const isForm = rawBid && typeof rawBid === 'object';
        const bid = isForm ? null : C.normalizeCall(rawBid);
        if (isForm) {
          // 形态没有 level 时保留；有 level 的一并保留
        } else if (!bid) {
          problems.push(`${id} 无法解析叫品 ${JSON.stringify(rawBid)}`);
          continue;
        }

        const tags = v.tags || rule.k || [];
        // 开叫的张数约束写在旧规则说明里，按 OPEN_SHAPE 补齐；
        // 其余叫品从说明文字里解析牌型要求（支持张数、套长、均型、否认高花等）。
        let shape = parsed.shape;
        if (rule.t === 'open') {
          if (!shape && bid) shape = openShapeOf(leg.key, bid);
        } else {
          shape = mergeShape(shape, shapeFromMeaning(v.desc || rule.d, bid));
        }
        const entry = {
          id: `${leg.key}.${idx}.${bid || 'form'}.${out.length}`,
          system: leg.key,
          seatRole: X.roleOfKey(v.keys[0]),
          contextKeys: v.keys,
          hcp: parsed.hcp,
          shape: shape,
          forcing: forcingOf(tags),
          alert: tags.some((t) => ALERT_TAGS.includes(t)),
          recommendable: !(ov.recommendable === false) &&
            !!(parsed.hcp || shape) && !parsed.needsReview,
          meaning: v.desc || rule.d,
          source: rule.s,
          tags: tags,
          legacyP: pText == null ? null : String(pText)
        };
        if (isForm) entry.bidForm = toCoreForm(rawBid);
        else entry.bid = bid;
        if (v.excludeKeys.length) entry.excludeKeys = v.excludeKeys;
        if (parsed.needsReview) entry.needsReview = true;

        for (const key of entry.contextKeys) {
          const dupKey = `${entry.seatRole}|${key}|${bid || JSON.stringify(rawBid)}`;
          if (seen.has(dupKey)) {
            problems.push(`重复：${entry.id} 与 ${seen.get(dupKey)} 在 ${key} 上同为 ${bid || JSON.stringify(rawBid)}`);
          } else {
            seen.set(dupKey, entry.id);
          }
        }
        out.push(entry);
      }
    }
  });

  // 体系级说明
  const notes = [];
  for (let i = 0; i < (system.notes || []).length; i++) {
    notes.push(migrateNote(system.notes[i], leg.key, i));
  }
  notes.push(...notesExtra);
  for (const [id, spec] of Object.entries(TO_NOTES)) {
    if (!id.startsWith(leg.key + ':')) continue;
    const r = rules[Number(id.split(':')[1])];
    const variants = spec.split || [spec];
    variants.forEach((v) => {
      notes.push({
        id: `${leg.key}.note.${notes.length}`,
        seatRole: X.roleOfKey(v.keys[0]),
        contextKeys: v.keys.map(normalizeKey),
        text: `${v.label}：${r.d}`,
        source: r.s,
        tags: r.k || []
      });
    });
  }

  const answers = {};
  for (const [ask, table] of Object.entries(system.answers || {})) {
    const askKey = ask === 'rkcb' ? 'blackwood' : ask;
    answers[askKey] = {};
    for (const [bid, rows] of Object.entries(table)) {
      answers[askKey][C.normalizeCall(bid)] = rows.map((x) => ({
        hcp: null, meaning: x.d, source: x.s, tags: x.k || []
      }));
    }
  }

  const convs = (system.convs || []).map((c, i) => ({
    id: `${leg.key}.conv.${i}`,
    title: c.s, ask: c.q, meaning: c.a,
    rows: c.rows || [], note: c.note || '',
    bid: inferConvBid(c)
  }));

  systems.push({
    key: leg.key,
    name: system.name,
    full: system.full,
    by: system.by,
    blurb: system.blurb,
    notes,
    conventions: convs,
    answers
  });

  if (WRITE) {
    fs.mkdirSync(path.join(ROOT, 'data/rules'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, `data/rules/${leg.key}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');
  }
  console.log(`${leg.key}: ${rules.length} 条旧规则 → ${out.length} 条新规则`);
}

function inferConvBid(c) {
  const q = String(c.q || '');
  if (/4\s*NT/i.test(q)) return '4N';
  if (/4\s*♣/.test(q)) return '4C';
  if (/5\s*NT/i.test(q)) return '5N';
  return null;
}

function migrateNote(n, sysKey, idx) {
  const keys = [];
  const oList = arr(n.o).length ? arr(n.o) : [null];
  let bids = null;

  if (n.t === 'open') keys.push('');
  else if (n.t === 'def') { keys.push('O:*', 'O:* P:P'); }
  else if (n.t === 'resp') {
    for (const o of oList) {
      if (o == null) keys.push('P:*');
      else if (n.cond && n.cond.contested) keys.push(`P:${o} O:*`);
      else keys.push(keyOf([o, 'P'], 'S'));
    }
    if (n.cond && n.cond.respBid) bids = n.cond.respBid.map((b) => C.normalizeCall(b));
  } else if (n.t === 'opener') {
    for (const o of oList) {
      if (o == null) { keys.push('M:* P:*', 'M:* O:* P:*'); continue; }
      const rs = n.r == null ? ['*'] : expandCall(o, n.r);
      for (const r of rs) keys.push(`M:${o} P:${r === '*' ? '*' : r}`);
    }
  } else if (n.t === 'responder') {
    const rs = arr(n.r);
    const rbs = arr(n.rb).length ? arr(n.rb) : ['*'];
    // 等长且都是具体叫品的 r/rb 按位配对（2D→2H、2H→2S），否则做笛卡尔积
    const literal = rs.length > 1 && rs.length === rbs.length &&
      rs.every((x) => typeof x === 'string') && rbs.every((x) => typeof x === 'string');
    const pairs = literal ? rs.map((r, i) => [r, rbs[i]]) : rs.flatMap((r) => rbs.map((rb) => [r, rb]));
    for (const o of oList) {
      for (const [r, rb] of pairs) {
        if (C.isBid(r) && C.isBid(rb) && C.bidValue(rb) <= C.bidValue(r)) continue;  // 叫品必须高于前一口
        keys.push(`P:${o} M:${r} P:${rb}`);
      }
    }
  }
  const entry = {
    id: `${sysKey}.note.${idx}`,
    seatRole: X.roleOfKey(keys[0] || ''),
    contextKeys: keys.map(normalizeKey),
    text: n.text,
    source: n.s
  };
  if (bids && bids.length) entry.bids = bids;
  return entry;
}

if (WRITE) {
  fs.writeFileSync(path.join(ROOT, 'data/systems.json'), JSON.stringify(systems, null, 2) + '\n', 'utf8');
}
console.log(`\n体系说明：${systems.map((s) => `${s.key} ${s.notes.length} 说明 / ${s.conventions.length} 约定`).join('，')}`);
if (problems.length) {
  console.log(`\n需要人工确认 ${problems.length} 处：`);
  problems.slice(0, 40).forEach((p) => console.log('  - ' + p));
}
if (dropped.length) {
  console.log('\n人工处理过的旧条目：');
  dropped.forEach((p) => console.log('  * ' + p));
}
if (!WRITE) console.log('\n（未写文件：仅统计。确需重放历史迁移请加 --write）');
