/* ============================================================================
   桥牌自然叫牌 · 叫牌引擎
   合法性规则 = 桥牌通用叫牌规则（叫品须高于当前叫品；加倍/再加倍视上家动作）
   叫品含义 = 严格取自 data.js（PDF 唯一依据），无匹配即如实标注「未收录」
   ========================================================================== */

const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

const PTR = { N: 'S', S: 'N', E: 'W', W: 'E' };
const NEXT = { N: 'E', E: 'S', S: 'W', W: 'N' };

/* ---------------- 叫品工具 ---------------- */
const ORDER_IDX = { C: 0, D: 1, H: 2, S: 3, NT: 4 };

function isContract(b) { return /^[1-7](C|D|H|S|NT)$/.test(b); }
function bidVal(b) {
  const m = /^([1-7])(C|D|H|S|NT)$/.exec(b);
  return m ? (+m[1] - 1) * 5 + ORDER_IDX[m[2]] + 1 : 0;
}
function bidStrain(b) { const m = /^[1-7](C|D|H|S|NT)$/.exec(b); return m ? m[1] : null; }
function bidLevel(b) { const m = /^([1-7])(C|D|H|S|NT)$/.exec(b); return m ? +m[1] : 0; }
function bidLabel(b) {
  if (b === 'PASS') return 'Pass';
  if (b === 'X') return '×';
  if (b === 'XX') return '××';
  const s = bidStrain(b);
  return b.replace(s, '') + (s === 'NT' ? 'NT' : ({ C: '♣', D: '♦', H: '♥', S: '♠' })[s]);
}
const SUIT_SYM = { C: '♣', D: '♦', H: '♥', S: '♠' };
function bidHtml(b) {
  if (!isContract(b)) return bidLabel(b);
  const s = bidStrain(b);
  const sym = s === 'NT'
    ? '<span class="bl-nt">NT</span>'
    : '<span class="bl-su">' + SUIT_SYM[s] + '</span>';
  return '<span class="bl"><span class="bl-lv">' + bidLevel(b) + '</span>' + sym + '</span>';
}
let ALL_BIDS = null;
function allBids() {
  if (!ALL_BIDS) {
    ALL_BIDS = [];
    for (let lv = 1; lv <= 7; lv++) for (const st of STRAINS) ALL_BIDS.push(lv + st);
  }
  return ALL_BIDS;
}

/* ---------------- 体系注册表 ---------------- */
/* 各数据文件把 { key, name, rules, notes, convs, ... } 注册进来，
   切换体系时只替换这三个指针，引擎逻辑不变。 */
const SYSTEMS = {};
let RULES = [];
let CTX_NOTES = [];
let CONVENTIONS = [];
let ANSWERS = {};

function registerSystem(sys) { SYSTEMS[sys.key] = sys; }
function useSystem(key) {
  const sys = SYSTEMS[key] || SYSTEMS[Object.keys(SYSTEMS)[0]];
  if (!sys) return false;
  RULES = sys.rules;
  CTX_NOTES = sys.notes;
  CONVENTIONS = sys.convs;
  ANSWERS = sys.answers || {};
  state.system = sys.key;
  return true;
}

