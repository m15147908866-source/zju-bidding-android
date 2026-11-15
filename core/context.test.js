'use strict';
/* core/context.test.js — contextKey 与问叫识别 */
const test = require('node:test');
const assert = require('node:assert');
const { Auction } = require('./auction.js');
const X = require('./context.js');

function keyOf(calls, seat, dealer) {
  return X.contextKey(Auction.fromCalls(dealer || 'N', calls), seat);
}

test('开叫语境：无人叫牌，key 为空串', () => {
  assert.equal(keyOf([], 'N'), '');
  assert.equal(keyOf(['P', 'P'], 'S'), '', '前两家 Pass 不影响开叫语境');
  assert.equal(X.roleOfKey(''), 'opener');
});

test('应叫语境：同伴开叫 + 对手 Pass 被归一化掉', () => {
  assert.equal(keyOf(['1S'], 'S'), 'P:1S');
  assert.equal(keyOf(['1S', 'P'], 'S'), 'P:1S');
  assert.equal(X.roleOfKey('P:1S'), 'responder');
});

test('争叫语境：对手开叫，我是争叫方', () => {
  assert.equal(keyOf(['1S'], 'E'), 'O:1S');
  assert.equal(keyOf(['1S', 'P'], 'W'), 'O:1S P:P');
  assert.equal(X.roleOfKey('O:1S'), 'overcaller');
  assert.equal(X.roleOfKey('O:1S P:P'), 'overcaller', '同伴的 Pass 不等于同伴叫过牌');
});

test('关键回归：1S-(2H) 的语境必须包含对手的 2H，不能退化成「应叫」', () => {
  const a = Auction.fromCalls('N', ['1S', '2H']);
  const key = X.contextKey(a, 'S');
  assert.equal(key, 'P:1S O:2H');
  assert.equal(X.roleOfKey(key), 'responder');
  assert.equal(X.keyMatches('P:1S', key), false, '无争叫的应叫规则不能命中');
  assert.equal(X.keyMatches('P:* O:*', key), true);
});

test('开叫方再叫：同伴应叫后的语境', () => {
  assert.equal(keyOf(['1C', 'P', '1H'], 'N'), 'M:1C P:1H');
  assert.equal(X.roleOfKey('M:1C P:1H'), 'opener');
  assert.equal(keyOf(['1C', '1S', '2H'], 'N'), 'M:1C O:1S P:2H');
});

test('应叫方再叫：同伴开叫 + 自己应叫 + 开叫人再叫', () => {
  assert.equal(keyOf(['1C', 'P', '1H', 'P', '2C'], 'S'), 'P:1C M:1H P:2C');
  assert.equal(X.roleOfKey('P:1C M:1H P:2C'), 'responder');
});

test('通配符匹配：逐段对齐，长度必须一致', () => {
  assert.equal(X.keyMatches('P:* O:*', 'P:1C O:4H'), true);
  assert.equal(X.keyMatches('P:* O:*', 'P:1C O:4H P:2H'), false);
  assert.equal(X.keyMatches('*', ''), false, '通配符按段匹配，不吞掉整段语境');
  assert.equal(X.keyMatches('O:* P:X', 'O:1M P:X'), true);
});

test('黑木 / 盖伯识别：只认同伴发出的问叫', () => {
  // 真实轮转：同伴叫 4NT，上家 Pass，轮到我答叫
  const blackwood = X.detectAsk(Auction.fromCalls('N', ['1S', 'P', '4N', 'P']), 'N');
  assert.equal(blackwood, 'blackwood');
  const gerber = X.detectAsk(Auction.fromCalls('N', ['1N', 'P', '4C', 'P']), 'N');
  assert.equal(gerber, 'gerber');
  const quantitative = X.detectAsk(Auction.fromCalls('N', ['1N', 'P', '4N', 'P']), 'N');
  assert.equal(quantitative, null, '1NT 后的 4NT 是定量邀叫，不是黑木');
  const notPartner = X.detectAsk(Auction.fromCalls('N', ['4N']), 'E');
  assert.equal(notPartner, null, '对手叫的 4NT 不是问叫');

  // 对手争叫或加倍后不再套用简单答叫表
  const interfered = X.detectAsk(Auction.fromCalls('N', ['1S', 'P', '4N', '5H']), 'N');
  assert.equal(interfered, null);
  // 已经答叫过，就不再是「等待答叫」状态
  const answered = X.detectAsk(Auction.fromCalls('N', ['1S', 'P', '4N', 'P', '5C', 'P']), 'N');
  assert.equal(answered, null);
});

test('扣叫：叫对手叫过的花色', () => {
  const a = Auction.fromCalls('N', ['1S', '2H']);
  assert.equal(X.isCueBid(a, 'S', '3H'), true);
  assert.equal(X.isCueBid(a, 'S', '3C'), false);
});
