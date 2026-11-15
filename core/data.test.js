'use strict';
/* core/data.test.js — 规则数据的结构、可达性与推荐契约（node --test） */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const C = require('./calls.js');
const X = require('./context.js');
const R = require('./rules.js');
const Rec = require('./recommend.js');
const { Auction } = require('./auction.js');
const H = require('./hand.js');

const ROOT = path.resolve(__dirname, '..');
const KEYS = ['sayc', 'zju', 'xinrui'];
const FORMS = new Set(['newSuit', 'jumpNewSuit', 'jumpSuit', 'raise', 'jumpRaise',
  'doubleRaise', 'tripleRaise', 'gameRaise', 'inviteRaise', 'rebidOwn', 'jumpRebidOwn',
  'doubleJumpOwn', 'gameOwn', 'splinter', 'exclusion', 'reverse', 'cue']);
const ROLES = new Set(['opener', 'responder', 'overcaller', 'advancer']);

const raw = {};
KEYS.forEach((k) => {
  raw[k] = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/rules', `${k}.json`), 'utf8'));
});
const built = require(path.join(ROOT, 'data/bridge-data.js'));
const stores = {};
built.systems.forEach((s) => { stores[s.key] = R.createStore(s); });

/** 由 contextKey 反推一个「刚好轮到我」的叫牌过程（与校验脚本同源） */
function auctionForKey(key) {
  if (!key) return { dealer: 'N', calls: [], seat: 'N' };
  const toks = key.split(' ');
  const firstRel = toks[0].charAt(0);
  const dealer = firstRel === 'M' ? 'N' : firstRel === 'P' ? 'S' : 'E';
  const seat = 'N';
  const calls = [];
  let next = dealer;
  for (const tok of toks) {
    const rel = tok.charAt(0);
    const call = tok.slice(2);
    let guard = 0;
    while (X.relOf(next, seat) !== rel) {
      if (++guard > 4) throw new Error(`无法排列语境：${key}`);
      calls.push('P');
      next = C.NEXT[next];
    }
    calls.push(call);
    next = C.NEXT[next];
  }
  return { dealer, calls, seat };
}

function auctionOf(entry) {
  return Auction.fromCalls(entry.dealer, entry.calls);
}

test('生成物与源数据一致，版本号来自 VERSION', () => {
  const version = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();
  assert.equal(built.version, version);
  assert.deepEqual(built.systems.map((s) => s.key).sort(), [...KEYS].sort());
  for (const key of KEYS) {
    const sys = built.systems.find((s) => s.key === key);
    assert.equal(sys.rules.length, raw[key].length, `${key} 规则条数与 JSON 不一致`);
    assert.ok(sys.name && sys.name.length, `${key} 缺少名称`);
    assert.ok(sys.blurb && sys.blurb.length, `${key} 缺少简介`);
  }
});

test('规则结构：必填字段、id 唯一、叫品与形态二选一', () => {
  for (const key of KEYS) {
    const ids = new Set();
    for (const r of raw[key]) {
      assert.ok(!ids.has(r.id), `${key} id 重复：${r.id}`);
      ids.add(r.id);
      assert.equal(r.system, key);
      assert.ok(ROLES.has(r.seatRole), `${r.id} seatRole 非法：${r.seatRole}`);
      assert.ok(Array.isArray(r.contextKeys) && r.contextKeys.length, `${r.id} 缺少 contextKeys`);
      assert.ok(r.meaning && r.meaning.length, `${r.id} 缺少 meaning`);
      assert.ok(r.source && r.source.length, `${r.id} 缺少 source`);
      assert.equal(typeof r.recommendable, 'boolean', `${r.id} recommendable 必须是布尔`);

      if (r.bid) {
        assert.equal(C.normalizeCall(r.bid), r.bid, `${r.id} 叫品未规范化：${r.bid}`);
        assert.equal(r.bidForm, undefined, `${r.id} 不能同时有 bid 与 bidForm`);
      } else {
        assert.ok(r.bidForm && FORMS.has(r.bidForm.type), `${r.id} 形态非法`);
      }

      if (r.hcp) {
        const { min, max } = r.hcp;
        assert.ok(Number.isInteger(min) && min >= 0 && min <= 37, `${r.id} hcp.min 非法`);
        assert.ok(Number.isInteger(max) && max >= 0 && max <= 37, `${r.id} hcp.max 非法`);
        assert.ok(min <= max, `${r.id} hcp 区间倒置`);
      }
      if (r.shape) {
        assert.equal(typeof r.shape, 'object');
      }
      for (const k of r.contextKeys) {
        for (const seg of k.split(' ')) {
          if (!seg) continue;
          const call = seg.slice(2);
          if (call === '*') continue;
          if (/^[1-7]\*$/.test(call)) continue;
          assert.equal(C.normalizeCall(call), call, `${r.id} 语境叫品未规范化：${seg}`);
        }
      }
    }
  }
});

