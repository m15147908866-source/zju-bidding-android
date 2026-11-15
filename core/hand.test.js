'use strict';
/* core/hand.test.js — 手牌统计、牌型与约束（node --test） */
const test = require('node:test');
const assert = require('node:assert');
const H = require('./hand.js');

test('fromCards：逐张牌统计 HCP 与花色张数', () => {
  const st = H.fromCards(['SA', 'SK', 'HQ', 'DJ', 'S2', 'H3', 'D4', 'C5']);
  assert.equal(st.hcp, 10);
  assert.equal(st.S, 3);
  assert.equal(st.H, 2);
  assert.equal(st.D, 2);
  assert.equal(st.C, 1);
  assert.equal(st.cards.length, 8);
});

test('fromCards：小写与非法花色不崩溃', () => {
  const st = H.fromCards(['sa', 'hK', 'X7', null, undefined]);
  assert.equal(st.hcp, 7);          // A=4 + K=3，X7 不计
  assert.equal(st.S, 1);
  assert.equal(st.H, 1);
  assert.equal(st.D + st.C, 0);
});

test('shapeOf：三种均型', () => {
  assert.equal(H.shapeOf({ S: 4, H: 3, D: 3, C: 3 }).balanced, true);
  assert.equal(H.shapeOf({ S: 4, H: 4, D: 3, C: 2 }).balanced, true);
  assert.equal(H.shapeOf({ S: 5, H: 3, D: 3, C: 2 }).balanced, true);
  ['5-4-3-1', '6-5-2-0', '7-3-2-1', '5-5-2-1'].forEach((text, i) => {
    const shapes = [{ S: 5, H: 4, D: 3, C: 1 }, { S: 6, H: 5, D: 2, C: 0 },
      { S: 7, H: 3, D: 2, C: 1 }, { S: 5, H: 5, D: 2, C: 1 }];
    assert.equal(H.shapeOf(shapes[i]).balanced, false, text);
    assert.equal(H.shapeOf(shapes[i]).text, text);
  });
});

test('shapeOf：单缺取最短花色，缺门优先于单张', () => {
  assert.equal(H.shapeOf({ S: 5, H: 4, D: 3, C: 1 }).shortage, 'C');
  assert.equal(H.shapeOf({ S: 5, H: 4, D: 0, C: 1 }).shortage, 'D');
  assert.equal(H.shapeOf({ S: 5, H: 4, D: 2, C: 2 }).shortage, null);
  assert.equal(H.shapeOf({ S: 5, H: 4, D: 0, C: 0 }).total, 9);
});

test('isComplete：四门齐全且合计 13 张', () => {
  assert.equal(H.isComplete({ S: 4, H: 3, D: 3, C: 3 }), true);
  assert.equal(H.isComplete({ S: 4, H: 3, D: 3, C: 2 }), false);
  assert.equal(H.isComplete({ S: 4, H: 3, D: 3 }), false);
});

test('fitsShape：无约束返回 null，空对象也算无约束', () => {
  const hand = { hcp: 10, S: 4, H: 3, D: 3, C: 3 };
  assert.strictEqual(H.fitsShape(null, hand), null);
  assert.strictEqual(H.fitsShape({}, hand), null);
});

test('fitsShape：均型与单缺', () => {
  const flat = { hcp: 10, S: 4, H: 3, D: 3, C: 3 };
  assert.strictEqual(H.fitsShape({ balanced: true }, flat), true);
  assert.strictEqual(H.fitsShape({ balanced: false }, flat), false);
  const short = { hcp: 10, S: 5, H: 4, D: 3, C: 1 };
  assert.strictEqual(H.fitsShape({ shortage: 'C' }, short), true);
  assert.strictEqual(H.fitsShape({ shortage: 'S' }, short), false);
  assert.strictEqual(H.fitsShape({ shortage: 'any' }, short), true);
  assert.strictEqual(H.fitsShape({ shortage: 'any' }, flat), false);
});

test('fitsShape：suitMin / suitMax，bid 使用当前叫品花色', () => {
  const hand = { hcp: 10, S: 5, H: 3, D: 3, C: 2 };
  assert.strictEqual(H.fitsShape({ suitMin: { S: 5 } }, hand, 'S'), true);
  assert.strictEqual(H.fitsShape({ suitMin: { bid: 5 } }, hand, 'S'), true);
  assert.strictEqual(H.fitsShape({ suitMin: { bid: 5 } }, hand, 'H'), false);
  assert.strictEqual(H.fitsShape({ suitMax: { C: 2 } }, hand, 'S'), true);
  assert.strictEqual(H.fitsShape({ suitMax: { C: 1 } }, hand, 'S'), false);
  assert.strictEqual(H.fitsShape({ suitMin: { bid: 1 } }, hand, null), false, '拿不到叫品花色时应判为不匹配');
});

test('fitsShape：多个条件同时满足才算命中', () => {
  const hand = { hcp: 16, S: 5, H: 3, D: 3, C: 2 };
  assert.strictEqual(H.fitsShape({ balanced: true, suitMin: { S: 5 } }, hand), true);
  assert.strictEqual(H.fitsShape({ balanced: true, suitMin: { S: 6 } }, hand), false);
  assert.strictEqual(H.fitsShape({ balanced: false, suitMin: { S: 5 } }, hand), false);
});

test('fitsHcp：缺 min 视为无约束；缺 max 默认 37', () => {
  assert.strictEqual(H.fitsHcp(null, 12), null);
  assert.strictEqual(H.fitsHcp({}, 12), null);
  assert.strictEqual(H.fitsHcp({ min: 20 }, 25), true);
  assert.strictEqual(H.fitsHcp({ min: 20 }, 19), false);
  assert.strictEqual(H.fitsHcp({ min: 0, max: 37 }, 37), true);
});
