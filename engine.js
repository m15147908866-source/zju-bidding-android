/* ============================================================================
   engine.js — UI 适配层（唯一职责：把 core 纯函数接到 app.js 的旧接口上）

   分层：
     core/*.js        纯函数：叫品、叫牌过程、语境、规则匹配、推荐、手牌
     data/bridge-data.js  打包好的规则数据（window.BridgeData）
     engine.js        本文件：状态、存储、存档读档、旧编码适配、展示字段
     app.js           渲染与交互

   编码约定：
     内部（core / 数据文件）用 P / X / XX / 1C..7N；
     界面与存档继续用 PASS / X / XX / 1C..7NT。
     转换只发生在这一层，数据表与 UI 都不返工。
   ========================================================================== */
const BC = BridgeCore;

/* app.js 与旧引擎共用的选择器 */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

const C = BC;
const SEATS = C.SEATS;
const SEAT_CN = C.SEAT_CN;
const PTR = C.PTR;
const NEXT = C.NEXT;
const SUIT_SYM = C.SUIT_SYM;

/* ---------------- 叫品工具（对外仍是旧编码） ---------------- */
function isContract(b) { return !!C.isBid(b); }
function bidVal(b) { return C.bidValue(b); }
function bidLevel(b) { return C.levelOf(b); }
/** 返回 'C'|'D'|'H'|'S'|'NT' —— 旧 UI 用 'NT' 而不是 'N' */
function bidStrain(b) {
  const st = C.strainOf(b);
  return st === 'N' ? 'NT' : st;
}
function bidLabel(b) {
  const n = C.normalizeCall(b);
  if (!n) return String(b);
  if (n === 'P') return 'Pass';
  if (n === 'X') return '×';
  if (n === 'XX') return '××';
  const st = n[1];
  return n[0] + (st === 'N' ? 'NT' : SUIT_SYM[st]);
}
function bidHtml(b) {
  const n = C.normalizeCall(b);
  if (!n || !C.isBid(n)) return bidLabel(b);
  const st = n[1];
  const sym = st === 'N'
    ? '<span class="bl-nt">NT</span>'
    : '<span class="bl-su">' + SUIT_SYM[st] + '</span>';
  return '<span class="bl"><span class="bl-lv">' + n[0] + '</span>' + sym + '</span>';
}
function allBids() {
  const out = [];
  for (let lv = 1; lv <= 7; lv++) for (const st of C.STRAINS) out.push(lv + st);
  return out;
}

/* ---------------- 体系注册表 ---------------- */
const SYSTEMS = {};
let $sys = null;      // 当前体系元数据
let $store = null;    // 当前体系的索引 { system, byRole }
let CONVENTIONS = [];

function useSystem(key) {
  const sys = SYSTEMS[key] || SYSTEMS[Object.keys(SYSTEMS)[0]];
  if (!sys) return false;
  $sys = sys;
  $store = sys.store;
  CONVENTIONS = sys.convs;
  state.system = sys.key;
  return true;
}

/* 数据在 data/bridge-data.js 里一次性打包；这里只做索引，不做桥牌判断 */
(function initSystems() {
  const data = (typeof BridgeData !== 'undefined') ? BridgeData : null;
  if (!data) {
    console.error('缺少 data/bridge-data.js：请先运行 node scripts/build-data.mjs');
    return;
  }
  data.systems.forEach((sys) => {
    sys.convs = sys.conventions || [];
    sys.store = BC.createStore ? BC.createStore(sys) : null;
    SYSTEMS[sys.key] = sys;
  });
})();

/* ---------------- 状态 ---------------- */
let state = {
  boards: [],       // 只保留当前这一局
  sel: null,        // 待确认叫品
  hideIllegal: true,
  system: 'sayc',   // 当前体系
  inspect: null,    // 回看中的历史叫品序号
  mySeat: 'N',      // 我坐的座位
  tracker: [],      // 记牌器：已出的牌，如 ['SA','HK']
  ai: { url: '', key: '', model: '' },  // AI 接口配置
  aiHand: [],       // AI 页选的具体牌张，如 ['SA','HK']
  aiConv: null,     // AI 对话：{ key, sys, messages:[], ui:[] }
  hand: { hcp: 12, S: 4, H: 3, D: 3, C: 3 }
};

function newBoard(dealer) {
  return { dealer: dealer || 'N', auction: [], done: false, result: null, snap: [] };
}
function board() { return state.boards[0]; }

