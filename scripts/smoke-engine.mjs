#!/usr/bin/env node
/* ============================================================================
   scripts/smoke-engine.mjs — 在 Node 里加载 engine.js（浏览器脚本）做适配层冒烟测试
   目的：不启动浏览器就能验证「UI 旧接口 → core」这一层的结算、合法集、语境、
   推荐、答叫表、体系切换与存档往返。
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const BC = {};
for (const f of ['calls', 'auction', 'context', 'hand', 'rules', 'recommend']) {
  Object.assign(BC, require(path.join(ROOT, 'core', f + '.js')));
}
const BridgeData = require(path.join(ROOT, 'data/bridge-data.js'));

/* 内存版 localStorage：engine.js 在 Node 里回落到它，用来验证存档往返 */
const mem = {};
const localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; }
};

const ctx = vm.createContext({
  BridgeCore: BC,
  BridgeData,
  console,
  localStorage,
  setTimeout,
  clearTimeout
});
vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8'), ctx, { filename: 'engine.js' });

const ev = (code) => vm.runInContext(code, ctx);
let failed = 0;
function ok(name, cond, extra) {
  if (cond) console.log('✔ ' + name);
  else { failed++; console.log('✖ ' + name + (extra ? '  → ' + extra : '')); }
}

const bd = (dealer, calls) => ({
  dealer,
  auction: calls.map((b, i) => ({ seat: 'NESW'[( 'NESW'.indexOf(dealer) + i) % 4], bid: b })),
  done: false, result: null, snap: []
});
const J = JSON.stringify;

/* 1. 编码与展示 */
ok('bidLabel 1NT', ev("bidLabel('1NT')") === '1NT');
ok('bidLabel PASS', ev("bidLabel('PASS')") === 'Pass');
ok('bidStrain 2NT', ev("bidStrain('2NT')") === 'NT');
ok('bidLevel 3H', ev("bidLevel('3H')") === 3);
ok('bidHtml 含花色符号', ev("bidHtml('1S')").includes('♠'));

/* 2. 结算（审计 P0-1：庄家取同阵营最早叫出该花色的人） */
const settled = ev("contractInfo(" + J(bd('N', ['1C', 'PASS', '1H', 'PASS', '1S', 'PASS', '4S', 'PASS', 'PASS', 'PASS'])) + ")");
ok('定约 4S', settled.bid === '4S', J(settled));
ok('庄家是北（最早叫黑桃）', settled.seat === 'N', J(settled));
const passedOut = ev("contractInfo(" + J(bd('N', ['PASS', 'PASS', 'PASS', 'PASS'])) + ")");
ok('四家 Pass 无定约', passedOut.passed === true);

/* 2b. 加倍 / 再加倍（Laws 2017 Law 19C：新叫品覆盖先前的加倍） */
const doubled = ev("contractInfo(" + J(bd('N', ['1S', 'X', 'PASS', 'PASS', 'PASS'])) + ")");
ok('1S-X 定约被加倍，庄家仍是北', doubled.bid === '1S' && doubled.doubled === 1 && doubled.dbl === 'X' && doubled.seat === 'N', J(doubled));
const redoubled = ev("contractInfo(" + J(bd('N', ['1S', 'X', 'XX', 'PASS', 'PASS', 'PASS'])) + ")");
ok('1S-X-XX 再加倍', redoubled.doubled === 2 && redoubled.dbl === 'XX' && redoubled.seat === 'N', J(redoubled));
const overwritten = ev("contractInfo(" + J(bd('N', ['1S', 'X', '2H', 'PASS', 'PASS', 'PASS'])) + ")");
ok('新叫品 2H 覆盖加倍', overwritten.bid === '2H' && overwritten.doubled === 0 && overwritten.seat === 'S', J(overwritten));

/* 3. 加倍规则：同方不能加倍 */
const setS = ev("Array.from(legalSet(" + J(bd('N', ['1S', 'PASS'])) + ", 'S'))");
ok('南家不能加倍同伴的 1S', !setS.includes('X'), setS.join(','));
const setW = ev("Array.from(legalSet(" + J(bd('N', ['1S', 'PASS', 'PASS'])) + ", 'W'))");
ok('西家可以加倍 1S', setW.includes('X'));

