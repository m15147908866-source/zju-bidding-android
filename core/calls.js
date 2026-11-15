/* ============================================================================
   core/calls.js — 叫品编码与比较（纯函数，无 DOM / 无存储）
   规范：本文件使用内部规范编码 P / X / XX / 1C..7N（N = 无将）。
   界面与旧数据的 PASS / NT 编码在 engine.js 适配层转换。
   法条：Laws 2017 Law 18A/B/E（叫品形式与大小）
   ========================================================================== */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.BridgeCore = root.BridgeCore || {};
    Object.keys(api).forEach(function (k) { root.BridgeCore[k] = api[k]; });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SEATS = ['N', 'E', 'S', 'W'];
  var SEAT_INDEX = { N: 0, E: 1, S: 2, W: 3 };
  var NEXT = { N: 'E', E: 'S', S: 'W', W: 'N' };
  var PTR = { N: 'S', S: 'N', E: 'W', W: 'E' };
  var STRAINS = ['C', 'D', 'H', 'S', 'N'];      // 升序，N(NT) 最高
  var STRAIN_RANK = { C: 0, D: 1, H: 2, S: 3, N: 4 };
  var SEAT_CN = { N: '北', E: '东', S: '南', W: '西' };
  var SUIT_SYM = { C: '♣', D: '♦', H: '♥', S: '♠' };

  function sideOf(seat) {
    return seat === 'N' || seat === 'S' ? 'NS' : 'EW';
  }
  function partnerOf(seat) { return PTR[seat]; }

  /** 旧编码（PASS/NT）与写法差异统一为内部规范编码 */
  function normalizeCall(raw) {
    if (raw == null) return null;
    var s = String(raw).replace(/\s+/g, '').toUpperCase();
    if (s === 'P' || s === 'PASS' || s === 'PASS!') return 'P';
    if (s === 'X' || s === 'DBL' || s === 'D' || s === '×') return 'X';
    if (s === 'XX' || s === 'RDBL' || s === '××') return 'XX';
    s = s.replace(/NT$/, 'N').replace(/无将$/, 'N');
    if (/^[1-7][CDHSN]$/.test(s)) return s;
    return null;
  }

  function parseCall(raw) {
    var s = normalizeCall(raw);
    if (!s) throw new Error('无法解析叫品：' + raw);
    if (s === 'P') return { type: 'pass', raw: 'P' };
    if (s === 'X') return { type: 'double', raw: 'X' };
    if (s === 'XX') return { type: 'redouble', raw: 'XX' };
    return { type: 'bid', level: Number(s[0]), strain: s[1], raw: s };
  }

  function isBid(call) {
    var s = typeof call === 'string' ? normalizeCall(call) : (call && call.raw);
    return !!s && /^[1-7][CDHSN]$/.test(s);
  }
  function levelOf(call) {
    var s = typeof call === 'string' ? normalizeCall(call) : (call && call.raw);
    return isBid(s) ? Number(s[0]) : 0;
  }
  function strainOf(call) {
    var s = typeof call === 'string' ? normalizeCall(call) : (call && call.raw);
    return isBid(s) ? s[1] : null;
  }
  function bidValue(call) {
    return isBid(call) ? (levelOf(call) - 1) * 5 + STRAIN_RANK[strainOf(call)] + 1 : 0;
  }
  function isHigher(a, b) {
    if (!b) return true;
    if (a.level !== b.level) return a.level > b.level;
    return STRAIN_RANK[a.strain] > STRAIN_RANK[b.strain];
  }
  /** 某花色在给定「最后叫品」之下的最低合法阶数 */
  function lowestLegalLevel(lastBid, strain) {
    var last = typeof lastBid === 'string' ? parseCall(lastBid) : lastBid;
    if (!last || last.type !== 'bid') return 1;
    for (var lv = 1; lv <= 7; lv++) {
      if (isHigher({ level: lv, strain: strain }, last)) return lv;
    }
    return null;
  }

  /** 展示用：内部编码 → 旧编码（PASS / NT），保持既有 UI 与数据不返工 */
  function toLegacy(call) {
    var s = normalizeCall(call);
    if (s === 'P') return 'PASS';
    if (!s) return String(call);
    return s.replace(/N$/, 'NT');
  }

  return {
    SEATS: SEATS, SEAT_INDEX: SEAT_INDEX, NEXT: NEXT, PTR: PTR,
    STRAINS: STRAINS, STRAIN_RANK: STRAIN_RANK,
    SEAT_CN: SEAT_CN, SUIT_SYM: SUIT_SYM,
    sideOf: sideOf, partnerOf: partnerOf,
    normalizeCall: normalizeCall, parseCall: parseCall,
    isBid: isBid, levelOf: levelOf, strainOf: strainOf, bidValue: bidValue,
    isHigher: isHigher, lowestLegalLevel: lowestLegalLevel, toLegacy: toLegacy
  };
});
