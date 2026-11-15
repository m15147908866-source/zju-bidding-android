/* ============================================================================
   core/rules.js — 规则索引与查询（纯函数）
   输入：一套体系的规则数组（来自 data/*.rules.json）
   输出：给定「叫牌过程 + 座位 + 叫品」时命中的规则 / 说明 / 约定答叫

   唯一性：同一 (seatRole, contextKey, bid) 只允许一条规则，由 validate-rules.mjs
   在 CI 里强制。因此查询结果天然不会出现「同一个 X 有 8 种含义」。
   ========================================================================== */
(function (root, factory) {
  'use strict';
  var isNode = (typeof module === 'object' && module.exports);
  var C = isNode ? require('./calls.js') : root.BridgeCore;
  var X = isNode ? require('./context.js') : root.BridgeCore;
  var api = factory(C, X);
  if (isNode) module.exports = api;
  else {
    root.BridgeCore = root.BridgeCore || {};
    Object.keys(api).forEach(function (k) { root.BridgeCore[k] = api[k]; });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C, X) {
  'use strict';

  /* ---------------- 叫品形态 ---------------- */

  function formContext(auction, seat) {
    var myStrain = null, mateStrain = null, seen = {}, oppStrains = {};
    auction.calls.forEach(function (c) {
      if (c.type !== 'bid') return;
      seen[c.strain] = true;
      var rel = X.relOf(c.seat, seat);
      if (rel === 'M' && !myStrain) myStrain = c.strain;
      if (rel === 'P') mateStrain = c.strain;
      if (rel === 'O') oppStrains[c.strain] = true;
    });
    return { myStrain: myStrain, mateStrain: mateStrain, seen: seen, oppStrains: oppStrains };
  }

  function minLevel(strain, auction) {
    var lb = auction.lastBid;
    return C.lowestLegalLevel(lb ? lb.raw : null, strain);
  }

  /**
   * 形态是否命中某个叫品。form 例：{type:'newSuit'} / {type:'jumpRaise'} / {type:'cue'}
   * 与旧实现的关键差别：cue 只在「该花色最低合法阶」命中（审计 P0-4）。
   */
  function bidFormMatches(form, bid, auction, seat) {
    if (!form || !form.type) return false;
    var lv = C.levelOf(bid), st = C.strainOf(bid);
    if (!st) return false;
    var fc = formContext(auction, seat);
    var minLv = minLevel(st, auction);

    if (form.level && lv !== form.level) return false;

    switch (form.type) {
      case 'newSuit':
        if (form.excludeJump && lv > minLv) return false;
        return !fc.seen[st] && st !== 'N';
      case 'jumpNewSuit':
        return !fc.seen[st] && st !== 'N' && lv > minLv;
      case 'raise':
        return !!fc.mateStrain && st === fc.mateStrain && (form.level ? true : lv === minLv);
      case 'jumpRaise':
        return !!fc.mateStrain && st === fc.mateStrain && lv === minLv + 1;
      case 'doubleRaise':
        return !!fc.mateStrain && st === fc.mateStrain && lv === minLv + 2;
      case 'tripleRaise':
        return !!fc.mateStrain && st === fc.mateStrain && lv === minLv + 3;
      case 'gameRaise':
        return !!fc.mateStrain && st === fc.mateStrain && lv === 4;
      case 'inviteRaise':
        return !!fc.mateStrain && st !== fc.mateStrain && st !== 'N' && lv === minLv + 1;
      case 'rebidOwn':
        return !!fc.myStrain && st === fc.myStrain && lv === minLv;
      case 'jumpRebidOwn':
        return !!fc.myStrain && st === fc.myStrain && lv === minLv + 1;
      case 'doubleJumpOwn':
        return !!fc.myStrain && st === fc.myStrain && lv === minLv + 2;
      case 'gameOwn':
        return !!fc.myStrain && st === fc.myStrain && lv === 4;
      case 'splinter':
        return !fc.seen[st] && st !== 'N' && st !== fc.mateStrain && st !== fc.myStrain && lv === minLv + 2;
      case 'exclusion':
        return !fc.seen[st] && st !== 'N' && st !== fc.mateStrain && st !== fc.myStrain && lv === minLv + 3;
      case 'reverse':
        // 逆叫只比较「自己的两套」：高于自己的首套；同伴叫过花色时也要高于它。
        // 同伴应叫 1NT 没有花色，不能拿 NT 的排序去卡死所有逆叫。
        return !fc.seen[st] && st !== 'N' && lv === 2 && !!fc.myStrain &&
          C.STRAIN_RANK[st] > C.STRAIN_RANK[fc.myStrain] &&
          (fc.mateStrain === 'N' || !fc.mateStrain || C.STRAIN_RANK[st] > C.STRAIN_RANK[fc.mateStrain]);
      case 'cue':
        return !!fc.oppStrains[st] && lv === minLv;
      case 'jumpSuit':
        return !fc.seen[st] && st !== 'N' && lv > minLv;
    }
    return false;
  }

  function ruleMatchesBid(rule, bid, auction, seat) {
    if (rule.bid) return rule.bid === bid;
    if (rule.bidForm) return bidFormMatches(rule.bidForm, bid, auction, seat);
    return false;
  }

  /* ---------------- 索引 ---------------- */

  /**
   * 同一语境内一个叫品只应有一个含义。具体叫品优先于形态；
   * 形态之间按「限定程度」排序（跳叫比普通叫更具体）。
   * 这是审计 P0-6（同一个 X 显示 8 种含义）的结构性修复。
   */
  var FORM_PRIORITY = {
    cue: 60, splinter: 55, exclusion: 55, reverse: 55,
    jumpNewSuit: 50, jumpRebidOwn: 50, doubleJumpOwn: 50, jumpRaise: 50,
    tripleRaise: 45, doubleRaise: 40, gameRaise: 40, gameOwn: 40,
    newSuit: 30, rebidOwn: 30, raise: 30, inviteRaise: 25, jumpSuit: 20
  };

  function specificity(rule) {
    if (rule.bid) return 1000;
    var p = FORM_PRIORITY[rule.bidForm.type] || 10;
    if (rule.bidForm.level) p += 5;
    return p;
  }

  function indexSystem(system) {
    var byRole = { opener: [], responder: [], overcaller: [], advancer: [] };
    (system.rules || []).forEach(function (r) {
      var bucket = byRole[r.seatRole] || (byRole[r.seatRole] = []);
      bucket.push(r);
    });
    return { system: system, byRole: byRole };
  }

  function contextHit(keys, key) {
    for (var i = 0; i < keys.length; i++) {
      if (X.keyMatches(keys[i], key)) return true;
    }
    return false;
  }

  /** excludeKeys：通配规则需要排除的特例（例如 1NT 开叫另有专章） */
  function excluded(rule, key) {
    var ex = rule.excludeKeys || [];
    for (var i = 0; i < ex.length; i++) {
      if (X.keyMatches(ex[i], key)) return true;
    }
    return false;
  }

  /** 命中该叫品的规则；同语境只返回最具体的一条 */
  function findRules(store, auction, seat, bid) {
    var key = X.contextKey(auction, seat);
    var role = X.roleOfKey(key);
    var bucket = (store.byRole[role] || []);
    var best = null, bestScore = -1, matched = 0;
    for (var i = 0; i < bucket.length; i++) {
      var r = bucket[i];
      if (!contextHit(r.contextKeys, key)) continue;
      if (excluded(r, key)) continue;
      if (!ruleMatchesBid(r, bid, auction, seat)) continue;
      matched++;
      var s = specificity(r);
      if (s > bestScore) { bestScore = s; best = r; }
    }
    return { key: key, role: role, rules: best ? [best] : [], matched: matched };
  }

  /** 命中当前语境的说明；bid 用于「只在选中某叫品时出现」的条目 */
  function findNotes(store, auction, seat, bid) {
    var key = X.contextKey(auction, seat);
    var role = X.roleOfKey(key);
    return (store.system.notes || []).filter(function (n) {
      if (n.seatRole && n.seatRole !== role) return false;
      if (!contextHit(n.contextKeys || [], key)) return false;
      if (excluded(n, key)) return false;
      if (n.bids && n.bids.length) return !!bid && n.bids.indexOf(bid) >= 0;
      if (n.bid) return n.bid === bid;
      return true;
    });
  }

  /** 约定问叫的答叫表 */
  function findAnswer(store, auction, seat, bid) {
    var askType = X.detectAsk(auction, seat);
    if (!askType) return null;
    var table = (store.system.answers || {})[askType];
    if (!table) return null;
    var rows = table[bid];
    if (!rows) return null;
    return { askType: askType, rows: rows };
  }

  /** 未收录该叫品时，约定叫兜底（黑木/盖伯的入口提示） */
  function findConventionFallback(store, auction, seat, bid) {
    var facts = X.facts(auction, seat);
    var opening = facts.opening;
    var ntOpening = !!opening && opening.strain === 'N' && opening.level <= 2;
    var convs = store.system.conventions || [];
    var find = function (q) {
      for (var i = 0; i < convs.length; i++) {
        if (convs[i].bid === q) return convs[i];
      }
      return null;
    };
    if (bid === '4N' && !ntOpening) return find('4N');
    if (bid === '4C' && ntOpening) return find('4C');
    if (bid === '5N') return find('5N');
    return null;
  }

  function createStore(system) {
    return indexSystem(system);
  }

  return {
    bidFormMatches: bidFormMatches,
    ruleMatchesBid: ruleMatchesBid,
    createStore: createStore,
    findRules: findRules,
    findNotes: findNotes,
    findAnswer: findAnswer,
    findConventionFallback: findConventionFallback
  };
});
