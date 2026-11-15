'use strict';
/* core/auction.test.js — 定约/庄家/合法集回归（node --test） */
const test = require('node:test');
const assert = require('node:assert');
const { Auction } = require('./auction.js');
const C = require('./calls.js');

test('叫品编码：旧编码与内部编码互转', () => {
  assert.equal(C.normalizeCall('PASS'), 'P');
  assert.equal(C.normalizeCall('3NT'), '3N');
  assert.equal(C.toLegacy('3N'), '3NT');
  assert.equal(C.bidValue('1C'), 1);
  assert.equal(C.bidValue('1N'), 5);
  assert.equal(C.bidValue('2C'), 6);
  assert.equal(C.isHigher(C.parseCall('1S'), C.parseCall('1H')), true);
  assert.equal(C.isHigher(C.parseCall('2C'), C.parseCall('1N')), true);
});

test('合法集：叫品必须高于当前叫品，加倍只针对最后非 Pass 叫品', () => {
  const a = Auction.fromCalls('N', ['1S']);
  assert.equal(a.position, 'E');
  const legal = a.legalCalls();
  assert.ok(!legal.includes('1S'));
  assert.ok(legal.includes('1N'));
  assert.ok(legal.includes('2C'));
  assert.ok(legal.includes('X'));

  a.add('X');
  const b = Auction.fromCalls('N', ['1S', 'X']);
  assert.equal(b.position, 'S');
  assert.ok(!b.legalCalls().includes('X'), '同伴的叫品被加倍，自己不能再加倍');
  assert.ok(b.legalCalls().includes('XX'), '同伴的叫品被对方加倍，可以再加倍');
  b.add('P');
  assert.equal(b.position, 'W');
  assert.ok(!b.legalCalls().includes('XX'), '加倍方自己不能再加倍');
});

test('加倍可延迟生效：中间的 Pass 不影响 X 的合法性', () => {
  // N 1S, E Pass, S Pass → 轮到 W，仍可对 1S 加倍
  const a = Auction.fromCalls('N', ['1S', 'P', 'P']);
  assert.equal(a.position, 'W');
  assert.ok(a.legalCalls().includes('X'));
  assert.ok(!Auction.fromCalls('N', ['1S', 'P']).legalCalls().includes('X'), '同方不能加倍同伴的叫品');
});

test('叫牌结束：连续三个 Pass；四家 Pass 无定约', () => {
  const passedOut = Auction.fromCalls('N', ['P', 'P', 'P', 'P']);
  assert.equal(passedOut.complete, true);
  assert.equal(passedOut.contract, null);

  const a = Auction.fromCalls('N', ['1N', 'P', '3N', 'P', 'P', 'P']);
  assert.equal(a.complete, true);
  assert.ok(a.contract);
  assert.equal(a.contract.bid, '3N');
  assert.equal(a.contract.declarer, 'N');
  assert.equal(a.contract.doubled, 0);
});

test('庄家 = 最终叫品一方最早叫出该花色的人（不是最后叫的人）', () => {
  // N 1NT, E P, S 2C, W P, N 2H, E P, S 3NT, 全 Pass
  const a = Auction.fromCalls('N', ['1N', 'P', '2C', 'P', '2H', 'P', '3N', 'P', 'P', 'P']);
  assert.equal(a.contract.bid, '3N');
  assert.equal(a.contract.declarer, 'N');
});

test('庄家：同阵营先叫出该花色的人摘庄', () => {
  // N 1C, E P, S 1H, W P, N 1S, E P, S 4S, 全 Pass → 最终 4S，先叫黑桃的是 N（开叫人）
  const a = Auction.fromCalls('N', ['1C', 'P', '1H', 'P', '1S', 'P', '4S', 'P', 'P', 'P']);
  assert.equal(a.contract.bid, '4S');
  assert.equal(a.contract.declarer, 'N');
  // 无将同理：先叫出 NT 的人做庄
  const b = Auction.fromCalls('N', ['1C', 'P', '1S', 'P', '2C', 'P', '3N', 'P', 'P', 'P']);
  assert.equal(b.contract.declarer, 'S');
});

test('加倍状态：X 后 XX 的定约倍数与庄家', () => {
  const a = Auction.fromCalls('N', ['1S', 'X', 'XX', 'P', 'P', 'P']);
  assert.equal(a.contract.doubled, 2);
  assert.equal(a.contract.declarer, 'N');
  assert.equal(a.contract.bid, '1S');
});

test('新叫品覆盖先前的加倍', () => {
  const a = Auction.fromCalls('N', ['1S', 'X', '2S', 'P', 'P', 'P']);
  assert.equal(a.contract.bid, '2S');
  assert.equal(a.contract.doubled, 0);
});

test('非法叫品必须抛错，不能静默接受', () => {
  const a = Auction.fromCalls('N', ['1S']);
  assert.throws(() => a.add('1H'));
  assert.throws(() => a.add('XX'));
  const done = Auction.fromCalls('N', ['1S', 'P', 'P', 'P']);
  assert.throws(() => done.add('2S'), '叫牌结束后不能再叫');
});

test('lenient 模式读取存档不抛错（脏数据也能渲染）', () => {
  const a = Auction.fromEntries('N', [{ seat: 'N', bid: '1S' }, { seat: 'E', bid: '1H' }]);
  assert.equal(a.calls.length, 2);
});

test('最低合法阶：1S 之上的 3H 是扣叫的最低阶', () => {
  const a = Auction.fromCalls('N', ['1S']);
  assert.equal(C.lowestLegalLevel('1S', 'H'), 2);
  assert.equal(C.lowestLegalLevel('2H', 'H'), 3);
  assert.equal(C.lowestLegalLevel(null, 'C'), 1);
});