/* 4. 语境：1S-(2H)-3H 不再被当成「强跳新花」，数据没有收录就如实报缺 */
const cue = ev("lookupRules(" + J(bd('N', ['1S', '2H'])) + ", 'S', '3H')");
ok('1S-(2H)-3H 不会被误判成新花规则', cue.found === false, J(cue.rules));
ok('语境键正确', cue.ctx.key === 'P:1S O:2H', cue.ctx.key);

/* 4b. 真正收录了的扣叫：对手开 1S，第二家扣 2S = 迈克尔斯 */
const michael = ev("lookupRules(" + J(bd('N', ['1S'])) + ", 'E', '2S')");
ok('2S 扣叫命中迈克尔斯', michael.found && /迈克尔斯/.test(michael.rules[0].d), J(michael.rules));

/* 5. 推荐：0 点不会推荐扣叫 / 6 点不会推荐黑木 */
ev("state.hand = { hcp: 0, S: 3, H: 3, D: 3, C: 4 }");
const rec0 = ev("recommendFor(" + J(bd('N', ['1S', '2H'])) + ", 'S')");
ok('0 点无候选或候选合法', rec0.every((c) => !/^[2-7]S$/.test(c.bid)), rec0.map((c) => c.bid).join(','));
ev("state.hand = { hcp: 6, S: 3, H: 4, D: 3, C: 3 }");
const rec6 = ev("recommendFor(" + J(bd('N', ['1S', 'PASS'])) + ", 'S')");
ok('6 点不推荐 4NT', !rec6.some((c) => c.bid === '4NT'), rec6.map((c) => c.bid).join(','));

/* 6. 黑木 / 盖伯：真实轮转（最后一口是对手的 Pass，答叫方复盘） */
const bw = ['1S', 'PASS', '3S', 'PASS', '4NT', 'PASS'];
const ans = ev("lookupRules(" + J(bd('N', bw)) + ", 'S', '5C')");
ok('4NT 后 5C 命中答叫表', ans.ctx.type === 'answer' && ans.rules.length > 0, J(ans.ctx));
const bwK = ['1S', 'PASS', '3S', 'PASS', '4NT', 'PASS', '5C', 'PASS', '5NT', 'PASS'];
const ansK = ev("lookupRules(" + J(bd('N', bwK)) + ", 'S', '6C')");
ok('5NT 后 6C 命中 K 问叫答叫表', ansK.ctx.type === 'answer' && ansK.ctx.askType === 'blackwoodK', J(ansK.ctx));
const gerber = ev("lookupRules(" + J(bd('N', ['1NT', 'PASS', '4C', 'PASS'])) + ", 'N', '4D')");
ok('1NT—4C 后 4D 命中盖伯答叫表', gerber.ctx.type === 'answer' && gerber.ctx.askType === 'gerber', J(gerber.ctx));
const quant = ev("lookupRules(" + J(bd('N', ['1NT', 'PASS', '4NT', 'PASS'])) + ", 'S', '5C')");
ok('1NT—4NT 是定量邀叫，不套黑木答叫表', quant.ctx.type !== 'answer', J(quant.ctx));

/* 7. 三套体系：切换、体系卡、推荐合法性 */
for (const key of ['sayc', 'zju', 'xinrui']) {
  const switched = ev("useSystem(" + J(key) + ")");
  ok(key + ' 体系可切换', switched === true && ev('state.system') === key);
  const card = ev('systemCard()');
  ok(key + ' 体系卡非空且含开叫', card.length > 2000 && card.includes('开叫'), String(card.length));
  ev("state.hand = { hcp: 13, S: 4, H: 3, D: 3, C: 3 }");
  const rec = ev("recommendFor(" + J(bd('N', ['1S', 'PASS'])) + ", 'S')");
  const legal = ev("Array.from(legalSet(" + J(bd('N', ['1S', 'PASS'])) + ", 'S'))");
  ok(key + ' 推荐非空且全部合法', rec.length > 0 && rec.every((c) => legal.includes(c.bid)),
    rec.map((c) => c.bid).join(','));
}

