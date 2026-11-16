#!/usr/bin/env node
/* ============================================================================
   scripts/smoke-ui.mjs — 产品级流程冒烟：在 Node 里用最小 DOM 桩加载真实脚本

   覆盖：首屏初始化、叫牌出价、结算庄家、悔牌、开新一局、体系切换、
        AI 未配置 / http 拦截 / 请求失败三条路径、token 估算展示。

   边界：不解析 HTML、不跑浏览器事件循环，只验证 app.js 的初始化与交互函数
   在真实数据下能跑通并渲染出预期文本；浏览器布局与 Android WebView 仍需真机复核。
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------- 最小 DOM 桩 ---------------- */
class ClassList {
  constructor(el) { this.el = el; }
  add(...c) { c.forEach((x) => this.el._cls.add(x)); }
  remove(...c) { c.forEach((x) => this.el._cls.delete(x)); }
  toggle(c, force) {
    const on = force === undefined ? !this.el._cls.has(c) : !!force;
    if (on) this.el._cls.add(c); else this.el._cls.delete(c);
    return on;
  }
  contains(c) { return this.el._cls.has(c); }
}

class Element {
  constructor(sel) {
    this.selector = sel || '';
    this.tagName = 'DIV';
    this._cls = new Set();
    this.classList = new ClassList(this);
    this._html = '';
    this.textContent = '';
    this.value = '';
    this.checked = false;
    this.hidden = false;
    this.disabled = false;
    this.dataset = {};
    this.style = { setProperty() {}, removeProperty() {} };
    this.children = [];
    this.parentNode = null;
    this.onclick = null;
    this.onchange = null;
    this.clientWidth = 390;
    this.clientHeight = 760;
    this.scrollLeft = 0;
    this.offsetWidth = 320;
    this.offsetHeight = 120;
    this._listeners = {};
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); }
  get className() { return Array.from(this._cls).join(' '); }
  set className(v) {
    this._cls = new Set(String(v).split(/\s+/).filter(Boolean));
    this.classList = new ClassList(this);
  }
  addEventListener(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }
  removeEventListener() {}
  setAttribute(k, v) { if (k === 'aria-hidden') this.ariaHidden = v; }
  getAttribute() { return null; }
  removeAttribute() {}
  appendChild(n) { this.children.push(n); n.parentNode = this; return n; }
  removeChild(n) { this.children = this.children.filter((x) => x !== n); return n; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  querySelector(sel) { return doc.querySelector(sel); }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { left: 20, top: 100, right: 220, bottom: 132, width: 200, height: 32 }; }
  focus() {}
  select() {}
  click() { if (this.onclick) this.onclick({ target: this }); }
  scrollTo() {}
}

const registry = new Map();
const doc = new Element('#document');
doc.body = new Element('body');
doc.documentElement = new Element('html');
doc.activeElement = null;
doc.createElement = (tag) => { const el = new Element(tag); el.tagName = String(tag).toUpperCase(); return el; };
doc.getElementById = (id) => doc.querySelector('#' + id);
doc.execCommand = () => false;
doc.querySelector = (sel) => {
  if (!registry.has(sel)) registry.set(sel, new Element(sel));
  return registry.get(sel);
};
doc.querySelectorAll = () => [];
doc._fire = (type, evt) => (doc._listeners[type] || []).forEach((fn) => fn(evt || { target: doc }));

const mem = {};
const localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; }
};

let fetchCalls = 0;
const win = {
  innerWidth: 390,
  innerHeight: 844,
  addEventListener() {},
  localStorage
};

/* ---------------- 加载 index.html 引用的本地脚本 ---------------- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const srcs = Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g))
  .map((m) => m[1])
  .filter((s) => !/^(https?:)?\/\//.test(s));

const ctx = vm.createContext({
  window: win,
  document: doc,
  localStorage,
  navigator: {},
  console,
  setTimeout,
  clearTimeout,
  AbortController,
  requestAnimationFrame: (fn) => fn(),
  fetch: async () => { fetchCalls++; throw new Error('offline'); }
});
for (const src of srcs) {
  const file = path.join(ROOT, src);
  if (!fs.existsSync(file)) throw new Error('index.html 引用了不存在的脚本：' + src);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: src });
}

const ev = (code) => vm.runInContext(code, ctx);
const $ = (sel) => doc.querySelector(sel);
const J = JSON.stringify;

let failed = 0;
function ok(name, cond, extra) {
  if (cond) console.log('✔ ' + name);
  else { failed++; console.log('✖ ' + name + (extra ? '  → ' + extra : '')); }
}

/* ---------------- 1. 首屏初始化 ---------------- */
doc._fire('DOMContentLoaded');
ok('首屏渲染出体系名', $('#brandSub').textContent.includes('SAYC'), $('#brandSub').textContent);
ok('首屏状态提示北家先叫', $('#status').textContent.includes('由北家先叫'), $('#status').textContent);
ok('叫牌面板含全部叫品', $('#bids').innerHTML.includes('data-bid="1C"') &&
  $('#bids').innerHTML.includes('data-bid="7NT"') && $('#bids').innerHTML.includes('data-bid="PASS"'));
