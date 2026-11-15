#!/usr/bin/env node
/* ============================================================================
   scripts/build-data.mjs — 把 data/ 下的 JSON 打包成一个可离线加载的 JS 文件
   产物：data/bridge-data.js，暴露 globalThis.BridgeData（浏览器）或 module.exports（Node）。

   为什么不用 fetch 读 JSON：APK 里页面来自 WebView 的虚拟 https 源，
   fetch 虽然可用，但启动时多一次往返、且 file:// 直接打开会失败。
   打成 JS 后 <script> 同步加载，浏览器、APK、Node 测试三处行为一致。
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/systems.json'), 'utf8'));
const version = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();

const systems = meta.map((sys) => {
  const rules = JSON.parse(fs.readFileSync(path.join(ROOT, `data/rules/${sys.key}.json`), 'utf8'));
  return {
    key: sys.key,
    name: sys.name,
    full: sys.full,
    by: sys.by,
    blurb: sys.blurb,
    rules,
    notes: sys.notes || [],
    conventions: sys.conventions || [],
    answers: sys.answers || {}
  };
});

const payload = { version, systems };
const out = path.join(ROOT, 'data/bridge-data.js');
const body = [
  '/* 自动生成，请勿手改。源数据：data/systems.json + data/rules/*.json；',
  '   生成命令：node scripts/build-data.mjs */',
  '(function (root, factory) {',
  "  'use strict';",
  '  var data = factory();',
  "  if (typeof module === 'object' && module.exports) module.exports = data;",
  '  else root.BridgeData = data;',
  "})(typeof globalThis !== 'undefined' ? globalThis : this, function () {",
  "  'use strict';",
  '  return ' + JSON.stringify(payload) + ';',
  '});',
  ''
].join('\n');

fs.writeFileSync(out, body, 'utf8');
const kb = (Buffer.byteLength(body, 'utf8') / 1024).toFixed(1);
console.log(`data/bridge-data.js 已生成：${systems.length} 套体系，` +
  `${systems.reduce((n, s) => n + s.rules.length, 0)} 条规则，${kb} KB`);
