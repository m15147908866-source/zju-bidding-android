/* ============================================================================
   core/recommend.js — 叫品推荐（纯函数）
   硬约束：推荐必须来自「当前 contextKey 命中的、可推荐的、点数/牌型都满足」的规则。
   没有约束信息的规则（hcp 与 shape 皆空）一律不参与推荐 —— 这类规则只用于
   教学解释（审计 P0-4：0 点推荐 2S~7S、6 点推荐黑木，都是缺约束导致的）。
   ========================================================================== */
(function (root, factory) {
  'use strict';
  var isNode = (typeof module === 'object' && module.exports);
  var C = isNode ? require('./calls.js') : root.BridgeCore;
  var H = isNode ? require('./hand.js') : root.BridgeCore;
  var R = isNode ? require('./rules.js') : root.BridgeCore;
  var X = isNode ? require('./context.js') : root.BridgeCore;
  var api = factory(C, H, R, X);
  if (isNode) module.exports = api;
  else {
    root.BridgeCore = root.BridgeCore || {};
    Object.keys(api).forEach(function (k) { root.BridgeCore[k] = api[k]; });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C, H, R, X) {
  'use strict';

  function hasConstraint(rule) {
    return !!(rule.hcp && typeof rule.hcp.min === 'number') ||
      !!(rule.shape && Object.keys(rule.shape).length);
  }

  /**
   * @returns {{candidates:Array, key:string, role:string, total:number}}
   *   candidates: [{ bid, rule, score, matchedBy:['hcp','shape'], text, source }]
   */
  function recommend(store, auction, seat, hand) {
    var key = X.contextKey(auction, seat);
    var role = X.roleOfKey(key);
    // 没有手牌（未录入或未选完 13 张）时只解释、不推荐
    if (!hand || typeof hand.hcp !== 'number') {
      return { candidates: [], key: key, role: role, total: 0 };
    }
    var legal = auction.legalCalls();
    var best = {};

    legal.forEach(function (bid) {
      var rules = R.findRules(store, auction, seat, bid).rules;
      rules.forEach(function (rule) {
        if (rule.recommendable === false) return;
        if (!hasConstraint(rule)) return;

        var strain = C.strainOf(bid);
        var hcpHit = H.fitsHcp(rule.hcp, hand.hcp);
        if (hcpHit === false) return;
        var shapeHit = H.fitsShape(rule.shape, hand, strain);
        if (shapeHit === false) return;

        var matchedBy = [];
        if (hcpHit) matchedBy.push('hcp');
        if (shapeHit) matchedBy.push('shape');

        var score = 100;
        if (rule.hcp && typeof rule.hcp.max === 'number') {
          score += Math.max(0, 12 - (rule.hcp.max - rule.hcp.min));
        }
        if (shapeHit) score += 6;
        if (rule.priority) score += rule.priority * 10;
        score -= C.bidValue(bid) * 0.1;   // 同等条件下偏好低叫品

        var prev = best[bid];
        if (prev && prev.score >= score) return;
        best[bid] = {
          bid: bid, rule: rule, score: score, matchedBy: matchedBy,
          text: rule.meaning, source: rule.source
        };
      });
    });

    var candidates = Object.keys(best).map(function (b) { return best[b]; })
      .sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return C.bidValue(a.bid) - C.bidValue(b.bid);
      });

    return { candidates: candidates, key: key, role: role, total: candidates.length };
  }

  return { recommend: recommend, hasConstraint: hasConstraint };
});
