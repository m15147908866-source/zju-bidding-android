/* ============================================================================
   core/recommend.js — 叫品推荐（纯函数 + 基本桥牌判断）
   硬约束：推荐必须来自「当前 contextKey 命中的、可推荐的、点数/牌型都满足」的规则。
   没有约束信息的规则（hcp 与 shape 皆空）一律不参与推荐 —— 这类规则只用于
   教学解释（审计 P0-4：0 点推荐 2S~7S、6 点推荐黑木，都是缺约束导致的）。

   在规则命中之后再加一层「判断」排序，避免规则都成立时给出违反桥牌常识的首选：
     - 开叫：2C > 2N > 1N > 1M > 1m > 阻击；有 5 张高花时不优先 1N
     - 应叫：先支持同伴高花，再找 4 张高花，最后无将；2/1 要 5 张
     - 再叫：低限均型不叫；同伴逼叫时不能 PASS
     - 竞争：争叫 5 张；技术性加倍看短门与未叫高花；无将要挡张
   ========================================================================== */
(function (root, factory) {
  'use strict';
  var isNode = (typeof module === 'object' && module.exports);
  var C = isNode ? require('./calls.js') : root.BridgeCore;
  var H = isNode ? require('./hand.js') : root.BridgeCore;
  var R = isNode ? require('./rules.js') : root.BridgeCore;
  var X = isNode ? require('./context.js') : root.BridgeCore;
  var A = isNode ? require('./auction.js') : root.BridgeCore;
  var api = factory(C, H, R, X, A);
  if (isNode) module.exports = api;
  else {
    root.BridgeCore = root.BridgeCore || {};
    Object.keys(api).forEach(function (k) { root.BridgeCore[k] = api[k]; });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C, H, R, X, A) {
  'use strict';

  var Auction = A.Auction || A;

  function hasConstraint(rule) {
    return !!(rule.hcp && typeof rule.hcp.min === 'number') ||
      !!(rule.shape && Object.keys(rule.shape).length);
  }

  function isSuit(s) { return s === 'S' || s === 'H' || s === 'D' || s === 'C'; }

  /** 同伴最后叫出的真实花色（用于支持张数、将牌配合） */
  function partnerSuitOf(auction, seat) {
    for (var i = auction.calls.length - 1; i >= 0; i--) {
      var c = auction.calls[i];
      if (c.type !== 'bid' || c.seat === seat) continue;
      if (C.sideOf(c.seat) !== C.sideOf(seat)) continue;
      if (isSuit(c.strain)) return c.strain;
    }
    return null;
  }

  /** 同伴叫过的所有花色（逆叫后再支持第一门花色仍算配合） */
  function partnerSuitsOf(auction, seat) {
    var out = {};
    auction.calls.forEach(function (c) {
      if (c.type !== 'bid' || c.seat === seat) return;
      if (C.sideOf(c.seat) !== C.sideOf(seat)) return;
      if (isSuit(c.strain)) out[c.strain] = true;
    });
    return out;
  }

  /** 对方叫过的所有花色（无将叫品需要挡张） */
  function oppSuitsOf(auction, seat) {
    var out = {};
    auction.calls.forEach(function (c) {
      if (c.type !== 'bid' || c.seat === seat) return;
      if (C.sideOf(c.seat) === C.sideOf(seat)) return;
      if (isSuit(c.strain)) out[c.strain] = true;
    });
    return out;
  }

  /** 同伴最后一手（含 PASS） */
  function lastPartnerCall(auction, seat) {
    for (var i = auction.calls.length - 1; i >= 0; i--) {
      var c = auction.calls[i];
      if (c.seat !== seat && C.sideOf(c.seat) === C.sideOf(seat)) return { call: c, index: i };
    }
    return null;
  }

  /** 已经叫到局（3NT/4♥/4♠/5♣/5♦）时，同伴可以 pass */
  function isGameCall(call) {
    if (call.raw === '3N') return true;
    if (call.level === 4 && (call.strain === 'H' || call.strain === 'S')) return true;
    if (call.level === 5 && (call.strain === 'C' || call.strain === 'D')) return true;
    return false;
  }

  /** 我方是否处于进局逼叫：2♣ 强开叫、2/1 应叫或杰克贝 2NT */
  function partnershipGF(auction, seat) {
    var side = C.sideOf(seat);
    var bids = auction.calls.filter(function (c) {
      return c.type === 'bid' && C.sideOf(c.seat) === side;
    });
    if (!bids.length) return false;
    if (bids[0].raw === '2C') return true;
    if (bids.length >= 2) {
      var open = bids[0], resp = bids[1];
      if (open.level === 1 && open.strain !== 'N') {
        if (resp.raw === '2N') return true;
        if (resp.level === 2 && isSuit(resp.strain) && resp.strain !== open.strain) return true;
      }
    }
    return false;
  }

  /** 同伴最后一手是否逼叫（含转移叫等约定叫） */
  function partnerForcing(store, auction, seat) {
    var last = lastPartnerCall(auction, seat);
    if (!last || last.call.type === 'pass') return false;
    // 已经叫到局，允许 pass；4NT 定量/问叫不在此列
    if (isGameCall(last.call)) return false;
    // 2/1 逼局、2♣ 强开叫、Jacoby 2NT：伙伴任何再叫都逼叫
    if (partnershipGF(auction, seat)) return true;
    // 必须取「同伴叫出这一口之前」的序列：否则 contextKey 会把同伴自己的叫品算进去
    var sub = Auction.fromCalls(
      auction.dealer,
      auction.calls.slice(0, last.index).map(function (c) { return c.raw; })
    );
    var rule = R.findRules(store, sub, last.call.seat, last.call.raw).rules[0];
    if (!rule) return false;
    if (rule.forcing && rule.forcing !== 'none') return true;
    return !!(rule.tags || []).some(function (t) {
      return t === '转移' || t === '转移叫' || t === '约定' || t === '约定叫';
    });
  }

  /** 单缺点（将牌配合时的支持点） */
  function shortagePoints(hand) {
    var pts = 0;
    ['S', 'H', 'D', 'C'].forEach(function (s) {
      var n = hand[s] || 0;
      if (n === 0) pts += 5;
      else if (n === 1) pts += 3;
      else if (n === 2) pts += 1;
    });
    return pts;
  }

  /** 有 A/K，或 Q 带 2 张、J 带 3 张、10 带 4 张，视为一挡 */
  function hasStopper(cards, suit) {
    if (!cards || !cards.length) return null;
    var honors = cards.filter(function (k) { return String(k).charAt(0).toUpperCase() === suit; })
      .map(function (k) { return String(k).slice(1).toUpperCase(); });
    if (!honors.length) return false;
    if (honors.indexOf('A') >= 0 || honors.indexOf('K') >= 0) return true;
    if (honors.indexOf('Q') >= 0 && honors.length >= 2) return true;
    if (honors.indexOf('J') >= 0 && honors.length >= 3) return true;
    if (honors.indexOf('T') >= 0 && honors.length >= 4) return true;
    return false;
  }

  /** 技术性加倍：短对方花色 + 两门未叫花色 4 张；17+ 强牌不限 */
  function takeoutOK(auction, seat, hand, oppSuit) {
    if (!oppSuit) return false;
    if (hand.hcp >= 17) return true;
    if ((hand[oppSuit] || 0) > 2) return false;
    var count = 0;
    ['S', 'H', 'D', 'C'].forEach(function (s) {
      if (s !== oppSuit && (hand[s] || 0) >= 4) count++;
    });
    return count >= 2;
  }

  /** 阻击叫的阶数是否与套长匹配：6→2 阶、7→3 阶、8→4 阶 */
  function preemptLevelBonus(level, len) {
    var ideal = len >= 8 ? 4 : len === 7 ? 3 : len === 6 ? 2 : 1;
    if (level === ideal) return 12;
    return 12 - Math.abs(level - ideal) * 18;
  }

  /** 开叫/应叫/再叫/竞争之外的通用排序分 */
  function judgmentScore(auction, seat, hand, facts, cand) {
    var bid = cand.bid;
    var strain = C.strainOf(bid);
    var level = C.levelOf(bid);
    var len = strain && isSuit(strain) ? (hand[strain] || 0) : 0;
    var s = 0;

    if (facts.opening) {
      if (bid === '2C') s += 55;
      else if (bid === '2N') s += 45;
      else if (bid === '1N') {
        s += 35;
        if ((hand.H || 0) >= 5 || (hand.S || 0) >= 5) s -= 8; // 教材：通常无五张高花
      } else if (bid === '3N') {
        s -= 45;                                             // 拼搏 3NT 是特例，不优先
      } else if (strain === 'H' || strain === 'S') {
        if (level === 1) s += 30 + Math.max(0, len - 5) * 6;
        else s += preemptLevelBonus(level, len);
      } else if (strain === 'C' || strain === 'D') {
        if (level === 1) {
          s += 18 + Math.max(0, len - 3) * 3;
          if ((hand.H || 0) >= 5 || (hand.S || 0) >= 5) s -= 15;
          if (strain === 'D' && (hand.D || 0) === 3 && (hand.S || 0) >= 4 && (hand.H || 0) >= 4) s += 6;
        } else {
          s += preemptLevelBonus(level, len);
        }
      }
      return s;
    }

    if (facts.role === 'responder') {
      // 1NT 开叫后的应叫是另一套排序逻辑：约定叫（斯台曼/转移）不按叫品花色长短评分
      if (facts.partnerBid && facts.partnerBid.raw === '1N') {
        var hH = hand.H || 0, hS = hand.S || 0, hD = hand.D || 0, hC = hand.C || 0;
        var major4 = hH >= 4 || hS >= 4;
        if (bid === '2C') {
          // 六张高花时优先转移，斯台曼只用于找 4-4 配
          if ((hH >= 6 && hS < 4) || (hS >= 6 && hH < 4)) return 0;
          return major4 ? 35 : -30;
        }
        if (bid === '2D') return hH >= 5 ? 30 : -40;             // 转移红心
        if (bid === '2H') return hS >= 5 ? 30 : -40;             // 转移黑桃
        if (bid === '2S') return (hD >= 6 || hC >= 6) ? 20 : -30; // 弱低花接力
        if (bid === '2N') return major4 ? -35 : 12;              // 有高花先斯台曼
        if (bid === '3C') return hC >= 6 ? 15 : -30;
        if (bid === '3D') return hD >= 6 ? 15 : -30;
        if (bid === '3H') return (hH >= 6 && hand.hcp >= 10) ? 10 : -40;
        if (bid === '3S') return (hS >= 6 && hand.hcp >= 10) ? 10 : -40;
        if (bid === '3N') return major4 ? -20 : 18;
        if (bid === '4D') return (hH >= 6 && hand.hcp >= 10) ? 20 : -40;
        if (bid === '4H') return (hS >= 6 && hand.hcp >= 10) ? 20 : -40;
        if (bid === '4N') return hand.hcp >= 16 ? 10 : -20;
        return 0;
      }
      if (strain && strain !== 'N' && facts.partnerSuits[strain]) {
        var support = hand[strain] || 0;
        s += 25 + support * 4;
        if (level === 2) s += 6;
        if (level === 3) s += 5;
        if (level === 4) s += 2;
      } else if (strain && strain !== 'N') {
        if (level === 1) s += (len >= 4 ? 22 : -20) + (strain === 'H' || strain === 'S' ? 5 : 0);
        else s += len >= 5 ? 18 : -18;
        if (level >= 3) s -= 10;                            // 跳叫/强跳不优先于平叫
      } else if (strain === 'N') {
        if (level === 1) {
          s += 16;
          // 1M—1NT 半逼叫：13~14 点只在无五张套时走 1NT；
          // 有五张套时优先二盖一逼局，避免 1NT 的宽区间压过 2♣/2♦。
          if (hand.hcp >= 13 && Math.max(hand.S || 0, hand.H || 0, hand.D || 0, hand.C || 0) >= 5) s -= 10;
        } else if (level === 2) s += 16;
        else s += 10;
      }
      return s;
    }

    if (facts.role === 'opener') {
      if (strain && strain !== 'N' && facts.partnerSuits[strain]) {
        s += 24 + (hand[strain] || 0) * 3;
      } else if (strain === 'N') {
        if (level === 1) s += 22;
        else if (level === 2) s += 22;
        else s += 14;
      } else if (strain) {
        s += 12 + (len >= 6 ? 8 : len >= 4 ? 4 : -8);
      }
      return s;
    }

    // 争叫 / 应叫同伴争叫
    if (bid === 'X') s += 22;
    else if (strain === 'N') s += 18;
    else if (strain) {
      if (cand.rule.bidForm && cand.rule.bidForm.type === 'jumpSuit') {
        // 弱跳争叫的阶数要与套长匹配，5~6 张套不能叫到 4 阶以上
        s += preemptLevelBonus(level, len);
      } else {
        s += 16 + Math.min(8, len * 2);
        // 二阶争叫点力不足时风险大，优先不叫
        if (facts.role === 'overcaller' && level === 2 && hand.hcp < 10) s -= 15;
      }
      if (facts.role === 'advancer' && strain === facts.partnerSuit) s += 10;
    }
    return s;
  }

  function passScore(facts, hand, auction, seat) {
    var s = 55;
    if (facts.opening) {
      var longest = Math.max(hand.S || 0, hand.H || 0, hand.D || 0, hand.C || 0);
      // 6 张以上长套且 5~11 点属于阻击/弱二范围，PASS 不应压过开叫
      if (hand.hcp < 12) s += longest >= 6 ? -15 : 30;
      else s -= 35;
    } else if (facts.role === 'responder') {
      s += hand.hcp <= 5 ? 28 : hand.hcp <= 10 ? 0 : -30;
    } else if (facts.role === 'opener') {
      var pb = facts.partnerBid;
      var lv = pb ? C.levelOf(pb) : 0;
      if (pb && (pb.strain === 'N' || lv <= 2)) s += hand.hcp <= 15 ? 45 : 5;
      else s += 10;
    } else {
      s += 12;
    }
    return s;
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
    var partnerSuit = partnerSuitOf(auction, seat);
    var oppSuits = oppSuitsOf(auction, seat);
    var oppSuitList = Object.keys(oppSuits);
    var lastOpp = null;
    for (var i = auction.calls.length - 1; i >= 0; i--) {
      var c = auction.calls[i];
      if (c.type === 'bid' && isSuit(c.strain) && C.sideOf(c.seat) !== C.sideOf(seat)) {
        lastOpp = c.strain;
        break;
      }
    }
    var lastPartnerBid = null;
    var lp = lastPartnerCall(auction, seat);
    if (lp && lp.call.type === 'bid') lastPartnerBid = lp.call;
    var nonPass = auction.calls.filter(function (x) { return x.type !== 'pass'; });
    var facts = {
      opening: nonPass.length === 0,
      role: role,
      partnerSuit: partnerSuit,
      partnerSuits: partnerSuitsOf(auction, seat),
      partnerBid: lastPartnerBid,
      oppSuits: oppSuitList,
      lastOpp: lastOpp
    };

    legal.forEach(function (bid) {
      var rules = R.findRules(store, auction, seat, bid).rules;
      rules.forEach(function (rule) {
        if (rule.recommendable === false) return;

        var strain = C.strainOf(bid);
        var takeout = bid === 'X' && /技术性/.test(rule.meaning || '');
        if (takeout) {
          if (!takeoutOK(auction, seat, hand, lastOpp)) return;
        } else {
          if (!hasConstraint(rule)) return;
        }

        // 单加叫按「牌型点」评估（教材 2♥/2♠：6~10 按牌型点计）；
        // 阻击加叫等写的是「大牌点」，不能把单缺点加进去，否则 8 点 5 张支持会被 4H 漏掉。
        var evalHcp = hand.hcp;
        var usedSupport = false;
        if (partnerSuit && strain === partnerSuit && (hand[partnerSuit] || 0) >= 3 &&
            /牌型点|支持点/.test(rule.meaning || '') && rule.hcp &&
            (typeof rule.hcp.max !== 'number' || rule.hcp.max <= 10)) {
          evalHcp = hand.hcp + shortagePoints(hand);
          usedSupport = true;
        }

        var hcpHit = H.fitsHcp(rule.hcp, evalHcp);
        if (hcpHit === false) return;
        var shapeHit = H.fitsShape(rule.shape, hand, strain, partnerSuit);
        if (shapeHit === false) return;

        var matchedBy = [];
        if (hcpHit) matchedBy.push(usedSupport ? 'support' : 'hcp');
        if (shapeHit) matchedBy.push('shape');

        var score = 100;
        if (rule.hcp && typeof rule.hcp.max === 'number') {
          score += Math.max(0, 12 - (rule.hcp.max - rule.hcp.min));
        }
        if (shapeHit) score += 6;
        if (rule.priority) score += rule.priority * 10;
        score += judgmentScore(auction, seat, hand, facts, { bid: bid, rule: rule });

        // 无将叫品：对方叫过的花色必须有挡张（有具体牌张时才判断）
        if (strain === 'N' && oppSuitList.length && hand.cards && hand.cards.length === 13) {
          var missing = oppSuitList.filter(function (s2) { return hasStopper(hand.cards, s2) === false; });
          if (missing.length) score -= (C.levelOf(bid) >= 3 ? 45 : 30);
        }
        // 花色叫品：没有实际张数时不要推荐明显的短套（约定叫除外）
        if (strain && isSuit(strain) && rule.alert !== true && (hand[strain] || 0) < 3) {
          score -= 25;
        }
        score -= C.bidValue(bid) * 0.2;   // 同等条件下偏好低叫品

        var prev = best[bid];
        if (prev && prev.score >= score) return;
        best[bid] = {
          bid: bid, rule: rule, score: score, matchedBy: matchedBy,
          text: rule.meaning, source: rule.source
        };
      });
    });

    // 同伴刚发出黑木/盖伯问叫：必须按答叫表回答，不能 PASS
    var askType = X.detectAsk(auction, seat);
    var answerTable = askType && store.system.answers && store.system.answers[askType];
    if (answerTable) {
      var ansBids = Object.keys(answerTable).filter(function (b) { return legal.indexOf(b) >= 0; });
      var rightBid = null;
      var keyRank = null, keyCount = null;
      if (hand.cards && hand.cards.length === 13 && ansBids.length === 4) {
        keyRank = /K$/.test(askType) ? 'K' : 'A';
        // 牌张编码是「花色 + 点数」，如 SA / HK；点数在第二个字符
        keyCount = hand.cards.filter(function (c) { return String(c).slice(1).toUpperCase() === keyRank; }).length;
        // 答叫表按 0/4、1、2、3 排列
        rightBid = ansBids[keyCount === 4 ? 0 : keyCount] || null;
      }
      ansBids.forEach(function (b) {
        var rows = answerTable[b] || [];
        var text = rows.map(function (row) { return row.meaning; }).join('；');
        if (b === rightBid) text = '（你有 ' + keyCount + ' 个 ' + keyRank + '）' + text;
        best[b] = {
          bid: b,
          rule: {
            id: 'ask.' + askType + '.' + b, system: 'judgment', seatRole: role,
            contextKeys: [key], hcp: { min: 0, max: 37 }, forcing: 'none',
            alert: false, synthetic: true
          },
          score: 200 + (b === rightBid ? 40 : 0) - C.bidValue(b) * 0.2,
          matchedBy: [], text: text,
          source: '答叫表（' + askType + '）'
        };
      });
    }

    // PASS 也是正常叫牌判断的一部分；同伴逼叫时不能 PASS
    if (!auction.complete && legal.indexOf('P') >= 0 && !partnerForcing(store, auction, seat)) {
      var reason = facts.opening
        ? '不叫：牌力不足，暂不开叫。'
        : role === 'opener'
          ? '不叫：低限均型或没有合适的再叫。'
          : role === 'responder'
            ? '不叫：牌力不足或没有合适的应叫。'
            : '不叫：没有合适的争叫，保持现状。';
      var pr = {
        id: 'judgment.P', system: 'judgment', seatRole: role,
        contextKeys: [key], hcp: null, shape: null, forcing: 'none', alert: false,
        recommendable: true, meaning: reason, source: '基本判断（非规则库）',
        tags: [], legacyP: '不限', synthetic: true
      };
      best.P = {
        bid: 'P', rule: pr, score: 100 + passScore(facts, hand, auction, seat) - 55,
        matchedBy: ['context'], text: reason, source: pr.source
      };
    }

    var candidates = Object.keys(best).map(function (b) { return best[b]; })
      .sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return C.bidValue(a.bid) - C.bidValue(b.bid);
      });

    return { candidates: candidates, key: key, role: role, total: candidates.length };
  }

  return { recommend: recommend, hasConstraint: hasConstraint };
});