/* ---------------- 状态 ---------------- */
let state = {
  boards: [],       // 只保留当前这一局
  cur: 0,
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

/* Android 壳提供 window.AndroidStore（SharedPreferences 桥接），
   file:// 下的 localStorage 不可靠，故优先用它；浏览器环境自动回落。 */
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
    state.cur = 0;
    state.hideIllegal = d.hideIllegal !== false;
    state.system = d.system || 'sayc';
    state.mySeat = ['N','E','S','W'].includes(d.mySeat) ? d.mySeat : (d.mySide === 'EW' ? 'E' : 'N');
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

/* ---------------- 轮次 ---------------- */
function seatToAct(bd) {
  const n = bd.auction.length;
  let s = bd.dealer;
  for (let i = 0; i < n; i++) s = NEXT[s];
  return s;
}

/* ---------------- 合法叫品 ---------------- */
function lastContractCall(bd) {
  for (let i = bd.auction.length - 1; i >= 0; i--) {
    const c = bd.auction[i];
    if (isContract(c.bid)) return c;
  }
  return null;
}
function lastActionCall(bd) {
  for (let i = bd.auction.length - 1; i >= 0; i--) {
    if (bd.auction[i].bid !== 'PASS') return bd.auction[i];
  }
  return null;
}

function legalSet(bd, seat) {
  const set = new Set(['PASS']);
  const lc = lastContractCall(bd);
  const min = lc ? bidVal(lc.bid) : 0;
  for (const b of allBids()) if (bidVal(b) > min) set.add(b);

  const la = lastActionCall(bd);
  if (la) {
    const byOpp = la.seat !== seat && la.seat !== PTR[seat];
    if (isContract(la.bid) && byOpp) set.add('X');
    if (la.bid === 'X' && byOpp) set.add('XX');
  }
  return set;
}

/* ---------------- 叫品形态判定 ---------------- */
function calledStrains(bd, upto) {
  const s = new Set();
  bd.auction.slice(0, upto).forEach(c => {
    const st = bidStrain(c.bid);
    if (st) s.add(st);
  });
  return s;
}
function prevCallOf(bd, seat, upto) {
  for (let i = upto - 1; i >= 0; i--) {
    if (bd.auction[i].seat === seat) return bd.auction[i];
  }
  return null;
}

function minLevelFor(st, bd, upto) {
  const lc = lastContractCall({ auction: bd.auction.slice(0, upto) });
  const need = lc ? bidVal(lc.bid) + 1 : 1;
  for (let L = 1; L <= 7; L++) if (bidVal(L + st) >= need) return L;
  return 7;
}

function formMatch(spec, bid, bd, seat, upto) {
  if (!spec || !spec.type) return false;
  if (!isContract(bid)) return false;
  const st = bidStrain(bid);
  const lv = bidLevel(bid);
  const seen = calledStrains(bd, upto);
  const prior = bd.auction.slice(0, upto);
  const oppStrains = new Set();
  prior.forEach(c => {
    const s2 = bidStrain(c.bid);
    if (s2 && c.seat !== seat && c.seat !== PTR[seat]) oppStrains.add(s2);
  });

  // 开叫花色、同伴花色、本花色的最低可用阶
  const openCall = prior.find(c => isContract(c.bid));
  const openSt = openCall ? bidStrain(openCall.bid) : null;
  let mateSt = null;
  prior.forEach(c => {
    const s2 = bidStrain(c.bid);
    if (s2 && c.seat === PTR[seat]) mateSt = s2;
  });
  const minLv = minLevelFor(st, bd, upto);

  if (spec.level && lv !== spec.level) return false;

  switch (spec.type) {
    case 'newSuit':
      return !seen.has(st) && st !== 'NT';

    case 'jumpNewSuit':
      return !seen.has(st) && st !== 'NT' && lv > minLv;

    /* 加叫类：以「同伴花色」为锚，按比最低可用阶高出几阶区分 */
    case 'raise':
      return st === mateSt && (spec.level ? true : lv === minLv);
    case 'jumpRaise':
      return st === mateSt && lv === minLv + 1;
    case 'doubleRaise':
      return st === mateSt && lv === minLv + 2;
    case 'tripleRaise':
      return st === mateSt && lv === minLv + 3;
    case 'gameRaise':
      return st === mateSt && lv === 4;
    case 'inviteRaise':
      return st !== mateSt && st !== openSt && st !== 'NT' && lv === minLv + 1;

    /* 再叫 / 跳再叫开叫花色 */
    case 'rebidOwn':
      return st === openSt && lv === minLv;
    case 'jumpRebidOwn':
      return st === openSt && lv === minLv + 1;
    case 'doubleJumpOwn':
      return st === openSt && lv === minLv + 2;
    case 'gameOwn':
      return st === openSt && lv === 4;

    /* 新花色的特殊跳法 */
    case 'splinter':
      return st !== mateSt && st !== openSt && st !== 'NT' && !seen.has(st) && lv === minLv + 2;
    case 'exclusion':
      return st !== mateSt && st !== openSt && st !== 'NT' && !seen.has(st) && lv === minLv + 3;
    case 'reverse':
      return !seen.has(st) && st !== 'NT' && lv === 2 &&
        openSt && ORDER_IDX[st] > ORDER_IDX[openSt] &&
        (!mateSt || ORDER_IDX[st] > ORDER_IDX[mateSt]);

    case 'cue':
      return oppStrains.has(st);

    case 'jumpSuit': {
      const lc = lastContractCall({ auction: prior });
      const need = lc ? bidVal(lc.bid) + 1 : 1;
      let base = 7;
      for (let L = 1; L <= 7; L++) if (bidVal(L + st) >= need) { base = L; break; }
      return lv > base;
    }
  }
  return false;
}

/* ---------------- 语境识别 ---------------- */
function analyze(bd, seat) {
  const calls = bd.auction.filter(c => c.bid !== 'PASS');
  if (!calls.length) return { type: 'open', contested: false };

  const openCall = calls[0];
  const opener = openCall.seat;
  const mate = PTR[opener];
  const onOpenSide = (seat === opener || seat === mate);

  // 是否有对手插叫
  const contested = calls.some(c => c.seat !== opener && c.seat !== mate);

  if (!onOpenSide) {
    return { type: 'def', openSeat: opener, open: openCall.bid, contested: true, oppOpen: openCall.bid };
  }
  if (seat === opener) {
    const respCall = calls.find(c => c.seat === mate);
    return { type: 'opener', open: openCall.bid, resp: respCall ? respCall.bid : null, contested };
  }
  const myCalls = calls.filter(c => c.seat === seat);
  if (!myCalls.length) return { type: 'resp', open: openCall.bid, contested };
  const openerRebids = calls.filter(c => c.seat === opener).slice(1).map(c => c.bid);
  return { type: 'responder', open: openCall.bid, resp: myCalls[0].bid, rb: openerRebids, contested };
}

/* ---------------- 约定问叫的答叫识别 ---------------- */
function lastContractBefore(bd, idx) {
  for (let i = idx - 1; i >= 0; i--) if (isContract(bd.auction[i].bid)) return bd.auction[i];
  return null;
}

function detectAsk(bd, seat) {
  const la = lastActionCall(bd);
  if (!la || la.seat !== PTR[seat]) return null;      // 必须是同伴发出的问叫
  const idx = bd.auction.lastIndexOf(la);
  const ctx = analyze(bd, seat);
  const ntOpening = ['1NT', '2NT', '3NT'].includes(ctx.open);

  if (la.bid === '4NT') {
    // 定量邀叫：无将开叫之后，或紧接在一个无将叫品之后
    const before = lastContractBefore(bd, idx);
    if (ntOpening) return null;
    if (before && bidStrain(before.bid) === 'NT') return null;
    return 'blackwood';
  }
  if (la.bid === '4C') {
    // 盖伯：无将开叫后应叫方的 4♣
    if (ntOpening) return 'gerber';
    return null;
  }
  if (la.bid === '5NT') {
    const hasBW = bd.auction.some(c => c.bid === '4NT');
    return hasBW ? 'blackwoodK' : null;
  }
  if (la.bid === '5C') {
    const hasGB = bd.auction.some(c => c.bid === '4C');
    return hasGB ? 'gerberK' : null;
  }
  return null;
}

/* ---------------- 规则匹配 ---------------- */
function specMatch(spec, val, bd, seat, upto) {
  if (spec == null) return true;
  if (typeof spec === 'string') return spec === val;
  if (Array.isArray(spec)) return spec.includes(val);
  if (typeof spec === 'object' && spec.type) return formMatch(spec, val, bd, seat, upto);
  return false;
}

function lookupRules(bd, seat, bid) {
  const ctx = analyze(bd, seat);
  const upto = bd.auction.length;
  const isContractBidNow = isContract(bid);

  // 约定问叫的答叫优先：如 4NT 黑木之后叫 5♣ 是报 A，而不是自然叫
  const ask = detectAsk(bd, seat);
  if (ask && ANSWERS[ask] && ANSWERS[ask][bid]) {
    return {
      ctx: { type: 'answer', askType: ask, open: ctx.open, contested: ctx.contested },
      rules: ANSWERS[ask][bid],
      notes: [], found: true
    };
  }

  const hits = RULES.filter(r => {
    if (r.t !== ctx.type) return false;
    if (ctx.type === 'open') { /* no extra cond */ }
    if (ctx.type === 'resp') {
      if (r.o != null && !specMatch(r.o, ctx.open, bd, seat, upto)) return false;
    }
    if (ctx.type === 'opener') {
      if (r.o != null && !specMatch(r.o, ctx.open, bd, seat, upto)) return false;
      if (r.r != null && !specMatch(r.r, ctx.resp, bd, seat, upto)) return false;
    }
    if (ctx.type === 'responder') {
      if (r.o != null && !specMatch(r.o, ctx.open, bd, seat, upto)) return false;
      if (r.r != null && !specMatch(r.r, ctx.resp, bd, seat, upto)) return false;
      if (r.rb != null) {
        const ok = Array.isArray(r.rb)
          ? ctx.rb.some(x => r.rb.includes(x))
          : ctx.rb.includes(r.rb);
        if (!ok) return false;
      }
    }
    if (ctx.type === 'def') {
      if (r.o != null && !specMatch(r.o, ctx.oppOpen, bd, seat, upto)) return false;
    }
    // 叫品匹配
    if (typeof r.b === 'object' && !Array.isArray(r.b) && r.b && r.b.type) {
      return isContractBidNow && formMatch(r.b, bid, bd, seat, upto);
    }
    return specMatch(r.b, bid, bd, seat, upto);
  });

  // 语境附加说明
  const respBidNow = ctx.type === 'resp' ? bid : ctx.resp;
  const notes = CTX_NOTES.filter(n => {
    if (n.t !== ctx.type) return false;
    if (n.o != null && !specMatch(n.o, ctx.open, bd, seat, upto)) return false;
    // 开叫方语境下，r 用来限定「同伴应叫的是什么」
    if (n.r === '__newSuit__') {
      const seen = calledStrains(bd, upto);
      const st = bidStrain(ctx.resp || '');
      if (!st || seen.has(st) || st === 'NT') return false;
      return true;
    }
    if (n.r != null) {
      if (!specMatch(n.r, ctx.resp, bd, seat, upto)) return false;
    }
    // 应叫语境下，cond.respBid 用来限定「应叫方叫的是什么」
    if (n.cond && n.cond.respBid) {
      if (!respBidNow || !n.cond.respBid.includes(respBidNow)) return false;
    }
    // cond.contested：仅在敌方插叫后出现
    if (n.cond && n.cond.contested && !ctx.contested) return false;
    // 说明若限定了叫品，仅在叫该叫品时出现
    if (n.b != null && !specMatch(n.b, bid, bd, seat, upto)) return false;
    return true;
  });

  return { ctx, rules: hits, notes, found: hits.length > 0 };
}

/* ---------------- 约定叫兜底（4NT / 4C / 5NT） ---------------- */
function conventionFallback(bd, seat, bid) {
  const ctx = analyze(bd, seat);
  const openingNT = ['1NT', '2NT', '3NT'].includes(ctx.open);
  const find = q => CONVENTIONS.find(c => (c.q || '').indexOf(q) === 0) || null;
  if (bid === '4NT' && !openingNT) return find('4NT');   // 黑木：有将定约问 A
  if (bid === '4C' && openingNT) return find('4♣');      // 盖伯：无将定约问 A
  if (bid === '5NT') return find('5NT');                 // 大满贯逼叫
  return null;
}

/* ---------------- 局结束 ---------------- */
function checkOver(bd) {
  const a = bd.auction;
  if (a.length < 4) return false;
  const hasBid = a.some(c => isContract(c.bid));
  if (!hasBid) return a.length >= 4 && a.slice(-4).every(c => c.bid === 'PASS');
  const n = a.length;
  return a[n - 1].bid === 'PASS' && a[n - 2].bid === 'PASS' && a[n - 3].bid === 'PASS';
}

function contractInfo(bd) {
  const a = bd.auction;
  let ci = -1;
  for (let i = a.length - 1; i >= 0; i--) if (isContract(a[i].bid)) { ci = i; break; }
  if (ci < 0) return { passed: true };
  const call = a[ci];
  let dbl = '';
  if (ci + 1 < a.length && a[ci + 1].bid === 'X') dbl = 'X';
  if (ci + 2 < a.length && a[ci + 2].bid === 'XX') dbl = 'XX';
  const openerSide = [call.seat, PTR[call.seat]];
  const declarerSide = openerSide.includes(a.find(c => isContract(c.bid)).seat) ? '开叫方' : '';
  return { bid: call.bid, seat: call.seat, dbl, passed: false, by: call.seat };
}

/* ---------------- 记录快照 ---------------- */
function snapshotFor(bd, seat, bid) {
  const res = lookupRules(bd, seat, bid);
  const conv = res.found ? null : conventionFallback(bd, seat, bid);
  return {
    seat, bid,
    ctx: res.ctx,
    rules: res.rules.map(r => ({ s: r.s, p: r.p, pw: r.pw, d: r.d, k: r.k })),
    notes: res.notes.map(n => ({ s: n.s, text: n.text })),
    conv: conv ? conv.s : null,
    found: res.found,
    legalAt: bd.auction.length
  };
}
