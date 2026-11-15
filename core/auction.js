/* ============================================================================
   core/auction.js — 叫牌过程模型（纯函数）
   单一事实来源：定约 / 庄家 / 加倍状态 / 合法集 / 轮到谁 / 是否结束
   法条（Laws of Duplicate Bridge 2017）：
     Law 18A/B/E   叫品形式与大小
     Law 19A1/19B1 加倍只能针对敌方最后一个叫品；再加倍只能针对敌方加倍
     Law 19C       新叫品覆盖先前的加倍/再加倍
     Law 19D       加倍可延迟生效（中间可以夹 Pass）
     Law 22A/B     连续三个 Pass 结束；四家 Pass 无定约
     Law 39        叫牌结束后再叫属非法
     Definitions   Declarer = 最终叫品所在阵营中最早叫出该花色的人
   ========================================================================== */
(function (root, factory) {
  'use strict';
  var calls = (typeof module === 'object' && module.exports) ? require('./calls.js') : root.BridgeCore;
  var api = factory(calls);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.BridgeCore = root.BridgeCore || {};
    Object.keys(api).forEach(function (k) { root.BridgeCore[k] = api[k]; });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C) {
  'use strict';

  var SEATS = C.SEATS;
  var SEAT_INDEX = C.SEAT_INDEX;

  /**
   * @param {string} dealer 'N'|'E'|'S'|'W'
   * @param {{lenient?: boolean}} [opts] lenient=true 时不校验合法性（仅用于读取历史存档）
   */
  function Auction(dealer, opts) {
    if (!SEATS.includes(dealer)) throw new Error('非法发牌人：' + dealer);
    this.dealer = dealer;
    this.calls = [];
    this.lenient = !!(opts && opts.lenient);
    this._lastBid = null;
    this._contract = null;
    this._complete = false;
  }

  Auction.prototype = {
    constructor: Auction,

    get lastBid() { return this._lastBid; },
    get contract() { return this._contract; },
    get complete() { return this._complete; },

    get position() {
      if (this._complete) return null;
      return SEATS[(SEAT_INDEX[this.dealer] + this.calls.length) % 4];
    },

    /** 最后一个非 Pass 叫品 —— 加倍/再加倍的合法性只依赖它 */
    get lastNonPass() {
      for (var i = this.calls.length - 1; i >= 0; i--) {
        if (this.calls[i].type !== 'pass') return this.calls[i];
      }
      return null;
    },

    isLegal: function (call) {
      if (this._complete) return false;
      var seat = this.position;
      if (call.type === 'pass') return true;
      if (call.type === 'bid') {
        if (call.level < 1 || call.level > 7) return false;
        return C.isHigher(call, this._lastBid);
      }
      var last = this.lastNonPass;
      if (call.type === 'double') {
        if (!last || last.type !== 'bid') return false;
        return C.sideOf(last.seat) !== C.sideOf(seat);
      }
      if (call.type === 'redouble') {
        if (!last || last.type !== 'double') return false;
        return C.sideOf(last.seat) !== C.sideOf(seat);
      }
      return false;
    },

    /** 当前座位的合法叫品（规范编码，升序，末尾追加 X / XX） */
    legalCalls: function () {
      if (this._complete) return [];
      var out = ['P'];
      for (var lv = 1; lv <= 7; lv++) {
        for (var i = 0; i < C.STRAINS.length; i++) {
          var st = C.STRAINS[i];
          if (C.isHigher({ level: lv, strain: st }, this._lastBid)) out.push(lv + st);
        }
      }
      if (this.isLegal(C.parseCall('X'))) out.push('X');
      if (this.isLegal(C.parseCall('XX'))) out.push('XX');
      return out;
    },

    add: function (raw) {
      var call = C.parseCall(raw);
      if (!this.lenient && !this.isLegal(call)) {
        throw new Error('非法叫品 ' + call.raw + '（' + this.position + ' 的位置）—— 合法集：' +
          this.legalCalls().join(','));
      }
      var entry = {
        type: call.type, level: call.level, strain: call.strain, raw: call.raw,
        seat: SEATS[(SEAT_INDEX[this.dealer] + this.calls.length) % 4],
        index: this.calls.length
      };
      this.calls.push(entry);
      if (entry.type === 'bid') this._lastBid = entry;
      this._refresh();
      return entry;
    },

    _refresh: function () {
      this._complete = this._deriveComplete();
      this._contract = this._deriveContract();
    },

    _deriveComplete: function () {
      var n = this.calls.length;
      if (n < 4) return false;
      if (n === 4 && this.calls.every(function (c) { return c.type === 'pass'; })) return true; // Law 22B
      var last3 = this.calls.slice(-3);
      if (!last3.every(function (c) { return c.type === 'pass'; })) return false;
      return this._lastBid !== null; // Law 22A
    },

    _deriveContract: function () {
      if (!this.calls.length) return null;
      var finalBid = this._lastBid;
      if (!finalBid) return null;          // 四家 Pass
      // 只有叫牌结束（或已进入最终叫品之后的三 Pass）才算定约
      var after = this.calls.slice(finalBid.index + 1);
      var passedOut = after.filter(function (c) { return c.type === 'pass'; }).length;
      if (passedOut < 3) return null;      // 叫牌仍在进行中

      var doubled = 0;
      for (var i = 0; i < after.length; i++) {
        if (after[i].type === 'redouble') { doubled = 2; break; }
        if (after[i].type === 'double') doubled = 1;
      }
      var side = C.sideOf(finalBid.seat);
      var declarerCall = null;
      for (var j = 0; j < this.calls.length; j++) {
        var c = this.calls[j];
        if (c.type === 'bid' && C.sideOf(c.seat) === side && c.strain === finalBid.strain) {
          declarerCall = c;
          break;
        }
      }
      return {
        level: finalBid.level,
        strain: finalBid.strain,
        bid: finalBid.level + finalBid.strain,
        declarer: declarerCall ? declarerCall.seat : finalBid.seat,
        doubled: doubled
      };
    },

    toPBN: function () {
      return this.calls.map(function (c) { return c.seat + ':' + c.raw; }).join(' ');
    },

    /** 下一个叫牌人（叫牌结束后为 null） */
    toAct: function () { return this.position; }
  };

  Auction.fromCalls = function (dealer, calls, opts) {
    var a = new Auction(dealer, opts);
    (calls || []).forEach(function (c) { a.add(typeof c === 'string' ? c : c.bid); });
    return a;
  };

  /** 从界面存档 [{seat, bid}] 还原；自动忽略座位字段，按发牌人顺序重排 */
  Auction.fromEntries = function (dealer, entries, opts) {
    var a = new Auction(dealer, Object.assign({ lenient: true }, opts || {}));
    (entries || []).forEach(function (e) { a.add(e && e.bid != null ? e.bid : e); });
    return a;
  };

  return { Auction: Auction };
});
