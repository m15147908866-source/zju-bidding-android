'use strict';
/* core/rules.test.js — 形态匹配、语境索引、说明与答叫查询（node --test） */
const test = require('node:test');
const assert = require('node:assert');
const { Auction } = require('./auction.js');
const R = require('./rules.js');
const X = require('./context.js');

function store(rules, extra) {
  return R.createStore(Object.assign({ rules: rules || [], notes: [], conventions: [], answers: {} }, extra || {}));
}
const a = (calls, dealer) => Auction.fromCalls(dealer || 'N', calls);
const F = (form, bid, auction, seat) => R.bidFormMatches(form, bid, auction, seat);

test('bidFormMatches：新花与跳新花', () => {
  const au = a(['1C', 'P']);            // 座位 S，同伴开 1C
  assert.equal(F({ type: 'newSuit' }, '1H', au, 'S'), true);
  assert.equal(F({ type: 'newSuit' }, '2H', au, 'S'), true, 'newSuit 是统称，跳新花也命中；运行时按优先级取更具体的一条');
  assert.equal(F({ type: 'newSuit' }, '2C', au, 'S'), false, '花色已出现');
  assert.equal(F({ type: 'newSuit' }, '1N', au, 'S'), false, '无将不算新花');
  assert.equal(F({ type: 'jumpNewSuit' }, '2H', au, 'S'), true);
  assert.equal(F({ type: 'jumpNewSuit' }, '1H', au, 'S'), false);
  assert.equal(F({ type: 'jumpSuit' }, '2H', au, 'S'), true, 'jumpSuit 是 jumpNewSuit 的兼容别名');
  assert.equal(F({ type: 'newSuit', level: 1 }, '1H', au, 'S'), true);
  assert.equal(F({ type: 'newSuit', level: 1 }, '2H', au, 'S'), false);
});

test('bidFormMatches：加叫家族', () => {
  const au = a(['1C', 'P']);            // 同伴 1C，最低加叫 2C
  assert.equal(F({ type: 'raise' }, '2C', au, 'S'), true);
  assert.equal(F({ type: 'raise' }, '3C', au, 'S'), false);
  assert.equal(F({ type: 'jumpRaise' }, '3C', au, 'S'), true);
  assert.equal(F({ type: 'doubleRaise' }, '4C', au, 'S'), true);
  assert.equal(F({ type: 'tripleRaise' }, '5C', au, 'S'), true);
  assert.equal(F({ type: 'gameRaise' }, '4C', au, 'S'), true);
  assert.equal(F({ type: 'inviteRaise' }, '2D', au, 'S'), true, '2D 是 1C 后的跳叫新花色，同时属于邀叫形态');
  assert.equal(F({ type: 'raise' }, '2D', au, 'S'), false);
});

test('bidFormMatches：再叫自己的花色', () => {
  const au = a(['1H', 'P', '1S', 'P']);  // 座位 N，自己先叫 1H
  assert.equal(F({ type: 'rebidOwn' }, '2H', au, 'N'), true);
  assert.equal(F({ type: 'jumpRebidOwn' }, '3H', au, 'N'), true);
  assert.equal(F({ type: 'jumpRebidOwn' }, '2H', au, 'N'), false);
  assert.equal(F({ type: 'doubleJumpOwn' }, '4H', au, 'N'), true);
  assert.equal(F({ type: 'gameOwn' }, '4H', au, 'N'), true);
  assert.equal(F({ type: 'rebidOwn' }, '2D', au, 'N'), false);
});

test('bidFormMatches：爆裂叫、排除叫与逆叫', () => {
  const sp = a(['1S', 'P']);             // 座位 S，同伴 1S
  assert.equal(F({ type: 'splinter' }, '4C', sp, 'S'), true);
  assert.equal(F({ type: 'splinter' }, '4S', sp, 'S'), false, '将牌花色不是爆裂');
  assert.equal(F({ type: 'splinter' }, '3C', sp, 'S'), false, '少跳一阶');
  assert.equal(F({ type: 'exclusion' }, '5C', sp, 'S'), true);
  assert.equal(F({ type: 'exclusion' }, '4C', sp, 'S'), false);

  const rev = a(['1D', 'P', '1H', 'P']); // 座位 N，自己先 1D，同伴 1H
  assert.equal(F({ type: 'reverse' }, '2S', rev, 'N'), true);
  assert.equal(F({ type: 'reverse' }, '2C', rev, 'N'), false, '低花不是逆叫');
  assert.equal(F({ type: 'reverse' }, '1S', rev, 'N'), false, '逆叫必须在二阶');
  assert.equal(F({ type: 'reverse' }, '3S', rev, 'N'), false);
});

