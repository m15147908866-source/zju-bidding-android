#!/usr/bin/env node
/* ============================================================================
   scripts/coverage-report.mjs — 规则覆盖率与「未编码说明」清单

   只读 data/bridge-data.js，不修改任何文件。CI 会打印这份报告，
   方便判断新增规则该补哪一段，也方便看清哪些内容仍是说明而不是可推荐规则。
   ========================================================================== */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { systems } = require(path.join(ROOT, 'data/bridge-data.js'));

const SUIT = { C: '♣', D: '♦', H: '♥', S: '♠', N: 'NT' };

/** M:1S P:1N → 我方 1♠ → 同伴 1NT；O:* → 对手 任意 */
function contextText(key) {
  if (!key) return '开叫';
  return key.split(' ').map((t) => {
    const rel = t[0] === 'M' ? '我方 ' : t[0] === 'P' ? '同伴 ' : '对手 ';
    const bid = t.slice(2);
    if (bid === '*') return rel + '任意';
    return rel + bid[0] + (SUIT[bid.slice(1)] || bid.slice(1));
  }).join(' → ');
}

function width(s) {
  let n = 0;
  for (const ch of String(s)) n += /[\u3000-\u9fff]/.test(ch) ? 2 : 1;
  return n;
}
function pad(s, n) {
  return String(s) + ' '.repeat(Math.max(0, n - width(s)));
}

const rows = systems.map((s) => {
  const rules = s.rules || [];
  const rec = rules.filter((r) => r.recommendable !== false).length;
  return {
    key: s.key,
    name: s.name,
    rules: rules.length,
    rec,
    explain: rules.length - rec,
    notes: (s.notes || []).length,
    convs: (s.conventions || []).length,
    answers: Object.keys(s.answers || {}).length
  };
});

const total = rows.reduce((a, r) => ({
  rules: a.rules + r.rules, rec: a.rec + r.rec, explain: a.explain + r.explain,
  notes: a.notes + r.notes, convs: a.convs + r.convs, answers: a.answers + r.answers
}), { rules: 0, rec: 0, explain: 0, notes: 0, convs: 0, answers: 0 });

console.log('规则覆盖率（来源：data/bridge-data.js）\n');
console.log([pad('体系', 14), pad('规则', 6), pad('可推荐', 8), pad('仅解释', 8), pad('说明', 6), pad('约定叫', 8), '答叫表'].join(''));
rows.forEach((r) => {
  console.log([pad(r.name, 14), pad(r.rules, 6), pad(r.rec, 8), pad(r.explain, 8),
    pad(r.notes, 6), pad(r.convs, 8), r.answers].join(''));
});
console.log([pad('合计', 14), pad(total.rules, 6), pad(total.rec, 8), pad(total.explain, 8),
  pad(total.notes, 6), pad(total.convs, 8), total.answers].join(''));
console.log(`\n可推荐占比：${(100 * total.rec / Math.max(1, total.rules)).toFixed(1)}%`);

console.log('\n未编码为规则的语境说明（界面显示说明，不参与推荐）：');
systems.forEach((s) => {
  if (!(s.notes || []).length) return;
  console.log('\n[' + s.name + '] ' + s.notes.length + ' 条');
  s.notes.forEach((n) => {
    const keys = (n.contextKeys || []).map(contextText).join(' ／ ') || '通用';
    console.log('  - ' + keys + '：' + n.text);
  });
});

console.log('\n提示：新增规则请直接改 data/rules/*.json，再跑 validate-rules 与 build-data；');
console.log('      tools/migrate-legacy.mjs 已冻结，只用于追溯，不再参与构建。');
