/* ============================================================================
   core/hand.js — 手牌统计与牌型约束（纯函数）
   输入两种形态：
     1) 逐张牌：['SA','HK','D7',...]
     2) 已汇总：{ hcp: 12, S: 4, H: 3, D: 3, C: 3 }
   ========================================================================== */
(function (root, factory) {
  'use strict';
  var isNode = (typeof module === 'object' && module.exports);
  var api = factory();
  if (isNode) module.exports = api;
  else {
    root.BridgeCore = root.BridgeCore || {};
    Object.keys(api).forEach(function (k) { root.BridgeCore[k] = api[k]; });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var HCP = { A: 4, K: 3, Q: 2, J: 1 };
  var SUITS = ['S', 'H', 'D', 'C'];

  /** ['SA','HK'] → { hcp, S, H, D, C, cards } */
  function fromCards(cards) {
    var st = { hcp: 0, S: 0, H: 0, D: 0, C: 0, cards: (cards || []).slice() };
    (cards || []).forEach(function (k) {
      var s = String(k).charAt(0).toUpperCase();
      var r = String(k).slice(1).toUpperCase();
      if (!st.hasOwnProperty(s)) return;
      st[s]++;
      st.hcp += HCP[r] || 0;
    });
    return st;
  }

  /**
   * 牌型分类：balanced 均型 = 4-3-3-3 / 4-4-3-2 / 5-3-3-2
   * 其余为 non-balanced；单缺 shortage 返回最长单缺花色（缺门优先）
   */
  function shapeOf(hand) {
    var counts = SUITS.map(function (s) { return hand[s] || 0; });
    var sorted = counts.slice().sort(function (a, b) { return b - a; });
    var total = counts.reduce(function (a, b) { return a + b; }, 0);
    var balanced = (sorted[0] === 5 && sorted[1] === 3 && sorted[2] === 3 && sorted[3] === 2) ||
                   (sorted[0] === 4 && sorted[1] === 4 && sorted[2] === 3 && sorted[3] === 2) ||
                   (sorted[0] === 4 && sorted[1] === 3 && sorted[2] === 3 && sorted[3] === 3);
    var shortage = null;
    for (var i = 0; i < SUITS.length; i++) {
      if (counts[i] <= 1 && (shortage === null || counts[i] < (hand[shortage] || 0))) shortage = SUITS[i];
    }
    return { sorted: sorted, balanced: balanced, shortage: shortage, total: total, text: sorted.join('-') };
  }

  function isComplete(hand) {
    return SUITS.every(function (s) { return typeof hand[s] === 'number'; }) &&
      (hand.S + hand.H + hand.D + hand.C) === 13;
  }

  /**
   * 手牌是否满足规则里的 shape 约束
   * shape: {
   *   balanced?:boolean, shortage?:'C'|'D'|'H'|'S'|'any',
   *   suitMin?:{H:5, bid:4, partner:3}, suitMax?:{S:3},
   *   major4?:boolean,      // 至少一门高花 4 张（斯台曼）
   *   anyMinorMin?:number   // 至少一门低花 N 张（2S 接力 / 拼搏 3NT）
   * }
   * bidStrain: 所叫花色；partnerStrain: 同伴最后叫出的花色
   */
  function fitsShape(shape, hand, bidStrain, partnerStrain) {
    if (!shape) return null;               // 没有牌型约束 → 不确定（不是匹配）
    var sh = shapeOf(hand);
    var used = false;
    var resolve = function (s) {
      if (s === 'bid') return bidStrain;
      if (s === 'partner') return partnerStrain;
      return s;
    };

    if (typeof shape.balanced === 'boolean') {
      used = true;
      if (shape.balanced && !sh.balanced) return false;
      if (!shape.balanced && sh.balanced) return false;
    }
    if (typeof shape.major4 === 'boolean') {
      used = true;
      var major4 = (hand.H || 0) >= 4 || (hand.S || 0) >= 4;
      if (shape.major4 !== major4) return false;
    }
    if (typeof shape.anyMinorMin === 'number') {
      used = true;
      if (Math.max(hand.C || 0, hand.D || 0) < shape.anyMinorMin) return false;
    }
    if (shape.shortage) {
      used = true;
      var target = shape.shortage === 'any' ? sh.shortage : shape.shortage;
      if (!sh.shortage || sh.shortage !== target) return false;
    }
    if (shape.suitMin) {
      used = true;
      for (var s in shape.suitMin) {
        if (!shape.suitMin.hasOwnProperty(s)) continue;
        var suit = resolve(s);
        if (!suit || (hand[suit] || 0) < shape.suitMin[s]) return false;
      }
    }
    if (shape.suitMax) {
      used = true;
      for (var t in shape.suitMax) {
        if (!shape.suitMax.hasOwnProperty(t)) continue;
        var suit2 = resolve(t);
        if (!suit2 || (hand[suit2] || 0) > shape.suitMax[t]) return false;
      }
    }
    return used ? true : null;
  }

  /** hcp 区间命中；规则缺 hcp 返回 null（表示不做限制） */
  function fitsHcp(hcp, handHcp) {
    if (!hcp || typeof hcp.min !== 'number') return null;
    var max = typeof hcp.max === 'number' ? hcp.max : 37;
    return handHcp >= hcp.min && handHcp <= max;
  }

  return {
    HCP: HCP, SUITS: SUITS,
    fromCards: fromCards, shapeOf: shapeOf, isComplete: isComplete,
    fitsShape: fitsShape, fitsHcp: fitsHcp
  };
});