/* Android 壳提供 window.AndroidStore（SharedPreferences 桥接）；浏览器回落 localStorage */
const STORE = (function () {
  if (typeof window !== 'undefined' && window.AndroidStore) {
    return {
      get: function (k) { try { return window.AndroidStore.getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { window.AndroidStore.setItem(k, v); } catch (e) {} }
    };
  }
  return {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
})();

function save() {
  try {
    STORE.set('sayc_v3', JSON.stringify({
      board: state.boards[0] || null,
      hideIllegal: state.hideIllegal,
      system: state.system,
      mySeat: state.mySeat,
      tracker: state.tracker,
      ai: state.ai,
      aiHand: state.aiHand,
      aiConv: state.aiConv,
      hand: state.hand
    }));
  } catch (e) {}
}
function load() {
  try {
    const raw = STORE.get('sayc_v3');
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d.board) return false;
    state.boards = [d.board];
    state.hideIllegal = d.hideIllegal !== false;
    state.system = d.system || 'sayc';
    state.mySeat = SEATS.includes(d.mySeat) ? d.mySeat : (d.mySide === 'EW' ? 'E' : 'N');
    if (d.hand && typeof d.hand.hcp === 'number') state.hand = d.hand;
    if (Array.isArray(d.tracker)) state.tracker = d.tracker;
    if (d.ai && typeof d.ai === 'object') {
      state.ai = { url: d.ai.url || '', key: d.ai.key || '', model: d.ai.model || '' };
    }
    if (Array.isArray(d.aiHand)) state.aiHand = d.aiHand;
    if (d.aiConv && typeof d.aiConv === 'object') state.aiConv = d.aiConv;
    return true;
  } catch (e) { return false; }
}

/* ---------------- 叫牌过程 ---------------- */
/** 存档 → 核心 Auction。读存档用 lenient：历史数据不合法时不至于整页崩掉 */
function bdAuction(bd) {
  return BC.Auction.fromEntries((bd && bd.dealer) || 'N', (bd && bd.auction) || []);
}
function seatToAct(bd) { return bdAuction(bd).position; }
function legalSet(bd, seat) {
  return new Set(bdAuction(bd).legalCalls().map(C.toLegacy));
}
function checkOver(bd) { return bdAuction(bd).complete; }

/** 定约信息：庄家取「最终叫品阵营中最先叫出该花色的人」（Laws 2017 Definitions） */
function contractInfo(bd) {
  const ct = bdAuction(bd).contract;
  if (!ct) return { passed: true };
  return {
    bid: C.toLegacy(ct.bid),
    level: ct.level,
    strain: ct.strain,
    seat: ct.declarer,
    by: ct.declarer,
    doubled: ct.doubled,
    dbl: ct.doubled === 2 ? 'XX' : ct.doubled === 1 ? 'X' : '',
    passed: false
  };
}

/* ---------------- 规则展示字段（旧 UI 只认 s / p / d / k） ---------------- */

/** 点数文案：优先用迁移时保留的原文，其次由 hcp 区间生成 */
function ptsOf(rule) {
  if (rule.legacyP) return rule.legacyP;
  if (rule.hcp) {
    const lo = rule.hcp.min, hi = rule.hcp.max;
    if (lo === 0 && hi < 37) return hi + ' 以下';
    if (hi >= 37 && lo > 0) return lo + ' 以上';
    return lo + '~' + hi;
  }
  return null;
}

function viewRule(r) {
  return {
    id: r.id,
    s: r.source,
    p: ptsOf(r),
    pw: null,
    d: r.meaning,
    k: r.tags || [],
    hcp: r.hcp || null,
    shape: r.shape || null,
    bid: r.bid || null,
    form: r.bidForm ? r.bidForm.type : null,
    contextKeys: r.contextKeys || [],
    alert: r.alert === true,
    forcing: r.forcing || null,
    recommendable: r.recommendable !== false
  };
}

function viewAnswer(row) {
  return {
    s: row.source,
    p: row.hcp ? (row.hcp.min + '~' + row.hcp.max) : null,
    d: row.meaning,
    k: row.tags || [],
    answer: true
  };
}

/* ---------------- 查询 ---------------- */
function analyze(bd, seat) {
  return BC.analyze(bdAuction(bd), seat);
}

function lookupRules(bd, seat, bid) {
  const a = bdAuction(bd);
  const nb = C.normalizeCall(bid);
  const ctx = BC.analyze(a, seat);
  const out = { ctx: ctx, rules: [], notes: [], found: false };

  if (!nb || !$store) return out;

  const ans = BC.findAnswer($store, a, seat, nb);
  if (ans) {
    out.ctx = Object.assign({}, ctx, { type: 'answer', askType: ans.askType });
    out.rules = ans.rows.map(viewAnswer);
    out.found = out.rules.length > 0;
    return out;
  }

  const hit = BC.findRules($store, a, seat, nb);
  out.rules = hit.rules.map(viewRule);
  out.found = out.rules.length > 0;
  out.notes = BC.findNotes($store, a, seat, nb).map((n) => ({ s: n.source, text: n.text }));
  return out;
}

function conventionFallback(bd, seat, bid) {
  const nb = C.normalizeCall(bid);
  if (!nb || !$store) return null;
  const cv = BC.findConventionFallback($store, bdAuction(bd), seat, nb);
  if (!cv) return null;
  return { s: cv.title, q: cv.ask, a: cv.meaning, rows: cv.rows, note: cv.note, bid: cv.bid };
}

/** 选中叫品时的完整快照，便于回看历史叫品（存档里也会带） */
function snapshotFor(bd, seat, bid, legalAt) {
  const res = lookupRules(bd, seat, bid);
  const conv = res.found ? null : conventionFallback(bd, seat, bid);
  return {
    seat: seat, bid: bid, ctx: res.ctx, rules: res.rules,
    notes: res.notes, conv: conv, found: res.found, legalAt: legalAt || null
  };
}

/* ---------------- 推荐 ---------------- */
/**
 * 候选必须来自「当前语境 + 点力/牌型满足 + 可推荐」的规则；
 * 界面只负责显示，不再自己解析点数文案（旧版 P0-4 的根因就在界面里重复实现规则判断）。
 */
function recommendFor(bd, seat) {
  if (!$store) return [];
  const base = state.hand || { hcp: 0, S: 0, H: 0, D: 0, C: 0 };
  // AI 页选了具体牌张时，把牌张一并交给推荐器，用于无将挡张等判断
  const hand = Object.assign({}, base, {
    cards: Array.isArray(state.aiHand) && state.aiHand.length ? state.aiHand : base.cards
  });
  const res = BC.recommend($store, bdAuction(bd), seat, hand);
  return res.candidates.map((c) => ({
    bid: C.toLegacy(c.bid),
    score: c.score,
    matchedBy: c.matchedBy,
    pts: ptsOf(c.rule),
    why: c.rule.meaning,
    src: c.rule.source,
    tags: c.rule.tags || [],
    rule: viewRule(c.rule)
  }));
}

/* ---------------- 给 AI 的体系卡 ---------------- */
const ROLE_CN = { opener: '开叫方', responder: '应叫方', overcaller: '争叫方', advancer: '争叫方同伴' };

/** 语境键 → 人能读的文字：M:1S O:2H → 我方 1♠ / 对手 2♥ */
function contextText(key) {
  if (!key) return '开叫';
  return key.split(' ').map((t) => {
    const rel = t[0] === 'M' ? '我方 ' : t[0] === 'P' ? '同伴 ' : '对手 ';
    return rel + bidLabel(t.slice(2));
  }).join(' → ');
}

function ruleLine(r) {
  const bid = r.bid ? bidLabel(r.bid) : ('形态:' + (r.bidForm ? r.bidForm.type : '?'));
  const pts = ptsOf(r);
  return '[' + (ROLE_CN[r.seatRole] || r.seatRole) + '] ' +
    (r.contextKeys || []).map(contextText).join(' ／ ') +
    ' → ' + bid + (pts ? '（' + pts + '）' : '') + '：' + r.meaning;
}

function systemCard() {
  if (!$sys) return '';
  const lines = [];
  lines.push('体系：' + $sys.name + '（' + ($sys.full || '') + '）');
  if ($sys.blurb) lines.push($sys.blurb);
  ($sys.notes || []).forEach((n) => {
    lines.push('【说明】' + (n.contextKeys || []).map(contextText).join(' ／ ') + '：' + n.text);
  });
  ($sys.rules || []).forEach((r) => lines.push(ruleLine(r)));
  ($sys.conventions || []).forEach((c) => {
    lines.push('【约定叫】' + c.title + '：' + c.meaning + '；答叫 ' +
      (c.rows || []).map((x) => x[0] + '=' + x[1]).join('，') + (c.note ? '；' + c.note : ''));
  });
  return lines.join('\n');
}

/* ---------------- 初始化 ---------------- */
useSystem('sayc');