test('bidFormMatches：扣叫只在最低合法阶命中', () => {
  const au = a(['1S', '2H']);            // 座位 S，对手 2H
  assert.equal(F({ type: 'cue' }, '3H', au, 'S'), true);
  assert.equal(F({ type: 'cue' }, '4H', au, 'S'), false, '4H 是跳扣叫，不能算作普通扣叫');
  assert.equal(F({ type: 'cue' }, '3C', au, 'S'), false, '对手没叫过草花');
  assert.equal(F({ type: 'cue' }, 'P', au, 'S'), false);
  assert.equal(R.bidFormMatches(null, '3H', au, 'S'), false);
});

test('findRules：具体叫品优先于形态，形态按具体度排序', () => {
  const base = { seatRole: 'opener', contextKeys: [''], meaning: 'm', source: 's', hcp: { min: 0, max: 37 } };
  const sys = store([
    Object.assign({ id: 'explicit', bid: '2S' }, base),
    Object.assign({ id: 'jumpNew', bidForm: { type: 'jumpNewSuit' } }, base),
    Object.assign({ id: 'jumpGeneric', bidForm: { type: 'jumpSuit' } }, base)
  ]);
  const empty = new Auction('N');
  const hit = R.findRules(sys, empty, 'N', '2S');
  assert.equal(hit.rules.length, 1);
  assert.equal(hit.rules[0].id, 'explicit');
  assert.equal(hit.matched, 3);

  const sys2 = store([
    Object.assign({ id: 'jumpNew', bidForm: { type: 'jumpNewSuit' } }, base),
    Object.assign({ id: 'jumpGeneric', bidForm: { type: 'jumpSuit' } }, base)
  ]);
  assert.equal(R.findRules(sys2, empty, 'N', '2S').rules[0].id, 'jumpNew');
});

test('findRules：通配符语境与 excludeKeys', () => {
  const rule = {
    id: 'w', seatRole: 'responder', contextKeys: ['P:*'], excludeKeys: ['P:2C'],
    bid: '2D', meaning: 'm', source: 's', hcp: { min: 0, max: 37 }
  };
  const sys = store([rule]);
  const normal = a(['1C', 'P']);          // 座位 S，同伴开 1C
  assert.equal(R.findRules(sys, normal, 'S', '2D').rules[0].id, 'w');

  const excluded = a(['2C', 'P'], 'S');   // 座位 N，同伴开 2C
  const hit = R.findRules(sys, excluded, 'N', '2D');
  assert.deepEqual(hit.rules, []);
  assert.equal(hit.matched, 0);
});

test('findNotes：按角色、语境与叫品过滤', () => {
  const sys = store([], {
    notes: [
      { id: 'n1', contextKeys: [''], text: '通用' },
      { id: 'n2', contextKeys: [''], bids: ['1S'], text: '只讲 1S' },
      { id: 'n3', seatRole: 'responder', contextKeys: [''], text: '应叫人' }
    ]
  });
  const empty = new Auction('N');
  const all = R.findNotes(sys, empty, 'N', null).map((n) => n.id);
  assert.deepEqual(all, ['n1']);
  const withBid = R.findNotes(sys, empty, 'N', '1S').map((n) => n.id);
  assert.deepEqual(withBid, ['n1', 'n2']);
});

test('findAnswer：真实轮转下识别黑木并返回答叫表', () => {
  const sys = store([], {
    answers: { blackwood: { '5C': [{ meaning: '0 或 3 个 A', source: 's' }] } }
  });
  const au = a(['1S', 'P', '4N', 'P']);   // 同伴 S 叫 4NT，上家 Pass，轮到我（N）
  const ans = R.findAnswer(sys, au, 'N', '5C');
  assert.ok(ans);
  assert.equal(ans.askType, 'blackwood');
  assert.equal(ans.rows.length, 1);
  assert.equal(R.findAnswer(sys, au, 'N', '5D'), null);
  assert.equal(R.findAnswer(sys, au, 'N', 'P'), null);
});