test('规则与说明的 id 全局唯一，说明角色与语境一致', () => {
  const ids = new Set();
  for (const key of KEYS) {
    const sys = built.systems.find((s) => s.key === key);
    for (const r of sys.rules) {
      assert.ok(!ids.has(r.id), `规则 id 重复：${r.id}`);
      ids.add(r.id);
    }
    for (const n of sys.notes || []) {
      assert.ok(!ids.has(n.id), `说明 id 重复：${n.id}`);
      ids.add(n.id);
      assert.ok(n.text && n.text.length, `${n.id} 缺少正文`);
      assert.ok(Array.isArray(n.contextKeys) && n.contextKeys.length, `${n.id} 缺少语境`);
      if (n.seatRole) {
        assert.equal(n.seatRole, X.roleOfKey(n.contextKeys[0]), `${n.id} seatRole 与语境不符`);
      }
    }
    for (const c of sys.conventions || []) {
      assert.ok(!ids.has(c.id), `约定 id 重复：${c.id}`);
      ids.add(c.id);
      assert.ok(c.title && c.ask && c.meaning, `${c.id} 约定内容不完整`);
      assert.ok(Array.isArray(c.rows), `${c.id} rows 必须是数组`);
      if (!c.rows.length) {
        // 来源只给原则、未列答叫表：必须有 note 说明，避免静默留白
        assert.ok(c.note && c.note.length, `${c.id} 没有答叫行时必须给出说明`);
      } else {
        for (const row of c.rows) {
          assert.ok(Array.isArray(row) && row.length === 2 && row[0] && row[1],
            `${c.id} 答叫行格式错误：${JSON.stringify(row)}`);
        }
      }
    }
  }
});

test('每条具体叫品规则都能被 findRules 查到（语境可达）', () => {
  for (const key of KEYS) {
    const store = stores[key];
    for (const r of raw[key]) {
      if (!r.bid) continue;
      for (const ctxKey of r.contextKeys) {
        if (ctxKey.includes('*')) continue;
        const entry = auctionForKey(ctxKey);
        const au = auctionOf(entry);
        const hit = R.findRules(store, au, entry.seat, r.bid);
        assert.ok(hit.rules.length, `${r.id} 在 ${ctxKey} 查不到`);
        assert.equal(hit.rules[0].id, r.id, `${r.id} 在 ${ctxKey} 被 ${hit.rules[0].id} 遮蔽`);
      }
    }
  }
});

test('每条形态规则至少能命中一个合法叫品（无死规则）', () => {
  for (const key of KEYS) {
    for (const r of raw[key]) {
      if (!r.bidForm) continue;
      const literal = r.contextKeys.filter((k) => !k.includes('*'));
      if (!literal.length) continue;          // 通配语境无法静态展开
      let matched = false;
      for (const ctxKey of literal) {
        const entry = auctionForKey(ctxKey);
        const au = auctionOf(entry);
        if (au.complete) continue;
        if (au.legalCalls().some((b) => R.bidFormMatches(r.bidForm, b, au, entry.seat))) {
          matched = true;
          break;
        }
      }
      assert.ok(matched, `${r.id} 的形态 ${r.bidForm.type} 在 ${literal[0]} 下没有合法叫品`);
    }
  }
});

test('黑木 / 盖伯答叫表的每个键在当前序列都合法', () => {
  const cases = {
    blackwood: { calls: ['1S', 'P', '4N', 'P'], seat: 'N' },
    blackwoodK: { calls: ['1S', 'P', '4N', 'P', '5C', 'P', '5N', 'P'], seat: 'N' },
    gerber: { calls: ['1N', 'P', '4C', 'P'], seat: 'N' },
    gerberK: { calls: ['1N', 'P', '4C', 'P', '4D', 'P', '5C', 'P'], seat: 'N' }
  };
  for (const key of KEYS) {
    const store = stores[key];
    const answers = store.system.answers || {};
    for (const [askType, table] of Object.entries(answers)) {
      const c = cases[askType];
      assert.ok(c, `${key} 出现未知答叫类型：${askType}`);
      const au = Auction.fromCalls('N', c.calls);
      assert.equal(X.detectAsk(au, c.seat), askType, `${key} ${askType} 未被识别`);
      const legal = new Set(au.legalCalls());
      for (const bid of Object.keys(table)) {
        assert.ok(legal.has(bid), `${key} ${askType} 的 ${bid} 在当前序列不合法`);
        const ans = R.findAnswer(store, au, c.seat, bid);
        assert.ok(ans && ans.askType === askType, `${key} ${askType} 查不到 ${bid}`);
        for (const row of ans.rows) {
          assert.ok(row.meaning && row.meaning.length, `${key} ${askType} ${bid} 的答叫缺少解释`);
        }
      }
    }
  }
});