/* 7c. 体系卡按语境裁剪：默认切片明显短于整卡，且仍覆盖当前语境 */
for (const key of ['sayc', 'zju', 'xinrui']) {
  ev("useSystem(" + J(key) + ")");
  const full = ev('systemCard({ full: true })');
  const slice = ev("systemCard({ auction: bdAuction(" + J(bd('N', ['1S', 'PASS'])) + "), seat: 'S' })");
  ok(key + ' 体系卡按语境裁剪', slice.length > 200 && slice.length < full.length * 0.85,
    slice.length + ' / ' + full.length);
  ok(key + ' 裁剪卡保留当前语境', slice.includes('【本卡范围】') && slice.includes('应叫方') && slice.includes('1♠'),
    slice.slice(0, 120));
}

/* 7b. 人为约定叫的 Alert 标记必须送到界面 */
ev("useSystem('xinrui')");
const alertRule = ev("lookupRules(" + J(bd('N', ['1NT', 'PASS'])) + ", 'S', '2C')");
ok('新睿 1NT—2C 斯台曼带 alert 标记', alertRule.rules.some((r) => r.alert === true),
  J(alertRule.rules));

/* 8. 说明条目可达：斯台曼 / 转移后续应当出现在对应语境 */
ev("useSystem('sayc')");
const stayNote = ev("lookupRules(" + J(bd('N', ['1NT', 'PASS', '2C', 'PASS', '2D'])) + ", 'S', '2NT')");
ok('斯台曼后续说明可达', stayNote.notes.some((n) => /2NT 邀局/.test(n.text)), J(stayNote.notes));
const trNote = ev("lookupRules(" + J(bd('N', ['1NT', 'PASS', '2D', 'PASS', '2H'])) + ", 'S', '2NT')");
ok('转移后续说明可达', trNote.notes.some((n) => /转移完成后/.test(n.text)), J(trNote.notes));

/* 9. 存档往返：牌局、体系、手牌、座位、选项都要还原 */
ev("state.boards = " + J([bd('E', ['1D', 'PASS', '1S', 'PASS', '3NT', 'PASS', 'PASS', 'PASS'])]) + ";" +
  "state.system = 'zju'; state.mySeat = 'E'; state.hideIllegal = false;" +
  "state.hand = { hcp: 9, S: 4, H: 3, D: 3, C: 3 }; save();");
const savedRaw = mem['sayc_v3'];
ok('save 写入存档', typeof savedRaw === 'string' && savedRaw.includes('"zju"'), String(savedRaw && savedRaw.length));
ev("state.boards = []; state.system = 'sayc'; state.mySeat = 'N'; state.hideIllegal = true;" +
  "state.hand = { hcp: 0, S: 0, H: 0, D: 0, C: 0 };");
const loaded = ev('load()');
ok('load 成功', loaded === true);
ok('牌局还原为 3NT', ev("contractInfo(board()).bid") === '3NT' && ev("board().dealer") === 'E',
  ev("JSON.stringify(contractInfo(board()))"));
ok('体系 / 座位 / 选项 / 手牌还原',
  ev('state.system') === 'zju' && ev('state.mySeat') === 'E' &&
  ev('state.hideIllegal') === false && ev('state.hand.hcp') === 9,
  ev("JSON.stringify({s:state.system,seat:state.mySeat,hide:state.hideIllegal,hcp:state.hand.hcp})"));
ev('useSystem(state.system)');
ok('还原后体系索引同步', ev('$sys.key') === 'zju', ev('$sys && $sys.key'));

/* 10. 脏存档不崩溃（lenient）：存档里塞非法叫品仍能渲染 */
mem['sayc_v3'] = JSON.stringify({ board: bd('N', ['1S', '1S', 'XX', 'PASS']), system: 'sayc' });
ok('脏存档 load 不抛错', ev('load()') === true);
ok('脏存档仍能出具语境', typeof ev("lookupRules(board(), 'E', '2H').ctx.key") === 'string');

console.log(failed ? `\n${failed} 项失败` : '\n全部通过');
process.exit(failed ? 1 : 0);