test('findConventionFallback：无将开叫后的 4NT 不再提示黑木', () => {
  const conv = { bid: '4N', title: '黑木', ask: '4NT 问 A', meaning: '问 A 个数', rows: [['5C', '0 或 3']] };
  const gerber = { bid: '4C', title: '盖伯', ask: '4C 问 A', meaning: '问 A 个数', rows: [['4D', '0 或 3']] };
  const sys = store([], { conventions: [conv, gerber] });

  const natural = a(['1S', 'P']);
  assert.ok(R.findConventionFallback(sys, natural, 'S', '4N'), '非无将开叫时 4NT 提示黑木');
  assert.equal(R.findConventionFallback(sys, natural, 'S', '4C'), null);

  const nt = a(['1N', 'P']);
  assert.equal(R.findConventionFallback(sys, nt, 'S', '4N'), null);
  assert.ok(R.findConventionFallback(sys, nt, 'S', '4C'), '1NT 开叫后的 4C 提示盖伯');
});

/* ---------------- 配合争叫 / 负加倍 / 通则兜底 ---------------- */

test('advancer：同伴争叫后的加叫与扣叫走 advancer 桶', () => {
  const sys = store([
    { id: 'adv.raise', seatRole: 'advancer', contextKeys: ['O:* P:1S'], bidForm: { type: 'raise' },
      meaning: '加叫同伴的争叫', source: 's', recommendable: true },
    { id: 'adv.cue', seatRole: 'advancer', contextKeys: ['O:* P:1S'], bidForm: { type: 'cue' },
      meaning: '扣叫：唯一逼叫', source: 's', recommendable: true }
  ]);
  const au = a(['1H', '1S', 'P']);          // 对手 1♥、同伴 1♠、上家 Pass，轮到我（W）
  assert.equal(X.roleOfKey(X.contextKey(au, 'W')), 'advancer');

  const raise = R.findRules(sys, au, 'W', '2S');
  assert.equal(raise.rules.length, 1);
  assert.equal(raise.rules[0].id, 'adv.raise');
  assert.equal(raise.generic, false);

  const cue = R.findRules(sys, au, 'W', '2H');
  assert.equal(cue.rules[0].id, 'adv.cue');
});

test('负加倍：同伴开叫、上家争叫后的 X 命中 responder 规则', () => {
  const sys = store([
    { id: 'negdbl', seatRole: 'responder', contextKeys: ['P:1C O:1D'], bid: 'X',
      meaning: '负加倍：6 点以上，未叫花色有一门 4 张', source: 's', recommendable: false }
  ]);
  const au = a(['1C', '1D']);               // 同伴开 1♣、上家争 1♦，轮到我（S）
  assert.equal(X.roleOfKey(X.contextKey(au, 'S')), 'responder');
  const hit = R.findRules(sys, au, 'S', 'X');
  assert.equal(hit.rules.length, 1);
  assert.equal(hit.rules[0].id, 'negdbl');
  assert.equal(hit.generic, false, '负加倍是具体条目，不应标记为通则');
});

test('通则兜底：具体条目缺失时才回落到 generic 桶', () => {
  const sys = store([
    { id: 'open.1c', seatRole: 'opener', contextKeys: [''], bid: '1C',
      meaning: '1♣ 开叫', source: 's', recommendable: true },
    { id: 'gen.rebidOwn', seatRole: 'opener', generic: true, bidForm: { type: 'rebidOwn' },
      meaning: '通则：低限再叫原花', source: 'ACBL SAYC 手册 · 再叫三档通则', recommendable: false }
  ]);

  // 1♣—P—1♥—P 之后开叫方再叫 2♣：没有具体条目 → 走通则
  const au = a(['1C', 'P', '1H', 'P']);
  const fb = R.findRules(sys, au, 'N', '2C');
  assert.equal(fb.rules.length, 1);
  assert.equal(fb.rules[0].id, 'gen.rebidOwn');
  assert.equal(fb.generic, true, '应标记为通则');

  // 开叫本身有具体条目 → 不回落
  const open = R.findRules(sys, a([]), 'N', '1C');
  assert.equal(open.rules[0].id, 'open.1c');
  assert.equal(open.generic, false);
});
