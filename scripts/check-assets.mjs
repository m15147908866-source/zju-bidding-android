#!/usr/bin/env node
/* ============================================================================
   scripts/check-assets.mjs — 资源与引用一致性检查（不启动浏览器）
   检查项：
     1. VERSION 格式，index.html / manifest / AndroidManifest 的版本号是否同步
     2. index.html 引用的本地脚本、样式、图标是否存在，脚本加载顺序是否正确
     3. sw.js 的预缓存列表与磁盘文件、index.html 引用是否一致
     4. manifest.json 的图标与入口是否存在
     5. android/build.sh 是否打包了 index 引用的全部资源
     6. 网页与 Android 原生桥（AndroidStore / AndroidHttp）方法是否对称
     7. 网页入口不再引用 legacy 扁平数据
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

let failed = 0;
function ok(name, cond, extra) {
  if (cond) console.log('✔ ' + name);
  else { failed++; console.log('✖ ' + name + (extra ? '  → ' + extra : '')); }
}

const version = read('VERSION').trim();
const html = read('index.html');
const sw = read('sw.js');
const engine = read('engine.js');
const app = read('app.js');
const buildSh = read('android/build.sh');
const java = read('android/java/com/feng/sayc/MainActivity.java');
const manifest = JSON.parse(read('manifest.json'));
const androidManifest = read('android/AndroidManifest.xml');
const changelog = read('CHANGELOG.md');

/* 1. 版本号 */
ok('VERSION 形如 x.y.z', /^\d+\.\d+\.\d+$/.test(version), version);
const [maj, min, pat] = version.split('.').map(Number);
const versionCode = maj * 10000 + min * 100 + pat;
const amName = /android:versionName="([^"]+)"/.exec(androidManifest);
const amCode = /android:versionCode="(\d+)"/.exec(androidManifest);
ok('AndroidManifest versionName 与 VERSION 一致', amName && amName[1] === version, amName && amName[1]);
ok('AndroidManifest versionCode 与版本号换算一致', amCode && Number(amCode[1]) === versionCode,
  amCode && `${amCode[1]} vs ${versionCode}`);
ok('CHANGELOG 含当前版本小节', changelog.includes('## [' + version + ']'));

/* 2. index.html 的本地引用 */
const scriptSrcs = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);
const linkHrefs = [...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map((m) => m[1]);
const isLocal = (u) => !/^(https?:)?\/\//.test(u) && !u.startsWith('data:') && !u.startsWith('#');
for (const u of [...scriptSrcs, ...linkHrefs].filter(isLocal)) {
  ok('index.html 引用存在：' + u, exists(u));
}

const CORE_ORDER = ['calls', 'auction', 'context', 'hand', 'rules', 'recommend']
  .map((f) => `core/${f}.js`);
const expectedScripts = [...CORE_ORDER, 'data/bridge-data.js', 'engine.js', 'app.js'];
ok('index.html 脚本列表与预期一致',
  JSON.stringify(scriptSrcs) === JSON.stringify(expectedScripts), scriptSrcs.join(','));

/* 3. sw.js 预缓存 */
const assetsBlock = /const ASSETS = \[([\s\S]*?)\];/.exec(sw);
const swAssets = assetsBlock
  ? [...assetsBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  : [];
ok('sw.js 能解析出 ASSETS', swAssets.length > 0);
for (const a of swAssets) {
  const rel = a === './' || a === '.' ? 'index.html' : a.replace(/^\.\//, '');
  ok('sw.js 缓存的文件存在：' + a, exists(rel));
}
ok('sw.js 缓存名包含版本号', sw.includes(`zju-bid-v${version}`));

const pageAssets = [...scriptSrcs, ...linkHrefs]
  .filter(isLocal)
  .map((u) => u.replace(/^\.\//, ''));
const missingInSw = pageAssets.filter((u) => !swAssets.includes('./' + u));
ok('index.html 的本地资源都在 sw.js 预缓存中', missingInSw.length === 0, missingInSw.join(','));
const diskCore = fs.readdirSync(path.join(ROOT, 'core'))
  .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
  .map((f) => `core/${f}`);
const missingCore = diskCore.filter((f) => !scriptSrcs.includes(f));
ok('core/ 下的运行时脚本都已被 index.html 加载', missingCore.length === 0, missingCore.join(','));

/* 4. manifest.json */
ok('manifest start_url 存在', exists(manifest.start_url.replace(/^\.\//, '')));
for (const icon of manifest.icons || []) {
  ok('manifest 图标存在：' + icon.src, exists(icon.src));
  ok('manifest 图标已预缓存：' + icon.src, swAssets.includes('./' + icon.src));
}

/* 5. Android build.sh 打包清单 */
for (const f of ['index.html', 'app.js', 'engine.js', 'sw.js', 'manifest.json']) {
  ok('build.sh 复制 ' + f, buildSh.includes(f));
}
ok('build.sh 复制 core/*.js', buildSh.includes('core/*.js'));
ok('build.sh 复制 data/bridge-data.js', buildSh.includes('data/bridge-data.js'));
ok('build.sh 复制 icons/*', buildSh.includes('icons/*'));

/* 6. 原生桥对称性 */
const interfaceNames = [...java.matchAll(/addJavascriptInterface\(new\s+\w+\(\), "(\w+)"\)/g)]
  .map((m) => m[1]);
ok('Java 注册了 AndroidStore 与 AndroidHttp',
  interfaceNames.includes('AndroidStore') && interfaceNames.includes('AndroidHttp'), interfaceNames.join(','));
ok('engine.js 只用 getItem / setItem 两个存储方法',
  /AndroidStore\.getItem\(/.test(engine) && /AndroidStore\.setItem\(/.test(engine));
ok('Java Store 提供 getItem', /@JavascriptInterface[\s\S]{0,120}?public String getItem\(/.test(java));
ok('Java Store 提供 setItem', /@JavascriptInterface[\s\S]{0,120}?public void setItem\(/.test(java));
ok('app.js 调用 postJsonAsync', /AndroidHttp\.postJsonAsync\(/.test(app));
ok('Java Http 提供 postJsonAsync',
  /@JavascriptInterface[\s\S]{0,200}?public void postJsonAsync\(/.test(java));
ok('原生回调 __nativeHttpDone 两端一致',
  app.includes('window.__nativeHttpDone') && java.includes('__nativeHttpDone'));

/* 7. 不再引用旧扁平数据 */
const webEntry = [html, sw, engine, app, buildSh].join('\n');
const stale = ['legacy/data.js', 'legacy/data-zju.js', 'legacy/data-xinrui.js', 'data/rules/*.json']
  .filter((s) => webEntry.includes(s));
ok('网页与打包脚本不再引用 legacy 数据', stale.length === 0, stale.join(','));
ok('页面运行时不 fetch 规则 JSON', !/fetch\([^)]*data\/rules/.test(engine + app));

console.log(failed ? `\n${failed} 项失败` : '\n全部通过');
process.exit(failed ? 1 : 0);
