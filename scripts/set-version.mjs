#!/usr/bin/env node
// 版本号同步脚本。仓库根目录的 VERSION 是唯一来源，其余位置由本脚本生成。
//
//   node scripts/set-version.mjs              # 把 VERSION 同步到 AndroidManifest.xml 与 sw.js
//   node scripts/set-version.mjs --check      # 只校验是否已同步，不一致时退出码为 1
//
// versionCode = major * 10000 + minor * 100 + patch，保证随版本单调递增。

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');

const VERSION = readFileSync(join(ROOT, 'VERSION'), 'utf8').trim();
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(VERSION);

if (!match) {
  console.error(`VERSION 不是合法的语义化版本号：${VERSION}`);
  process.exit(1);
}

const [major, minor, patch] = match.slice(1).map(Number);
if (minor > 99 || patch > 99) {
  console.error(`次版本号与修订号需小于 100，当前为 ${VERSION}`);
  process.exit(1);
}
const VERSION_CODE = major * 10000 + minor * 100 + patch;

// 需要同步的文件：路径 -> 由当前内容生成新内容
const targets = [
  {
    file: 'android/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    apply: (text) =>
      text
        .replace(/android:versionCode="\d+"/, `android:versionCode="${VERSION_CODE}"`)
        .replace(/android:versionName="[^"]*"/, `android:versionName="${VERSION}"`),
  },
  {
    file: 'sw.js',
    name: 'sw.js',
    apply: (text) => text.replace(/const CACHE = '[^']*';/, `const CACHE = 'zju-bid-v${VERSION}';`),
  },
];

let stale = [];

for (const target of targets) {
  const path = join(ROOT, target.file);
  const before = readFileSync(path, 'utf8');
  const after = target.apply(before);

  if (before === after) continue;

  if (CHECK_ONLY) {
    stale.push(target.file);
  } else {
    writeFileSync(path, after);
    console.log(`已更新 ${target.file}`);
  }
}

if (CHECK_ONLY) {
  if (stale.length > 0) {
    console.error(`以下文件与 VERSION (${VERSION}) 不一致：${stale.join(', ')}`);
    console.error('运行 `node scripts/set-version.mjs` 后再提交。');
    process.exit(1);
  }
  console.log(`版本一致：${VERSION}（versionCode ${VERSION_CODE}）`);
} else {
  console.log(`版本 ${VERSION} / versionCode ${VERSION_CODE} 已同步`);
}