/* ---------------- 推荐契约（确定性随机抽样） ---------------- */
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function randomHand(rand) {
  const shapes = [0, 0, 0, 0];
  for (let i = 0; i < 13; i++) shapes[Math.floor(rand() * 4)]++;
  return {
    hcp: Math.floor(rand() * 38),
    S: shapes[0], H: shapes[1], D: shapes[2], C: shapes[3]
  };
}

test('推荐契约：候选合法、约束齐全、按分数降序且不重复', () => {
  for (const key of KEYS) {
    const store = stores[key];
    const rand = lcg(20261116);
    for (let round = 0; round < 120; round++) {
      const calls = [];
      for (let step = 0; step < 6; step++) {
        const au = Auction.fromCalls('N', calls);
        if (au.complete) break;
        const legal = au.legalCalls();
        if (!legal.length) break;
        calls.push(legal[Math.floor(rand() * legal.length)]);
      }
      const au = Auction.fromCalls('N', calls);
      if (au.complete) continue;
      const seat = au.position;
      const legal = new Set(au.legalCalls());
      const hand = randomHand(rand);
      const res = Rec.recommend(store, au, seat, hand);
      const list = res.candidates;
      assert.equal(res.total, list.length);
      const seen = new Set();
      let lastScore = Infinity;
      for (const it of list) {
        assert.ok(legal.has(it.bid), `${key} 推荐了非法叫品 ${it.bid}（${calls.join(' ')}）`);
        assert.ok(!seen.has(it.bid), `${key} 同一叫品被推荐多次：${it.bid}`);
        seen.add(it.bid);
        assert.ok(it.rule && it.rule.id, `${key} 候选缺少规则来源`);
        assert.ok(it.rule.hcp || it.rule.shape, `${key} ${it.rule.id} 没有任何硬约束却进入推荐`);
        assert.notEqual(it.rule.recommendable, false, `${key} ${it.rule.id} 不可推荐`);
        assert.ok(it.score <= lastScore, `${key} 推荐未按分数降序`);
        lastScore = it.score;
      }

      // 手牌为空时只解释、不推荐
      assert.deepEqual(Rec.recommend(store, au, seat, null).candidates, []);
      // 与 fitsHcp/fitsShape 的契约一致
      for (const it of list) {
        assert.notEqual(H.fitsHcp(it.rule.hcp, hand), false, `${key} ${it.rule.id} 点力不符`);
        assert.notEqual(H.fitsShape(it.rule.shape, hand, it.bid), false, `${key} ${it.rule.id} 牌型不符`);
      }
    }
  }
});

/* ---------------- 开叫张数约束（说明里明写的张数必须落到 shape） ---------------- */
test('开叫规则的张数约束来自原说明', () => {
  const requireSuit = {
    sayc: { '1C': ['C', 3], '1D': ['D', 3], '1H': ['H', 5], '1S': ['S', 5] },
    zju: { '1C': ['C', 3], '1D': ['D', 3], '1H': ['H', 5], '1S': ['S', 5], '2H': ['H', 6], '2S': ['S', 6] },
    xinrui: { '1C': ['C', 3], '1D': ['D', 3], '1H': ['H', 5], '1S': ['S', 5] }
  };
  for (const key of KEYS) {
    const opens = raw[key].filter((r) => r.contextKeys.length === 1 && r.contextKeys[0] === '');
    for (const [bid, [suit, n]] of Object.entries(requireSuit[key])) {
      const rule = opens.find((r) => r.bid === bid);
      assert.ok(rule, `${key} 缺少开叫 ${bid}`);
      assert.ok(rule.shape && rule.shape.suitMin && rule.shape.suitMin[suit] >= n,
        `${key} ${bid} 缺少 ${suit} ${n}+ 张约束：${JSON.stringify(rule.shape)}`);
    }
    const nt = opens.find((r) => r.bid === '1N');
    assert.ok(nt && nt.shape && nt.shape.balanced === true, `${key} 1NT 缺少均型约束`);
  }
  // 浙大低花开叫明确要求「无 5 张高花」
  for (const bid of ['1C', '1D']) {
    const rule = raw.zju.find((r) => r.bid === bid && r.contextKeys[0] === '');
    assert.equal(rule.shape.suitMax.H, 4, `zju ${bid} 未排除 5 张红心`);
    assert.equal(rule.shape.suitMax.S, 4, `zju ${bid} 未排除 5 张黑桃`);
  }
});
