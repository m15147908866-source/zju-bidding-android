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
    // 合成 PASS 是判断层给出的兜底候选，不属于规则库，允许没有点数/牌型约束
    assert.ok(c.rule.synthetic === true || c.rule.hcp || c.rule.shape,
      '候选规则必须有 hcp 或 shape 约束');
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

test('一阶开叫的点力下限是 12 点', () => {
  const weak = REC.recommend(sayc, ...Object.values(setup([])), hand(11, 4, 3, 3, 3));
  assert.strictEqual(weak.candidates[0].bid, 'P', '11 点应优先 PASS：' + weak.candidates.map((x) => x.bid).join(','));
  const ok = REC.recommend(sayc, ...Object.values(setup([])), hand(12, 4, 3, 3, 3));
  assert.ok(ok.candidates.some((x) => x.bid === '1C'), '12 点三张梅花应推荐 1♣');
});

test('1♦ 开叫要求四张方块', () => {
  const { auction, seat } = setup([]);
  const three = REC.recommend(sayc, auction, seat, hand(13, 3, 4, 3, 3));
  assert.ok(!three.candidates.some((x) => x.bid === '1D'), '三张方块不应推荐 1♦');
  const four = REC.recommend(sayc, auction, seat, hand(13, 3, 4, 4, 2));
  assert.ok(four.candidates.some((x) => x.bid === '1D'), '四张方块应推荐 1♦');
});

test('拼搏 3NT 要求七张低花', () => {
  const { auction, seat } = setup([]);
  const flat = REC.recommend(sayc, auction, seat, hand(10, 3, 3, 4, 3));
  assert.ok(!flat.candidates.some((x) => x.bid === '3N'), '3-3-4-3 不应推荐拼搏 3NT');
  const long = REC.recommend(sayc, auction, seat, hand(10, 2, 2, 2, 7));
  assert.ok(long.candidates.some((x) => x.bid === '3N'), '七张梅花应推荐拼搏 3NT');
});

test('一阶争叫要求五张所叫花色', () => {
  const four = REC.recommend(sayc, ...Object.values(setup(['1H'])), hand(10, 4, 2, 4, 3));
  assert.ok(!four.candidates.some((x) => x.bid === '1S'), '四张黑桃不应争叫 1♠');
  const five = REC.recommend(sayc, ...Object.values(setup(['1H'])), hand(10, 5, 2, 3, 3));
  assert.ok(five.candidates.some((x) => x.bid === '1S'), '五张黑桃应争叫 1♠');
});

test('1NT 应叫：六张高花优先转移而不是斯台曼', () => {
  const { auction, seat } = setup(['1N', 'P']);
  const res = REC.recommend(sayc, auction, seat, hand(8, 2, 6, 3, 2));
  assert.strictEqual(res.candidates[0].bid, '2D', '六张红心应先转移 2♦：' + res.candidates.map((x) => x.bid).join(','));
  const four = REC.recommend(sayc, auction, seat, hand(8, 4, 4, 3, 2));
  assert.strictEqual(four.candidates[0].bid, '2C', '4-4 双高花应先斯台曼：' + four.candidates.map((x) => x.bid).join(','));
});

test('Jacoby 2NT 要求四张将牌支持', () => {
  const three = REC.recommend(sayc, ...Object.values(setup(['1H', 'P'])), hand(13, 3, 3, 4, 3));
  assert.ok(!three.candidates.some((x) => x.bid === '2N'), '三张红心不应使用 Jacoby 2NT');
  const four = REC.recommend(sayc, ...Object.values(setup(['1H', 'P'])), hand(13, 3, 4, 3, 3));
  assert.ok(four.candidates.some((x) => x.bid === '2N'), '四张红心应可使用 Jacoby 2NT');
});

test('2/1 逼局后不能 PASS，按支持张数选择 4H / 3NT', () => {
  const two = REC.recommend(sayc, ...Object.values(setup(['1H', 'P', '2C', 'P', '2N', 'P'])),
    hand(13, 3, 2, 4, 4));
  assert.ok(two.candidates.length > 0, '1H-2C-2N 后必须有候选');
  assert.strictEqual(two.candidates[0].bid, '3N', '两张红心应叫 3NT：' + two.candidates.map((x) => x.bid).join(','));
  assert.ok(!two.candidates.some((x) => x.bid === 'P'), '逼局进程中不应推荐 PASS');

  const three = REC.recommend(sayc, ...Object.values(setup(['1H', 'P', '2C', 'P', '2N', 'P'])),
    hand(13, 3, 3, 4, 3));
  assert.strictEqual(three.candidates[0].bid, '4H', '三张红心应叫 4♥：' + three.candidates.map((x) => x.bid).join(','));
});

