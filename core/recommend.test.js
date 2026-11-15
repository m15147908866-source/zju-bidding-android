/* ============================================================================
   core/recommend.test.js — 推荐器回归测试（审计 P0-4）
   历史缺陷：0 点手牌会推荐 2S~7S（扣叫形态），6 点手牌会推荐 4NT 黑木。
   根因：推荐器只看「有没有规则」，不看规则里的点力/牌型约束。
   ========================================================================== */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { Auction } = require('./auction.js');
const C = require('./calls.js');
const X = require('./context.js');
const R = require('./rules.js');
const H = require('./hand.js');
const REC = require('./recommend.js');

const data = require('../data/bridge-data.js');
const sayc = R.createStore(data.systems.find((s) => s.key === 'sayc'));

/** 用旧编码搭叫牌过程，返回 { auction, seat } */
function setup(calls, dealer = 'N') {
  const a = Auction.fromCalls(dealer, calls);
  return { auction: a, seat: a.position };
}

const hand = (hcp, s, h, d, c) => ({ hcp, S: s, H: h, D: d, C: c });

test('0 点手牌不会推荐 2♠~7♠ 扣叫', () => {
  const { auction, seat } = setup(['1S', '2H']);
  const res = REC.recommend(sayc, auction, seat, hand(0, 3, 3, 3, 4));
  const cue = res.candidates.filter((x) => C.isBid(x.bid) && C.strainOf(x.bid) === 'S');
  assert.deepStrictEqual(cue, [], '0 点不应有黑桃扣叫候选：' + JSON.stringify(res.candidates.map((x) => x.bid)));
});

test('6 点手牌不会推荐 4NT 黑木', () => {
  const { auction, seat } = setup(['1S', 'P']);
  const res = REC.recommend(sayc, auction, seat, hand(6, 3, 4, 3, 3));
  assert.strictEqual(res.candidates.some((x) => x.bid === '4N'), false);
});

test('每个候选都带可回指的规则与点力约束', () => {
  const { auction, seat } = setup(['1C', 'P']);
  const res = REC.recommend(sayc, auction, seat, hand(12, 4, 3, 3, 3));
  assert.ok(res.candidates.length > 0, '1♣—P 后 12 点应有候选');
  res.candidates.forEach((c) => {
    assert.ok(c.rule && c.rule.id, '候选必须带规则 id');
    assert.ok(c.rule.hcp || c.rule.shape, '候选规则必须有 hcp 或 shape 约束');
    assert.notStrictEqual(c.rule.recommendable, false);
  });
});

test('候选的叫品都合法', () => {
  const { auction, seat } = setup(['1S', '2H', 'P', 'P']);
  const legal = new Set(auction.legalCalls());
  const res = REC.recommend(sayc, auction, seat, hand(8, 3, 4, 3, 3));
  res.candidates.forEach((c) => assert.ok(legal.has(c.bid), '非法候选：' + c.bid));
});

test('点力落在规则区间外时不推荐该规则', () => {
  // 1NT 开叫后 2NT 是 8~9 点邀局，0 点不应出现
  const { auction, seat } = setup(['1N', 'P']);
  const res = REC.recommend(sayc, auction, seat, hand(0, 4, 3, 3, 3));
  assert.strictEqual(res.candidates.some((x) => x.bid === '2N'), false);
});

test('fitsHcp / fitsShape 的边界', () => {
  assert.strictEqual(H.fitsHcp(null, 10), null);
  assert.strictEqual(H.fitsHcp({ min: 12, max: 14 }, 12), true);
  assert.strictEqual(H.fitsHcp({ min: 12, max: 14 }, 15), false);
  assert.strictEqual(H.fitsHcp({ min: 20, max: 37 }, 3), false);
  const h = hand(10, 5, 3, 3, 2);
  assert.strictEqual(H.fitsShape({ suitMin: { S: 5 } }, h, 'S'), true);
  assert.strictEqual(H.fitsShape({ suitMin: { H: 5 } }, h, 'S'), false);
  assert.strictEqual(H.fitsShape({ balanced: true }, h, 'S'), true);
  const short = hand(10, 5, 4, 3, 1);
  assert.strictEqual(H.fitsShape({ shortage: 'C' }, short, 'S'), true);
  assert.strictEqual(H.fitsShape({ shortage: 'S' }, short, 'S'), false);
});

test('语境键与规则表的角色一致', () => {
  const a = Auction.fromCalls('N', ['1H', 'P', '2C']);
  assert.strictEqual(X.contextKey(a, 'N'), 'M:1H P:2C');
  assert.strictEqual(X.roleOfKey('M:1H P:2C'), 'opener');
});

test('开叫推荐不会只看点力：4 张高花不推荐 1H/1S', () => {
  // 浏览器回归暴露：13 点 3-4-3-3 曾同时推荐 1♣/1♦/1♥/1♠
  const { auction, seat } = setup([]);
  const res = REC.recommend(sayc, auction, seat, hand(13, 3, 4, 3, 3));
  const bids = res.candidates.map((x) => x.bid);
  assert.ok(!bids.includes('1H'), '4 张红心不应推荐 1H：' + bids.join(','));
  assert.ok(!bids.includes('1S'), '3 张黑桃不应推荐 1S：' + bids.join(','));
  assert.ok(bids.includes('1C') || bids.includes('1D'), '低花开叫应仍在候选中：' + bids.join(','));
});

test('1NT 开叫要求均型', () => {
  const { auction, seat } = setup([]);
  // 5-4-2-2、16 点：不是均型，不应推荐 1NT
  const res = REC.recommend(sayc, auction, seat, hand(16, 2, 2, 5, 4));
  assert.ok(!res.candidates.some((x) => x.bid === '1N'),
    '非均型不应推荐 1NT：' + res.candidates.map((x) => x.bid).join(','));
});

test('弱二开叫的「所叫花色」约束生效', () => {
  const { auction, seat } = setup([]);
  const six = REC.recommend(sayc, auction, seat, hand(8, 2, 6, 3, 2));
  assert.ok(six.candidates.some((x) => x.bid === '2H'), '6 张红心应推荐 2H');
  const five = REC.recommend(sayc, auction, seat, hand(8, 2, 5, 3, 3));
  assert.ok(!five.candidates.some((x) => x.bid === '2H'), '5 张红心不应推荐 2H');
});
