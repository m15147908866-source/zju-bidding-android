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
   * shape: { balanced?:boolean, suitMin?:{H:5}, suitMax?:{S:3}, shortage?:'C'|'D'|'H'|'S' }
   * bidStrain: 用于「所叫花色」类约束（由迁移脚本展开为具体花色，通常不需要）
   */
  function fitsShape(shape, hand, bidStrain) {
    if (!shape) return null;               // 没有牌型约束 → 不确定（不是匹配）
    var sh = shapeOf(hand);
    var used = false;

    if (typeof shape.balanced === 'boolean') {
      used = true;
      if (shape.balanced && !sh.balanced) return false;
      if (!shape.balanced && sh.balanced) return false;
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
        var suit = s === 'bid' ? bidStrain : s;
        if (!suit || (hand[suit] || 0) < shape.suitMin[s]) return false;
      }
    }
    if (shape.suitMax) {
      used = true;
      for (var t in shape.suitMax) {
        if (!shape.suitMax.hasOwnProperty(t)) continue;
        var suit2 = t === 'bid' ? bidStrain : t;
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