test('黑木答叫按实际 A 数高亮', () => {
  const cards = ['SA', 'SK', 'SQ', 'SJ', 'S2', 'HA', 'HK', 'HQ', 'H2', 'D2', 'D3', 'C2', 'C3'];
  const { auction, seat } = setup(['1S', 'P', '4N', 'P']);
  const res = REC.recommend(sayc, auction, seat, Object.assign({}, hand(16, 6, 4, 2, 1), { cards }));
  assert.strictEqual(res.candidates[0].bid, '5H', '两个 A 应首选 5♥：' + res.candidates.map((x) => x.bid).join(','));
  assert.ok(/2 个 A/.test(res.candidates[0].text), '答叫说明应写明 A 数：' + res.candidates[0].text);
});

test('1H-2H 后低限开叫方应 PASS', () => {
  const res = REC.recommend(sayc, ...Object.values(setup(['1H', 'P', '2H', 'P'])),
    hand(14, 3, 5, 3, 2));
  assert.strictEqual(res.candidates[0].bid, 'P', '14 点低限应 PASS：' + res.candidates.map((x) => x.bid).join(','));
});

test('1M 应叫缺口：13~14 点经 1NT 后再叫 2NT（方案 A）', () => {
  const c1 = hand(13, 3, 2, 4, 4);
  const firstH = REC.recommend(sayc, ...Object.values(setup(['1H', 'P'])), c1);
  assert.strictEqual(firstH.candidates[0].bid, '1N', '13 点、2 张红心应先 1NT：' + firstH.candidates.map((x) => x.bid).join(','));
  assert.notStrictEqual(firstH.candidates[0].bid, 'P', '13 点不应 PASS 掉 1♥');
  const secondH = REC.recommend(sayc, ...Object.values(setup(['1H', 'P', '1N', 'P', '2H', 'P'])), c1);
  assert.strictEqual(secondH.candidates[0].bid, '2N', '1NT 后开叫人 2♥，13 点应再叫 2NT：' + secondH.candidates.map((x) => x.bid).join(','));

  const c2 = hand(14, 2, 3, 4, 4);
  const firstS = REC.recommend(sayc, ...Object.values(setup(['1S', 'P'])), c2);
  assert.strictEqual(firstS.candidates[0].bid, '1N', '14 点、2 张黑桃应先 1NT：' + firstS.candidates.map((x) => x.bid).join(','));
  const secondS = REC.recommend(sayc, ...Object.values(setup(['1S', 'P', '1N', 'P', '2S', 'P'])), c2);
  assert.strictEqual(secondS.candidates[0].bid, '2N', '1NT 后开叫人 2♠，14 点应再叫 2NT：' + secondS.candidates.map((x) => x.bid).join(','));
});

test('半逼叫 1NT：开叫人不得 PASS，6~10 点应叫人可停 2M', () => {
  const opener = REC.recommend(sayc, ...Object.values(setup(['1H', 'P', '1N', 'P'])), hand(12, 3, 6, 2, 2));
  assert.ok(!opener.candidates.some((x) => x.bid === 'P'), '半逼叫 1NT 后开叫人不能 PASS');
  assert.strictEqual(opener.candidates[0].bid, '2H', '低限五张红心应再叫 2♥：' + opener.candidates.map((x) => x.bid).join(','));

  const weak = REC.recommend(sayc, ...Object.values(setup(['1H', 'P', '1N', 'P', '2H', 'P'])), hand(8, 3, 2, 4, 4));
  assert.strictEqual(weak.candidates[0].bid, 'P', '8 点应停叫：' + weak.candidates.map((x) => x.bid).join(','));
});

test('1M 应叫缺口：15~17 走 3NT，4 张支持仍走 Jacoby', () => {
  const nt = REC.recommend(sayc, ...Object.values(setup(['1H', 'P'])), hand(16, 3, 2, 4, 4));
  assert.strictEqual(nt.candidates[0].bid, '3N', '16 点、2 张红心应先 3NT：' + nt.candidates.map((x) => x.bid).join(','));
  const jacoby = REC.recommend(sayc, ...Object.values(setup(['1H', 'P'])), hand(14, 2, 4, 4, 3));
  assert.strictEqual(jacoby.candidates[0].bid, '2N', '4 张红心、13 点以上应走 Jacoby 2NT：' + jacoby.candidates.map((x) => x.bid).join(','));
});

test('1M 应叫缺口：13~14 点有五张套时优先二盖一/一阶新花', () => {
  const clubs = REC.recommend(sayc, ...Object.values(setup(['1H', 'P'])), hand(13, 2, 2, 4, 5));
  assert.strictEqual(clubs.candidates[0].bid, '2C', '13 点、5 张梅花应叫 2♣：' + clubs.candidates.map((x) => x.bid).join(','));
  const spades = REC.recommend(sayc, ...Object.values(setup(['1H', 'P'])), hand(14, 5, 2, 4, 2));
  assert.strictEqual(spades.candidates[0].bid, '1S', '14 点、5 张黑桃应叫 1♠：' + spades.candidates.map((x) => x.bid).join(','));
});

