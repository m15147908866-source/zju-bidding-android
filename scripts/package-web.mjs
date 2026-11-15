#!/usr/bin/env node
// 网页版（PWA）打包脚本：把运行所需的静态文件打成 zip，供 Release / CI 分发。
//
//   node scripts/package-web.mjs
//   node scripts/package-web.mjs --out dist/custom.zip
//
// 只依赖 Node 内置模块，自写最小 ZIP 写入器（deflate + CRC32），
// 不引入 npm 依赖，保证仓库保持零构建。

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = readFileSync(join(ROOT, 'VERSION'), 'utf8').trim();

const outIndex = process.argv.indexOf('--out');
const OUT = outIndex >= 0
  ? join(process.cwd(), process.argv[outIndex + 1])
  : join(ROOT, 'dist', `ZJU-bidding-web-v${VERSION}.zip`);

/* ---------------- 收集文件 ---------------- */
const entries = [];
const addFile = (rel) => {
  const abs = join(ROOT, rel);
  if (!statSync(abs).isFile()) return;
  entries.push({ name: rel.split('\\').join('/'), data: readFileSync(abs) });
};

['index.html', 'app.js', 'engine.js', 'sw.js', 'manifest.json', 'LICENSE'].forEach(addFile);
readdirSync(join(ROOT, 'core'))
  .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
  .sort()
  .forEach((f) => addFile('core/' + f));
addFile('data/bridge-data.js');
readdirSync(join(ROOT, 'icons'))
  .filter((f) => /\.(png|svg|ico|webp)$/i.test(f))
  .sort()
  .forEach((f) => addFile('icons/' + f));

entries.push({
  name: '使用说明.txt',
  data: Buffer.from(
    `ZJU 叫牌 网页版 v${VERSION}\r\n` +
    `\r\n` +
    `这是 PWA 静态包，需要用 HTTP(S) 访问，不能直接双击 index.html：\r\n` +
    `  python -m http.server 8000\r\n` +
    `然后浏览器打开 http://localhost:8000 。\r\n` +
    `部署到任意静态站点即可在手机上「添加到主屏幕」，离线可用。\r\n` +
    `AI 分析需要访问大模型接口，纯网页版受浏览器 CORS 限制；\r\n` +
    `需要 AI 分析请使用 Android 版 APK。\r\n`,
    'utf8'
  ),
});

/* ---------------- 最小 ZIP 写入器 ---------------- */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// 固定时间戳（2026-01-01 00:00），保证重复打包字节一致
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

const localParts = [];
const centralParts = [];
let offset = 0;

for (const entry of entries) {
  const name = Buffer.from(entry.name, 'utf8');
  const raw = entry.data;
  const packed = deflateRawSync(raw, { level: 9 });
  const crc = crc32(raw);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);          // version needed
  local.writeUInt16LE(0x0800, 6);      // UTF-8 文件名
  local.writeUInt16LE(8, 8);           // deflate
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(packed.length, 18);
  local.writeUInt32LE(raw.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);
  localParts.push(local, name, packed);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);        // version made by
  central.writeUInt16LE(20, 6);        // version needed
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(DOS_TIME, 12);
  central.writeUInt16LE(DOS_DATE, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(packed.length, 20);
  central.writeUInt32LE(raw.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt16LE(0, 30);        // extra
  central.writeUInt16LE(0, 32);        // comment
  central.writeUInt16LE(0, 34);        // disk
  central.writeUInt16LE(0, 36);        // internal attrs
  central.writeUInt32LE(0, 38);        // external attrs
  central.writeUInt32LE(offset, 42);
  centralParts.push(central, name);

  offset += local.length + name.length + packed.length;
}

const centralSize = centralParts.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(entries.length, 8);
end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

const zip = Buffer.concat([...localParts, ...centralParts, end]);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, zip);

console.log(`网页版打包完成：${relative(ROOT, OUT) || OUT}`);
console.log(`  版本 ${VERSION}，${entries.length} 个文件，${(zip.length / 1024).toFixed(1)} KB`);