ok('首次打开弹出体系选择', $('#picker').classList.contains('on'));

/* ---------------- 2. 出价：先选中，再确认 ---------------- */
ev("onBid('1S')");
ok('点击叫品只选中', ev("state.sel") === '1S' && ev('board().auction.length') === 0);
ok('选中后气泡给出来源含义', $('#bubble').innerHTML.includes('开叫') && $('#bubble').innerHTML.includes('m-rule'),
  $('#bubble').innerHTML.slice(0, 120));

ev("onBid('1S')");
ok('再点一次写入叫牌过程', ev('board().auction.length') === 1 && ev("state.sel") === null);
ok('轮到东家叫牌', $('#status').textContent.includes('东家'), $('#status').textContent);

/* ---------------- 3. 结算：庄家取最早叫出该花色的人 ---------------- */
for (const bid of ['PASS', '2S', 'PASS', 'PASS', 'PASS']) {
  ev('onBid(' + J(bid) + ')');
  ev('onBid(' + J(bid) + ')');
}
ok('本局结束', ev('board().done') === true);
ok('庄家是北家', ev('board().result.seat') === 'N', J(ev('board().result')));
ok('汇总显示定约与庄家', $('#summary').innerHTML.includes('北家做庄') && $('#summary').innerHTML.includes('2♠'),
  $('#summary').innerHTML.slice(0, 100));
ok('叫牌面板切换为结束态', $('#bids').innerHTML.includes('开始新一局'));
ok('页面标记 done', doc.body.classList.contains('done'));

/* ---------------- 4. 悔牌与开新一局 ---------------- */
ev('undo()');
ok('悔牌后回到未结束', ev('board().done') === false && ev('board().auction.length') === 5);
ev('nextBoard()');
ok('新一局清空叫牌', ev('board().auction.length') === 0 && ev("board().dealer") === 'N');
ok('新一局清空记牌器', ev('state.tracker.length') === 0);

/* ---------------- 5. 体系切换 ---------------- */
ev("switchSystem('zju')");
ok('切换到浙大体系', ev("state.system") === 'zju' && $('#brandSub').textContent.includes('浙大'), $('#brandSub').textContent);
ok('切换体系后牌局重开', ev('board().auction.length') === 0);
ok('切换后关闭选择面板', !$('#picker').classList.contains('on'));
ev("switchSystem('sayc')");

/* ---------------- 6. AI 失败与拦截路径 ---------------- */
const lastChat = () => {
  const conv = ev('state.aiConv');
  return conv && conv.ui && conv.ui.length ? conv.ui[conv.ui.length - 1].t : '';
};

ev("state.ai = { url: '', key: '', model: '', allowInsecure: false }; state.aiConv = null;");
await ev('runAI()');
ok('未配置接口时给出提示', lastChat().includes('还没填接口地址和 Key'), lastChat());

ev("state.ai = { url: 'http://127.0.0.1:9/v1/chat/completions', key: 'sk-test', model: 'm', allowInsecure: false }; state.aiConv = null;");
await ev('runAI()');
ok('http 未确认时拦截发送', lastChat().includes('http（明文）'), lastChat());
ok('拦截时没有发起请求', fetchCalls === 0, String(fetchCalls));

ev("state.ai = { url: 'https://127.0.0.1:9/v1/chat/completions', key: 'sk-test', model: 'm', allowInsecure: true }; state.aiConv = null;");
await ev('runAI()');
ok('请求失败时展示错误而不是崩溃', lastChat().includes('请求失败'), lastChat());
ok('发送前展示 token 估算', $('#aiCost').textContent.includes('tokens') &&
  $('#aiCost').textContent.includes('体系卡'), $('#aiCost').textContent);

/* ---------------- 7. 存档落盘 ---------------- */
ok('交互后写入存档', Object.prototype.hasOwnProperty.call(mem, 'sayc_v3') && mem.sayc_v3.includes('sayc'));

console.log('');
if (failed) {
  console.log('失败 ' + failed + ' 项');
  process.exit(1);
}
console.log('全部通过（加载本地脚本 ' + srcs.length + ' 个）');
