/* ============================================================================
   core/context.js — 结构化语境（contextKey）与约定问叫识别（纯函数）

   contextKey 的构造
     把叫牌记录按「相对于当前叫牌人」的身份重写：
       M = 我 / P = 同伴 / O = 对手
     去掉首叫之前的 Pass（不改变语义），其余逐个保留，用空格连接。
     例：对手开 1♠、同伴加倍、轮到我 → "O:1S P:X"
     例：同伴开 1♣、上家争 2♥、轮到我 → "P:1C O:2H"

   为什么不用一个 contested 布尔
     布尔无法区分「对手叫了什么」，1S-(2H)-3H 会被当成强跳新花（见审计 P0-5）。
     字符串 key 可以精确匹配，也能在数据校验时机器检查唯一性。
   ========================================================================== */
(function (root, factory) {
  'use strict';
  var isNode = (typeof module === 'object' && module.exports);
  var C = isNode ? require('./calls.js') : root.BridgeCore;
  var api = factory(C, isNode ? require('./auction.js') : root.BridgeCore);
  if (isNode) module.exports = api;
  else {
    root.BridgeCore = root.BridgeCore || {};
    Object.keys(api).forEach(function (k) { root.BridgeCore[k] = api[k]; });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C, A) {
  'use strict';

  var PTR = C.PTR;

  function relOf(callSeat, mySeat) {
    if (callSeat === mySeat) return 'M';
    if (callSeat === PTR[mySeat]) return 'P';
    return 'O';
  }

  /** 生成 relative token 序列（含 Pass） */
  function tokenList(auction, seat) {
    return auction.calls.map(function (c) {
      return relOf(c.seat, seat) + ':' + c.raw;
    });
  }

  function isPassToken(t) { return /^[MOP]:P$/.test(t); }

  /**
   * 结构化语境键；空串表示「无人叫牌，轮到我开叫」
   * 规范化：去掉对家的 Pass（不含信息），去掉首叫之前的 Pass。
   * 同伴的 Pass 保留 —— 它表示「同伴没有开叫/没有应叫」，平衡位与普通防守位不同。
   */
  function contextKey(auction, seat) {
    var toks = tokenList(auction, seat);
    var out = [];
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t === 'O:P') continue;
      if (!out.length && isPassToken(t)) continue;
      out.push(t);
    }
    return out.join(' ');
  }

  /** 由 key 反推角色：opener / responder / overcaller / advancer */
  function roleOfKey(key) {
    if (!key) return 'opener';
    var toks = key.split(' ');
    var first = toks[0].slice(0, 1);
    if (first === 'M') return 'opener';
    if (first === 'P') return 'responder';
    var partnerBid = toks.some(function (t) {
      return t.charAt(0) === 'P' && t.slice(2) !== 'P';
    });
    return partnerBid ? 'advancer' : 'overcaller';
  }

  /** 带通配符的 key 匹配：'*' 代表任意一个叫品 */
  function keyMatches(pattern, key) {
    if (pattern === key) return true;
    var p = pattern ? pattern.split(' ') : [];
    var k = key ? key.split(' ') : [];
    if (p.length !== k.length) return false;
    for (var i = 0; i < p.length; i++) {
      if (p[i] === '*') continue;
      var pc = p[i].split(':');
      var kc = k[i].split(':');
      if (pc[0] !== kc[0]) return false;
      if (pc[1] !== '*' && pc[1] !== kc[1]) return false;
    }
    return true;
  }

  /** 叫牌过程中的关键事实 */
  function facts(auction, seat) {
    var key = contextKey(auction, seat);
    var myCalls = [], partnerCalls = [], oppCalls = [];
    auction.calls.forEach(function (c) {
      var rel = relOf(c.seat, seat);
      if (rel === 'M') myCalls.push(c);
      else if (rel === 'P') partnerCalls.push(c);
      else oppCalls.push(c);
    });
    var bids = auction.calls.filter(function (c) { return c.type === 'bid'; });
    var opening = bids.length ? bids[0] : null;
    return {
      key: key,
      tokens: key ? key.split(' ') : [],
      role: roleOfKey(key),
      opening: opening,
      openingByUs: opening ? C.sideOf(opening.seat) === C.sideOf(seat) : null,
      interference: oppCalls.filter(function (c) { return c.type !== 'pass'; }),
      partnerCalls: partnerCalls,
      myCalls: myCalls,
      oppCalls: oppCalls,
      contested: oppCalls.some(function (c) { return c.type !== 'pass'; }),
      completed: auction.complete
    };
  }

  /** 兼容旧 UI 的语境对象（app.js 的 CTX_CN 直接读 type） */
  function analyze(auction, seat) {
    var f = facts(auction, seat);
    var ctx = {
      type: 'open', key: f.key, role: f.role, contested: f.contested,
      open: null, resp: null, rb: [], oppOpen: null
    };

    if (!f.opening) return ctx;

    var partnerBid = f.partnerCalls.filter(function (c) { return c.type === 'bid'; })[0] || null;
    var myBid = f.myCalls.filter(function (c) { return c.type === 'bid'; })[0] || null;

    if (f.role === 'overcaller' || f.role === 'advancer') {
      ctx.type = 'def';
      ctx.oppOpen = f.opening.raw;
      ctx.open = f.opening.raw;
      return ctx;
    }
    if (f.role === 'opener') {
      if (!myBid) { ctx.type = 'open'; return ctx; }
      ctx.type = 'opener';
      ctx.open = myBid.raw;
      ctx.resp = partnerBid ? partnerBid.raw : null;
      ctx.rb = f.myCalls.filter(function (c) { return c.type === 'bid'; }).slice(1)
        .map(function (c) { return c.raw; });
      return ctx;
    }
    // responder
    ctx.type = myBid ? 'responder' : 'resp';
    ctx.open = partnerBid ? partnerBid.raw : f.opening.raw;
    ctx.resp = myBid ? myBid.raw : null;
    return ctx;
  }

  /** 同伴刚发出的是不是约定问叫 */
  function detectAsk(auction, seat) {
    var calls = auction.calls;
    if (!calls.length) return null;

    // 「轮到我」时最后一口通常是对手的 Pass，所以要看同伴最近的一个叫品。
    // 旧实现只检查最后一口，永远拿不到同伴的叫品，答叫表从未生效。
    var last = null;
    for (var i = calls.length - 1; i >= 0; i--) {
      if (relOf(calls[i].seat, seat) === 'P') { last = calls[i]; break; }
    }
    if (!last || last.type !== 'bid') return null;

    // 问叫之后只允许对手 Pass；一旦有人争叫或加倍，就不再套用简单答叫表
    for (var j = last.index + 1; j < calls.length; j++) {
      if (calls[j].type !== 'pass') return null;
    }

    var bids = calls.filter(function (c) { return c.type === 'bid'; });
    var opening = bids[0];
    var ntOpening = !!opening && opening.strain === 'N' && opening.level <= 2;

    if (last.raw === '4N') {
      if (ntOpening) return null;                      // 1NT/2NT 后的 4NT 是定量邀叫
      var preceding = null;
      for (var k = last.index - 1; k >= 0; k--) {
        if (calls[k].type === 'bid') { preceding = calls[k]; break; }
      }
      if (preceding && preceding.strain === 'N') return null; // 无将叫品之后的 4NT 也是定量
      return 'blackwood';
    }
    if (last.raw === '4C') return ntOpening ? 'gerber' : null;
    if (last.raw === '5N') {
      var has4N = calls.some(function (c) {
        return c.raw === '4N' && relOf(c.seat, seat) === 'P';
      });
      return has4N ? 'blackwoodK' : null;
    }
    if (last.raw === '5C') {
      var has4C = calls.some(function (c) {
        return c.raw === '4C' && relOf(c.seat, seat) === 'P';
      });
      return has4C && ntOpening ? 'gerberK' : null;
    }
    return null;
  }

  /** 判断某个叫品在当前序列里是不是「扣叫」（叫对方叫过的花色） */
  function isCueBid(auction, seat, bid) {
    var st = C.strainOf(bid);
    if (!st || st === 'N') return false;
    return auction.calls.some(function (c) {
      return c.type === 'bid' && c.strain === st && relOf(c.seat, seat) === 'O';
    });
  }

  return {
    relOf: relOf, tokenList: tokenList, contextKey: contextKey,
    roleOfKey: roleOfKey, keyMatches: keyMatches, facts: facts,
    analyze: analyze, detectAsk: detectAsk, isCueBid: isCueBid
  };
});
