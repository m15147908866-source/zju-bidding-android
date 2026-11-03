/* ============================================================================
   SAYC 叫牌 · 界面层
   ========================================================================== */

/* 叫品面板的列顺序：无将、黑桃、红心、方片、草花。
   仅影响展示，合法性判定仍按 C < D < H < S < NT 的大小关系。 */
const DISPLAY_STRAINS = ['NT', 'S', 'H', 'D', 'C'];

const TAG_CLASS = {
  '逼叫': 't-forcing', '止叫': 't-stop', '邀局': 't-invite', '阻击': 't-preempt',
  '满贯': 't-slam', '约定叫': 't-conv', '转移叫': 't-conv', '爆裂叫': 't-conv',
  '示弱': 't-weak', '试探': 't-probe', '赌博': 't-conv', '缺载': 't-missing',
  '开叫': 't-open', '原文疑误': 't-warn'
};

const CTX_CN = {
  open: '开叫', resp: '应叫', opener: '开叫方再叫', responder: '应叫方再叫',
  def: '防守方', answer: '约定答叫'
};
function ctxShort(it) {
  if (it.bid === 'PASS') return '不叫';
  return CTX_CN[it.ctx.type] || '';
}
function ptsText(p) {
  if (!p) return '—';
  if (/^\d+(~\d+)?$/.test(p)) return p + ' 点';
  return p;
}

function ctxLabel(ctx, seat) {
  const who = SEAT_CN[seat];
  if (ctx.type === 'open') return who + ' · 开叫（无人叫牌）';
  if (ctx.type === 'resp') return who + ' · 对 ' + bidLabel(ctx.open) + ' 的应叫';
  if (ctx.type === 'opener') {
    const ask = { '1NT': ['2C', '2D', '2H', '2S'], '2NT': ['3C', '3D', '3H'], '3NT': ['4D', '4H'], '2D': ['2NT'], '2H': ['2NT'], '2S': ['2NT'], '3C': ['2NT'], '3D': ['2NT'], '3H': ['2NT'], '3S': ['2NT'] };
    const isAsk = ctx.resp && ask[ctx.open] && ask[ctx.open].includes(ctx.resp);
    return who + ' · 开叫 ' + bidLabel(ctx.open) + (ctx.resp ? ' — ' + bidLabel(ctx.resp) : '') +
      (isAsk ? ' 之后的答叫' : ' 之后再叫');
  }
  if (ctx.type === 'responder') {
    return who + ' · ' + bidLabel(ctx.open) + (ctx.resp ? ' — ' + bidLabel(ctx.resp) : '') + ' 之后应叫方再叫';
  }
  if (ctx.type === 'def') return who + ' · 对方 ' + bidLabel(ctx.oppOpen) + ' 开叫后的争叫';
  if (ctx.type === 'answer') return who + ' · 约定问叫的答叫';
  if (ctx.type === 'answer') {
    const nm = { blackwood: '黑木 4NT', blackwoodK: '黑木 5NT 问 K', gerber: '盖伯 4♣', gerberK: '盖伯 5♣ 问 K' };
    return who + ' · 对 ' + (nm[ctx.askType] || '约定问叫') + ' 的答叫';
  }
  return who;
}

/* ---------------- 渲染：顶栏与叫牌盘 ---------------- */
function render() {
  const bd = board();
  if (!bd) return;
  renderTop(bd);
  renderBoard(bd);
  renderPanel(bd);
  paintBubble(bd);
  paintAdvice();
  renderSummary(bd);
  syncAISub();
  document.body.classList.toggle('done', !!bd.done);
}

function renderTop(bd) {
  const seat = seatToAct(bd);

  $$('#sidePick .dp').forEach(b => b.classList.toggle('on', b.dataset.seat === state.mySeat));
  const locked = bd.auction.length > 0;

  const st = $('#status');
  if (bd.done) {
    const r = bd.result || {};
    st.textContent = r.passed
      ? '本局结束 · 四家全 Pass'
      : '本局结束 · ' + bidLabel(r.bid) + (r.dbl ? (r.dbl === 'X' ? ' ×' : ' ××') : '') + '（' + SEAT_CN[r.seat] + '家）';
    st.className = 'status done';
  }
  else if (locked) { st.textContent = '轮到' + SEAT_CN[seat] + '家叫牌'; st.className = 'status live'; }
  else { st.textContent = '由' + SEAT_CN[bd.dealer] + '家先叫'; st.className = 'status live'; }

}

function renderBoard(bd) {
  // 未开叫时第一行用来选首叫；开叫后按叫牌盒顺序排布
  const picking = bd.auction.length === 0 && !bd.done;
  const startIdx = SEATS.indexOf(bd.dealer);
  const total = startIdx + bd.auction.length + (bd.done ? 0 : 1);
  const rows = picking ? 1 : Math.max(1, Math.ceil(total / 4));

  const hint = $('#auctionHint');
  if (hint) hint.textContent = picking ? '点席位设首叫' : '';
  const grid = $('#auction');
  let html = '';
  SEATS.forEach(s => {
    html += '<div class="ag-head' + (s === 'N' || s === 'S' ? ' ns' : '') +
      (s === state.mySeat ? ' mine' : '') + '">' +
      '<span class="seat-letter">' + s + '</span>' + SEAT_CN[s] + '</div>';
  });
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 4; c++) {
      if (picking) {
        const s2 = SEATS[c];
        const on = s2 === bd.dealer ? ' on' : '';
        cells.push('<div class="ag-cell seat-pick' + on + '" data-setdealer="' + s2 + '">' +
          SEAT_CN[s2] + '</div>');
        continue;
      }
      const i = r * 4 + c - startIdx;     // 第几个叫品
      const call = i >= 0 ? bd.auction[i] : null;
      if (call) {
        const isC = isContract(call.bid);
        const inspecting = state.inspect === i;
        cells.push('<div class="ag-cell filled inspectable' +
          (isC ? ' contract' : '') + (call.bid === 'PASS' ? ' pass' : '') +
          (inspecting ? ' inspecting' : '') +
          '" data-call="' + i + '">' + bidHtml(call.bid) + '</div>');
      } else if (i === bd.auction.length && !bd.done) {
        cells.push('<div class="ag-cell pending"><span class="pulse"></span></div>');
      } else {
        cells.push('<div class="ag-cell"></div>');
      }
    }
  }
  html += cells.join('');
  grid.innerHTML = html;
}

/* ---------------- 渲染：含义卡片 ---------------- */
function buildMeaningHtml(bid, res, seat, conv, opts) {
  opts = opts || {};
  let h = '';

  if (opts.bubble) {
    h += '<button type="button" class="bub-x" id="bubbleClose" aria-label="关闭">×</button>';
  }

  if (opts.inspect) {
    h += '<div class="m-inspect"><span>回看第 <b>' + (opts.idx + 1) + '</b> 手 · ' +
      SEAT_CN[seat] + '家叫出</span></div>';
  }

  h += '<div class="m-head">';
  h += '<span class="m-bid ' + strainCls(bid) + '">' + bidHtml(bid) + '</span>';
  h += '<div class="m-meta"><div class="m-ctx">' + ctxLabel(res.ctx, seat) + '</div>' +
    '<div class="m-seat">' + SEAT_CN[seat] + '家 · ' + CTX_CN[res.ctx.type] + '</div></div>';
  h += '</div>';

  if (res.rules.length) {
    h += '<div class="m-list">';
    res.rules.forEach(r => {
      h += '<div class="m-rule">';
      h += '<div class="m-rule-top">';
      h += '<span class="m-pts">' + (r.p ? ptsText(r.p) : '点力不限') + '</span>';
      if (r.pw) h += '<span class="m-pw">' + (r.pw === 'opener' ? '开叫方' : r.pw === 'responder' ? '应叫方' : '争叫方') + '</span>';
      (r.k || []).forEach(k => {
        h += '<span class="tag ' + (TAG_CLASS[k] || 't-misc') + '">' + k + '</span>';
      });
      h += '</div>';
      h += '<div class="m-desc">' + esc(r.d) + '</div>';
      h += '<div class="m-src">' + esc(r.s) + '</div>';
      h += '</div>';
    });
    h += '</div>';
  } else if (conv) {
    h += '<div class="m-list"><div class="m-rule">';
    h += '<div class="m-rule-top"><span class="m-pts">约定叫</span><span class="tag t-conv">' + esc(conv.q) + '</span></div>';
    h += '<div class="m-desc"><b>' + esc(conv.a) + '</b></div>';
    h += '<div class="m-conv-rows">' + conv.rows.map(x =>
      '<div><span class="k">' + esc(x[0]) + '</span><span class="v">' + esc(x[1]) + '</span></div>').join('') + '</div>';
    if (conv.note) h += '<div class="m-note">' + esc(conv.note) + '</div>';
    h += '<div class="m-src">' + esc(conv.s) + '</div>';
    h += '</div></div>';
  } else if (res.notes.length) {
    h += '<div class="m-none">';
    h += '<div class="m-none-t">来源页面以原则性文字说明此叫品</div>';
    h += '<div class="m-none-d">本节未逐格列表，含义见下方说明。</div>';
    h += '</div>';
  } else {
    h += '<div class="m-none">';
    h += '<div class="m-none-t">来源页面未收录此叫品在本次语境下的含义</div>';
    h += '<div class="m-none-d">';
    if (res.ctx.contested && res.ctx.type !== 'def') {
      h += '本局已出现敌方争叫，来源页面只给出争叫本身的原则，未涵盖竞叫后的后续变化。';
    } else if (res.ctx.type === 'responder') {
      h += '来源页面在应叫方再叫这一层，只覆盖了斯台曼与转移叫完成后的后续。';
    } else {
      h += '来源页面的表格未涉及该序列。这里不做推测，以免与原文冲突。';
    }
    h += '</div></div>';
  }

  res.notes.forEach(n => {
    h += '<div class="m-ctxnote"><span class="cn-src">' + esc(n.s) + '</span>' + esc(n.text) + '</div>';
  });

  if (opts.bubble && !opts.inspect) {
    h += '<div class="mb-hint">再点一次 <b>' + bidLabel(bid) + '</b> 即叫出</div>';
  }
  return h;
}

function paintBubble(bd) {
  const bub = $('#bubble');
  if (!bub) return;

  let anchor = null, html = '';

  if (state.inspect != null && !state.sel) {
    const sn = bd.snap[state.inspect];
    if (sn) {
      anchor = document.querySelector('[data-call="' + state.inspect + '"]');
      const conv = sn.conv ? CONVENTIONS.find(c => c.s === sn.conv) || null : null;
      html = buildMeaningHtml(sn.bid, sn, sn.seat, conv,
        { bubble: true, inspect: true, idx: state.inspect });
    }
  } else if (state.sel) {
    const seat = seatToAct(bd);
    const res = lookupRules(bd, seat, state.sel);
    const conv = res.found ? null : conventionFallback(bd, seat, state.sel);
    anchor = document.querySelector('#bids [data-bid="' + state.sel + '"]');
    html = buildMeaningHtml(state.sel, res, seat, conv, { bubble: true });
  }

  if (!anchor || !html) { bub.hidden = true; bub.innerHTML = ''; return; }

  const r0 = anchor.getBoundingClientRect();
  // 锚点必须同时在水平和垂直可视区内（叫品盘可能在另一页，横向滚出视口）
  if (r0.bottom < 8 || r0.top > window.innerHeight - 8 ||
      r0.right < 8 || r0.left > window.innerWidth - 8) {
    bub.hidden = true;
    return;
  }

  bub.innerHTML = html;
  bub.hidden = false;

  const bw = bub.offsetWidth;
  const bh = bub.offsetHeight;
  const r = anchor.getBoundingClientRect();

  let left = r.left + r.width / 2 - bw / 2;
  left = Math.max(10, Math.min(left, window.innerWidth - bw - 10));

  const above = r.top > bh + 14;
  bub.classList.toggle('above', above);
  bub.classList.toggle('below', !above);
  bub.style.left = left + 'px';
  bub.style.top = above ? (r.top - bh - 9) + 'px' : (r.bottom + 9) + 'px';

  const ax = Math.max(16, Math.min(bw - 16, r.left + r.width / 2 - left));
  bub.style.setProperty('--ax', ax + 'px');
}

function strainCls(bid) {
  const s = bidStrain(bid);
  if (s === 'H' || s === 'D') return 'red';
  if (bid === 'X' || bid === 'XX') return 'red';
  return '';
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------------- 渲染：叫品面板 ---------------- */
function renderPanel(bd) {
  const panel = $('#bids');
  if (bd.done) {
    panel.innerHTML = '<div class="p-done">本局叫牌已结束' +
      '<button class="btn primary" id="nextBoard">开始新一局</button></div>';
    const nb = document.getElementById('nextBoard');
    if (nb) nb.onclick = () => nextBoard();
    return;
  }
  const seat = seatToAct(bd);
  const legal = legalSet(bd, seat);

  let h = '<div class="bgrid">';
  h += '<div class="bcorner"></div>';
  DISPLAY_STRAINS.forEach(st => {
    const sym = st === 'NT' ? 'NT' : '<span class="bl-su">' + { C: '♣', D: '♦', H: '♥', S: '♠' }[st] + '</span>';
    h += '<div class="bhead ' + (st === 'H' || st === 'D' ? 'red' : '') + '">' + sym + '</div>';
  });
  for (let lv = 1; lv <= 7; lv++) {
    h += '<div class="blv">' + lv + '</div>';
    DISPLAY_STRAINS.forEach(st => {
      const bid = lv + st;
      h += bidBtn(bid, legal, bd, seat);
    });
  }
  h += '</div>';

  h += '<div class="ctl-row">';
  h += bidBtn('PASS', legal, bd, seat, 'wide');
  h += bidBtn('X', legal, bd, seat);
  h += bidBtn('XX', legal, bd, seat);
  h += '<label class="hide-toggle"><input type="checkbox" id="hideIllegal"' +
    (state.hideIllegal ? ' checked' : '') + '><span>隐藏不可选</span></label>';
  h += '</div>';

  panel.innerHTML = h;

  $$('#bids button[data-bid]').forEach(btn => {
    btn.onclick = () => onBid(btn.dataset.bid);
  });
  const ht = $('#hideIllegal');
  if (ht) ht.onchange = () => { state.hideIllegal = ht.checked; save(); renderPanel(board()); };
}

function bidBtn(bid, legal, bd, seat, extra) {
  const ok = legal.has(bid);
  const cls = ['bbtn'];
  if (extra) cls.push(extra);
  const s = bidStrain(bid);
  if (s === 'H' || s === 'D' || bid === 'X' || bid === 'XX') cls.push('red');
  if (bid === 'PASS') cls.push('passbtn');
  if (state.sel === bid) cls.push('sel');
  if (!ok) cls.push('off');
  if (ok && state.hideIllegal === false) { /* keep visible */ }
  if (ok) {
    const r = lookupRules(bd, seat, bid);
    if (!r.found && !conventionFallback(bd, seat, bid)) cls.push('nodata');
  }
  if (!ok && state.hideIllegal) cls.push('gone');
  return '<button class="' + cls.join(' ') + '" data-bid="' + bid + '"' +
    (ok ? '' : ' disabled') + '>' + bidHtml(bid) + '</button>';
}

/* ---------------- 交互 ---------------- */
function onBid(bid) {
  const bd = board();
  if (bd.done) return;
  const seat = seatToAct(bd);
  if (!legalSet(bd, seat).has(bid)) return;
  if (state.sel === bid) { commit(bid); return; }
  state.sel = bid;
  render();
}

function commit(bid) {
  const bd = board();
  const seat = seatToAct(bd);
  state.inspect = null;
  const snap = snapshotFor(bd, seat, bid);
  bd.auction.push({ seat, bid });
  bd.snap.push(snap);
  state.sel = null;
  if (checkOver(bd)) {
    bd.done = true;
    bd.result = contractInfo(bd);
  }
  save(); render();
}

function undo() {
  const bd = board();
  if (!bd.auction.length) return;
  bd.auction.pop(); bd.snap.pop();
  bd.done = false; bd.result = null;
  state.sel = null;
  save(); render();
}

/* 开新一局：不保留上一局记录，首叫方沿用当前这一局的设定 */
function nextBoard() {
  const prev = board();
  const dealer = prev ? prev.dealer : 'N';
  state.boards = [newBoard(dealer)];
  state.cur = 0;
  state.sel = null;
  state.inspect = null;
  save(); render();
}

/* ---------------- 汇总 ---------------- */
function renderSummary(bd) {
  const box = $('#summary');
  if (!bd.done) { box.innerHTML = ''; box.classList.remove('on'); return; }
  box.classList.add('on');

  const r = bd.result || {};
  let title, sub;
  if (r.passed) { title = '四家全 Pass'; sub = '本局无人开叫，直接进入下一局。'; }
  else {
    const declarer = r.seat;
    title = bidLabel(r.bid) + (r.dbl ? ' ' + (r.dbl === 'X' ? '×（加倍）' : '××（再加倍）') : '');
    sub = SEAT_CN[declarer] + '家做庄，定约方为 ' + SEAT_CN[declarer] + ' / ' + SEAT_CN[PTR[declarer]] + '。';
  }

  let h = '<div class="sum-head"><div><div class="sum-title">本局结束 · ' + esc(title) + '</div>' +
    '<div class="sum-sub">' + esc(sub) + '</div></div>' +
    '<div class="sum-acts"><button class="btn ghost" id="closeSum">收起</button>' +
    '<button class="btn primary" id="sumNext">开始新一局</button></div></div>';

  h += '<div class="sum-sec-t">四方所传达的信息</div>';
  h += '<div class="sum-grid">';
  SEATS.forEach(s => {
    const items = bd.snap.filter(x => x.seat === s);
    h += '<div class="sum-col">';
    h += '<div class="sum-seat' + (s === 'N' || s === 'S' ? ' ns' : '') + '"><b>' + s + '</b>' + SEAT_CN[s] + '</div>';
    if (!items.length) h += '<div class="sum-none">本局未叫牌</div>';
    items.forEach(it => {
      h += '<div class="sum-item">';
      h += '<div class="si-top"><span class="si-bid ' + strainCls(it.bid) + '">' + bidHtml(it.bid) + '</span>' +
        '<span class="si-ctx">' + ctxShort(it) + '</span></div>';
      if (it.rules.length) {
        it.rules.forEach(ru => {
          h += '<div class="si-rule">' +
            (ru.p && ru.p !== '—' ? '<span class="si-pts">' + esc(ptsText(ru.p)) + '</span>' : '') +
            esc(ru.d) + '</div>';
        });
      } else if (it.conv) {
        h += '<div class="si-rule"><span class="si-pts">约定</span>' + esc(it.conv) + '</div>';
      } else if (it.notes.length) {
        /* 含义已由下方原则性说明给出，不再重复报缺 */
      } else if (it.bid === 'PASS') {
        h += '<div class="si-rule muted">不叫（来源页面未给出该语境下 PASS 的牌力要求）</div>';
      } else {
        h += '<div class="si-rule muted">来源页面未收录该叫品在此语境下的含义</div>';
      }
      it.notes.forEach(n => {
        h += '<div class="si-note">' + esc(n.text) + '</div>';
      });
      h += '</div>';
    });
    h += '</div>';
  });
  h += '</div>';

  const missing = bd.snap.filter(x => !x.rules.length && !x.conv && !x.notes.length && x.bid !== 'PASS').length;
  if (missing) {
    h += '<div class="sum-foot">本局有 ' + missing + ' 个叫品在来源页面中无对应条目，已如实标注、未作推断。</div>';
  }

  box.innerHTML = h;
  const c = $('#closeSum'); if (c) c.onclick = () => { box.classList.remove('on'); };
  const sn = $('#sumNext'); if (sn) sn.onclick = () => nextBoard();
}

/* ---------------- 键盘 ---------------- */
function bindKeys() {
  let lvl = '';
  let lvlAt = 0;
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;

    // 带修饰键的组合交给浏览器 / 只认撤销
    if (e.ctrlKey || e.metaKey || e.altKey) {
      if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === 'Z') {
        e.preventDefault();
        undo();
      }
      return;
    }

    const k = e.key.toUpperCase();

    if (k === 'ESCAPE') {
      if (state.sel || state.inspect != null) { state.sel = null; state.inspect = null; render(); }
      return;
    }
    if (k === 'P') { onBid('PASS'); return; }
    if (k === 'X') { onBid('X'); return; }
    if (k === 'R') { onBid('XX'); return; }

    // 两段式：先按阶数 1~7，再按花色 C/D/H/S/N（N = 无将），2 秒内有效
    if (/^[1-7]$/.test(k)) { lvl = k; lvlAt = Date.now(); return; }
    if (lvl && /^[CDHSN]$/.test(k) && Date.now() - lvlAt < 2000) {
      onBid(lvl + (k === 'N' ? 'NT' : k));
      lvl = '';
      return;
    }
    lvl = '';
  });
}


/* ---------------- 初始化 ---------------- */
/* ---------------- 记牌器 ---------------- */
const TK_SUITS = ['S', 'H', 'D', 'C'];
const TK_RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

function paintTracker() {
  const grid = $('#tkGrid');
  if (!grid) return;
  const set = new Set(state.tracker || []);

  let h = '';
  TK_SUITS.forEach(st => {
    const red = st === 'H' || st === 'D';
    h += '<div class="tk-row">';
    h += '<span class="tk-suit' + (red ? ' red' : '') + '">' + SUIT_SYM[st] + '</span>';
    let left = 0;
    TK_RANKS.forEach(r => {
      const key = st + r;
      const out = set.has(key);
      if (!out) left++;
      h += '<button type="button" class="tk-card' + (out ? ' out' : '') +
        '" data-card="' + key + '">' + r + '</button>';
    });
    h += '<span class="tk-left' + (left === 0 ? ' zero' : '') + '">' + left + '</span>';
    h += '</div>';
  });
  grid.innerHTML = h;

  const foot = $('#tkFoot');
  if (foot) {
    foot.innerHTML = '已出 <b>' + set.size + '</b> 张 · 剩余 <b>' + (52 - set.size) + '</b> 张';
  }
}

/* 三页滑动：0 = AI 分析，1 = 叫牌（默认），2 = 记牌器 */
function curPage() {
  const sw = $('#swipe');
  if (!sw) return 1;
  return Math.round(sw.scrollLeft / Math.max(1, sw.clientWidth));
}
function onTrackerPage() { return curPage() === 2; }
function onAIPage() { return curPage() === 0; }

function syncSwipe() {
  const p = curPage();
  $$('#pager i').forEach((el, i) => el.classList.toggle('on', i === p));
  syncAISub();
}

function gotoPage(i) {
  const sw = $('#swipe');
  if (!sw) return;
  sw.scrollTo({ left: i * sw.clientWidth, behavior: 'smooth' });
}

/* ---------------- AI 叫牌分析 ---------------- */
const HCP_OF = { A: 4, K: 3, Q: 2, J: 1, T: 0 };

function openCfg() {
  const a = $('#aip');
  if (a) { a.classList.add('on'); a.setAttribute('aria-hidden', 'false'); }
  const c = state.ai || {};
  const set = (id, v) => { const el = $('#' + id); if (el) el.value = v || ''; };
  set('aiUrl', c.url);
  set('aiKey', c.key);
  set('aiModel', c.model);
}

function closeCfg() {
  const a = $('#aip');
  if (a) { a.classList.remove('on'); a.setAttribute('aria-hidden', 'true'); }
}

function shortHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + '_' + str.length;
}

function handStats(cards) {
  const st = { hcp: 0, S: 0, H: 0, D: 0, C: 0 };
  (cards || []).forEach(k => {
    const su = k[0], rk = k.slice(1);
    if (st[su] == null) return;
    st[su]++;
    st.hcp += (HCP_OF[rk] || 0);
  });
  return st;
}

/* 选牌网格：标记「我手里有这张」 */
function paintAIHand() {
  const grid = $('#aiHandGrid');
  if (!grid) return;
  const set = new Set(state.aiHand || []);

  let h = '';
  TK_SUITS.forEach(st => {
    const red = st === 'H' || st === 'D';
    h += '<div class="hp-row">';
    h += '<span class="hp-suit' + (red ? ' red' : '') + '">' + SUIT_SYM[st] + '</span>';
    TK_RANKS.forEach(r => {
      const key = st + r;
      const on = set.has(key) ? ' on' : '';
      h += '<button type="button" class="hp-card' + on + '" data-hcard="' + key + '">' + r + '</button>';
    });
    h += '</div>';
  });
  grid.innerHTML = h;

  const sum = $('#aiHandSum');
  if (sum) {
    const n = set.size;
    if (!n) {
      const h = state.hand;
      const tot = h.S + h.H + h.D + h.C;
      sum.textContent = (tot === 13) ? '按点数 · ' + h.hcp + ' 点' : '未选';
    }
    else {
      const st = handStats(state.aiHand);
      sum.textContent = n + ' 张 · ' + st.hcp + ' 点';
    }
  }
  const clr = $('#aiHandClear');
  if (clr) clr.disabled = set.size === 0;
}

/* 把 state.hand 同步到叫牌页和分析页两组输入框 */
function syncHandInputs() {
  const h = state.hand;
  const map = { ahHcp: h.hcp, ahS: h.S, ahH: h.H, ahD: h.D, ahC: h.C };
  Object.keys(map).forEach(id => {
    const el = $('#' + id);
    if (el && document.activeElement !== el) el.value = map[id];
  });
  const tot = $('#ahTotal');
  if (tot) {
    const n = h.S + h.H + h.D + h.C;
    tot.textContent = n + ' 张';
    tot.className = 'ai-total' + (n === 13 ? '' : ' bad');
  }
}

function syncAIHandToHand() {
  if (!state.aiHand || !state.aiHand.length) return;
  const st = handStats(state.aiHand);
  state.hand = { hcp: st.hcp, S: st.S, H: st.H, D: st.D, C: st.C };
  save();
  paintAdvice();
  syncHandInputs();
}

/* 体系约定卡：首次用某个 Key 时发给 AI */
function buildSystemCard() {
  const sys = SYSTEMS[state.system];
  const groups = [
    ['开叫', 'open'], ['应叫', 'resp'], ['开叫方再叫', 'opener'],
    ['应叫方再叫', 'responder'], ['防守叫牌', 'def'], ['问叫答叫', 'answer']
  ];
  let s = '【' + sys.name + ' 体系约定卡｜' + sys.full + '】\n';
  s += '以下为本体系的全部叫牌约定，请以此作为分析依据；若某序列未列入，请明确说明「体系未收录」，不要自行编造。\n\n';

  groups.forEach(([label, type]) => {
    const rows = sys.rules.filter(r => r.t === type);
    if (!rows.length) return;
    s += '— ' + label + ' —\n';
    rows.forEach(r => {
      const bids = [].concat(r.b).map(b => (typeof b === 'string' ? b : '〔按叫品形态〕')).join(' / ');
      const pts = r.p ? '（' + r.p + '点）' : '';
      s += bids + pts + '：' + r.d + '\n';
    });
    s += '\n';
  });

  if (sys.convs && sys.convs.length) {
    s += '— 约定叫速查 —\n';
    sys.convs.forEach(c => {
      s += c.s + '：' + c.a;
      if (c.rows && c.rows.length) {
        s += '（' + c.rows.map(x => x[0] + ' = ' + x[1]).join('；') + '）';
      }
      s += '\n';
    });
  }
  return s;
}

function buildAIContext() {
  const bd = board();
  const seat = seatToAct(bd);
  const ctx = analyze(bd, seat);
  const list = recommendFor(bd, seat);
  const sh = handShape(state.hand);
  const picked = (state.aiHand || []).slice();
  const pst = handStats(picked);

  return {
    system: SYSTEMS[state.system].name,
    systemFull: SYSTEMS[state.system].full,
    mySeat: state.mySeat,
    seatToAct: seat,
    hand: { hcp: state.hand.hcp, S: state.hand.S, H: state.hand.H, D: state.hand.D, C: state.hand.C },
    shape: sh.text,
    balanced: sh.bal,
    picked: picked,
    pickedStats: pst,
    auction: bd.auction.map(c => ({ seat: c.seat, bid: c.bid })),
    context: {
      type: ctx.type,
      typeCN: CTX_CN[ctx.type],
      open: ctx.open || null,
      resp: ctx.resp || null,
      contested: !!ctx.contested
    },
    candidates: list.slice(0, 8).map(x => ({
      bid: x.bid, points: x.pts || '', desc: x.why, source: x.src
    }))
  };
}

function aiPrompt(c) {
  const au = c.auction.length
    ? c.auction.map(x => SEAT_CN[x.seat] + ' ' + bidLabel(x.bid)).join(' → ')
    : '（尚未有人叫牌）';

  let s = '';
  s += '【本次分析基于】' + c.system + ' 体系\n';
  s += '【本家座位】' + SEAT_CN[c.mySeat] + '家\n';

  if (c.picked.length) {
    const bySuit = { S: [], H: [], D: [], C: [] };
    c.picked.forEach(k => { if (bySuit[k[0]]) bySuit[k[0]].push(k.slice(1)); });
    const fmt = st => bySuit[st].length ? SUIT_SYM[st] + bySuit[st].join(' ') : SUIT_SYM[st] + '—';
    s += '【我的手牌（逐张）】' + c.picked.length + ' 张，' + c.pickedStats.hcp + ' 个大牌点\n';
    s += '  ' + ['S', 'H', 'D', 'C'].map(fmt).join('　') + '\n';
    if (c.picked.length < 13) {
      s += '  （只列出已知的 ' + c.picked.length + ' 张，其余 ' + (13 - c.picked.length) + ' 张未指定）\n';
    }
  } else {
    s += '【我的手牌】' + c.hand.hcp + ' 个大牌点，♠' + c.hand.S + ' ♥' + c.hand.H +
         ' ♦' + c.hand.D + ' ♣' + c.hand.C + '（' + c.shape + '，' +
         (c.balanced ? '均型' : '非均型') + '）\n';
  }

  s += '【叫牌过程】' + au + '\n';
  s += '【当前轮到】' + SEAT_CN[c.seatToAct] + '家，语境：' + c.context.typeCN;
  if (c.context.open) s += '（此前开叫 ' + bidLabel(c.context.open) + '）';
  s += '\n';

  if (c.candidates.length) {
    s += '【体系规则筛出的候选】\n';
    c.candidates.forEach((x, i) => {
      s += (i + 1) + '. ' + bidLabel(x.bid) + '　' + (x.points || '点力不限') + '　' + x.desc + '\n';
    });
  } else {
    s += '【体系规则筛出的候选】无（该序列未收录，或点力/牌型不吻合）\n';
  }

  s += '\n只回答两行，不要任何其他内容：\n';
  s += '叫品：<推荐的叫品，如 1NT 或 Pass>\n';
  s += '原因：<不超过 40 字，说清为什么这么叫>\n';
  s += '不要说客套话，不要复述题目，不要展开分析。';
  return s;
}

function aiGuard() {
  const bd = board();
  const seat = seatToAct(bd);
  if (bd.done) return '本局已结束，开始新一局再分析。';
  if (seat !== state.mySeat) {
    return '现在轮到' + SEAT_CN[seat] + '家，不是本家（' + SEAT_CN[state.mySeat] + '家），没法分析本家的叫品。';
  }
  if (!(state.aiHand || []).length) {
    const total = state.hand.S + state.hand.H + state.hand.D + state.hand.C;
    if (total !== 13) return '手牌四门合计 ' + total + ' 张。要么在叫牌页把张数调到 13，要么在这里选具体牌张（可以不全选）。';
  }
  return '';
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return p(d.getHours()) + ':' + p(d.getMinutes());
}

function renderChat() {
  const box = $('#aiChat');
  if (!box) return;
  const conv = state.aiConv;
  if (!conv || !conv.ui || !conv.ui.length) {
    box.innerHTML = '<div class="ai-empty">选好手牌后点「分析当前局面」。' +
      '首次使用某个 Key 时会先发送当前体系的约定卡，之后每次分析都在同一段对话里继续。</div>';
    return;
  }
  const m = conv.ui[conv.ui.length - 1];

  if (m.r === 'err') {
    box.innerHTML = '<div class="ai-msg a"><div class="ai-bub err">' + esc(m.t) + '</div></div>';
    return;
  }
  if (m.pending) {
    box.innerHTML = '<div class="ai-msg a"><div><div class="ai-tag">' +
      esc(m.sys || '') + ' · 生成中…</div><div class="ai-bub">正在思考…</div></div></div>';
    return;
  }

  let bid = '', why = '', other = [];
  String(m.t).split('\n').forEach(ln => {
    const b = /^\s*叫品[:：]\s*(.+)$/.exec(ln);
    const w = /^\s*原因[:：]\s*(.+)$/.exec(ln);
    if (b) bid = b[1].trim();
    else if (w) why = w[1].trim();
    else if (ln.trim()) other.push(ln.trim());
  });

  let inner = '';
  if (bid || why) {
    if (bid) inner += '<div class="ai-bid-line">' + esc(bid) + '</div>';
    if (why) inner += '<div class="ai-why">' + esc(why) + '</div>';
    if (other.length) inner += '<div class="ai-more">' + other.map(esc).join('<br>') + '</div>';
  } else {
    inner = esc(m.t).replace(/\n/g, '<br>');
  }

  box.innerHTML = '<div class="ai-msg a"><div style="max-width:86%">' +
    '<div class="ai-tag">' + esc(m.sys || '') + ' · ' + fmtTime(m.at) + '</div>' +
    '<div class="ai-bub">' + inner + '</div></div></div>';
}

function trimConv(c) {
  const sys = c.messages.filter(m => m.role === 'system');
  const rest = c.messages.filter(m => m.role !== 'system');
  if (rest.length > 12) c.messages = sys.concat(rest.slice(-12));
}

function resetConv() {
  state.aiConv = null;
  save();
  renderChat();
  syncAISub();
}

function syncAISub() {
  const el = $('#aiSub');
  if (!el) return;
  const sys = SYSTEMS[state.system];
  const conv = state.aiConv;
  const on = conv && conv.sys === state.system && conv.messages && conv.messages.length;
  el.textContent = '当前体系：' + sys.name + (on ? '　·　对话进行中（' + Math.floor(conv.messages.filter(m => m.role !== 'system').length / 2) + ' 轮）' : '');
  const bs = $('#aiBlockSub');
  if (bs) bs.textContent = on ? Math.floor(conv.messages.filter(m => m.role !== 'system').length / 2) + ' 轮' : '';
}

async function runAI() {
  const cfg = state.ai || {};
  const bad = aiGuard();
  if (bad) {
    state.aiConv = state.aiConv || { key: '', sys: state.system, messages: [], ui: [] };
    state.aiConv.ui = (state.aiConv.ui || []).concat([{ r: 'err', t: bad }]);
    renderChat();
    return;
  }
  if (!cfg.url || !cfg.key) {
    openCfg();
    state.aiConv = state.aiConv || { key: '', sys: state.system, messages: [], ui: [] };
    state.aiConv.ui = (state.aiConv.ui || []).concat([{ r: 'err', t: '还没填接口地址和 Key。' }]);
    renderChat();
    return;
  }

  const kHash = shortHash(cfg.key);
  if (!state.aiConv || state.aiConv.key !== kHash || state.aiConv.sys !== state.system) {
    state.aiConv = { key: kHash, sys: state.system, messages: [], ui: [] };
  }
  const conv = state.aiConv;
  if (!conv.ui) conv.ui = [];

  // 该 Key 首次使用：先发体系卡
  if (!conv.messages.length) {
    conv.messages.push({ role: 'system', content: buildSystemCard() });
  }

  const ctx = buildAIContext();
  const prompt = aiPrompt(ctx);
  const summary = (ctx.picked.length ? ctx.picked.length + ' 张已选手牌 · ' : ctx.hand.hcp + ' 点 · ') +
    '语境：' + ctx.context.typeCN;

  conv.messages.push({ role: 'user', content: prompt });
  conv.ui = [{ r: 'a', t: '正在思考…', sys: SYSTEMS[state.system].name, pending: true }];
  renderChat();
  save();

  try {
    const r = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
      body: JSON.stringify({
        model: cfg.model || 'gpt-4o-mini',
        temperature: 0.3,
        messages: conv.messages
      })
    });
    if (!r.ok) {
      const t = await r.text();
      const TIP = {
        400: '请求格式错误',
        401: 'API Key 无效或已被撤销',
        402: '账户余额不足，需要先充值',
        422: '请求参数有误',
        429: '请求太快被限流，稍后再试',
        500: '服务端故障',
        503: '服务端繁忙'
      };
      const tip = TIP[r.status] ? TIP[r.status] + '　' : '';
      throw new Error('HTTP ' + r.status + '　' + tip + t.slice(0, 140));
    }
    const data = await r.json();
    const txt = data && data.choices && data.choices[0] &&
      data.choices[0].message && data.choices[0].message.content;
    if (!txt) throw new Error('返回格式不是标准 chat/completions');

    conv.messages.push({ role: 'assistant', content: txt });
    conv.ui = [{ r: 'a', t: txt, sys: SYSTEMS[state.system].name, at: Date.now() }];
    trimConv(conv);
    save();
    renderChat();
    syncAISub();
  } catch (e) {
    // 回滚这次提问，避免下次重复发送
    conv.messages.pop();
    conv.ui = [{ r: 'err', t: '请求失败：' + e.message }];
    renderChat();
    save();
  }
}

function copyAIContext() {
  const bad = aiGuard();
  const txt = bad ? bad : aiPrompt(buildAIContext());
  const done = ok => {
    const conv = state.aiConv || { key: '', sys: state.system, messages: [], ui: [] };
    conv.ui = conv.ui || [];
    conv.ui.push({ r: 'sys', t: (ok ? '已复制上下文到剪贴板。' : '复制失败，请手动选中：') + '\n' + txt });
    state.aiConv = conv;
    renderChat();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(() => done(true)).catch(() => fallback());
  } else { fallback(); }
  function fallback() {
    try {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      done(ok);
    } catch (e) { done(false); }
  }
}

/* ---------------- 手牌与推荐 ---------------- */

/* 解析规则里的点力字段，返回 [lo, hi]；无法解析返回 null（视为不限） */
function parseHcpRange(p) {
  if (!p) return null;
  const t = String(p).replace(/\s/g, '');
  let m = /^好?(\d+)[~\-－至]差?(\d+)$/.exec(t);
  if (m) return [+m[1], +m[2]];
  m = /^(\d+)[~\-－](\d+)$/.exec(t);
  if (m) return [+m[1], +m[2]];
  m = /^(\d+)以上$/.exec(t);
  if (m) return [+m[1], 37];
  m = /^(\d+)以下$/.exec(t);
  if (m) return [0, +m[1]];
  m = /^(\d+)左右$/.exec(t);
  if (m) return [Math.max(0, +m[1] - 2), +m[1] + 2];
  m = /^(\d+)$/.exec(t);
  if (m) return [+m[1], +m[1]];
  return null;
}

function handShape(h) {
  const arr = [h.S, h.H, h.D, h.C];
  const sorted = arr.slice().sort((a, b) => b - a);
  const bal = (sorted[0] === 5 && sorted[1] === 3 && sorted[2] === 3 && sorted[3] === 2) ||
              (sorted[0] === 4 && sorted[1] === 4 && sorted[2] === 3 && sorted[3] === 2) ||
              (sorted[0] === 4 && sorted[1] === 3 && sorted[2] === 3 && sorted[3] === 3);
  return { sorted, bal, text: sorted.join('-') };
}

/* 从规则描述里提取「N 张以上 X」的牌型要求（兼容中文数字） */
const SHAPE_RE = /([一二三四五六七八九十]+|\d+)\s*张(?:以上)?\s*(红心|黑桃|方块|梅花|高花|低花|所叫花色|所叫高花|所叫低花)?/;
const CN_NUM = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };

function cnNum(t) {
  if (/^\d+$/.test(t)) return +t;
  if (t === '十') return 10;
  if (t.length === 2 && t[0] === '十') return 10 + (CN_NUM[t[1]] || 0);
  if (t.length === 2 && t[1] === '十') return (CN_NUM[t[0]] || 0) * 10;
  return CN_NUM[t] || null;
}

function shapeNeed(desc, bid) {
  const m = SHAPE_RE.exec(desc || '');
  if (!m) return null;
  const n = cnNum(m[1]);
  if (!n) return null;
  let who = m[2] || null;
  if (!who) return null;
  let st = null;
  if (who === '红心') st = 'H';
  else if (who === '黑桃') st = 'S';
  else if (who === '方块') st = 'D';
  else if (who === '梅花') st = 'C';
  else if (who === '所叫花色' || who === '所叫高花' || who === '所叫低花') {
    const bs = bidStrain(bid);
    if (!bs || bs === 'NT') return null;
    if (who === '所叫高花' && bs !== 'H' && bs !== 'S') return null;
    if (who === '所叫低花' && bs !== 'D' && bs !== 'C') return null;
    st = bs;
  } else if (who === '高花') return { kind: 'hi', n };
  else if (who === '低花') return { kind: 'lo', n };
  return st ? { kind: 'suit', st, n } : null;
}

function shapeOk(need, hand, bid) {
  if (!need) return null;             // 无可解析的牌型要求
  if (need.kind === 'suit') return hand[need.st] >= need.n;
  if (need.kind === 'hi') return Math.max(hand.S, hand.H) >= need.n;
  if (need.kind === 'lo') return Math.max(hand.D, hand.C) >= need.n;
  return null;
}

/* 点力字段缺失时，从描述里找一个下限（如「22+ HCP」「17 点以上」） */
function descFloor(d) {
  const m1 = /(\d+)\s*\+\s*HCP/i.exec(d || '');
  const m2 = /(\d+)\s*点以上/.exec(d || '');
  const v = m1 ? +m1[1] : (m2 ? +m2[1] : null);
  return v;
}

/* 规则这一条是否适合当前手牌 */
function ruleFits(rule, hand, bid) {
  const rng = parseHcpRange(rule.p);
  if (rng && (hand.hcp < rng[0] || hand.hcp > rng[1])) return null;

  // 点力字段为空、但描述里写死了下限时，留 6 点余地给「赢墩型」强牌
  if (!rng) {
    const floor = descFloor(rule.d);
    if (floor && floor >= 16 && hand.hcp < floor - 6) return null;
  }

  const sh = handShape(hand);
  if (/非均型/.test(rule.d) && sh.bal) return null;
  if (/均型/.test(rule.d) && !/非均型/.test(rule.d) && !sh.bal) return null;

  const need = shapeNeed(rule.d, bid);
  const okShape = shapeOk(need, hand, bid);
  if (okShape === false) return null;

  let score = 0;
  if (rng) score += Math.max(0, 12 - (rng[1] - rng[0]));   // 区间越窄越具体
  if (okShape === true) score += 6;
  return { score, rng, shape: okShape === true };
}

function recommendFor(bd, seat) {
  const hand = state.hand;
  const legal = legalSet(bd, seat);
  const seen = new Set();
  const out = [];

  legal.forEach(bid => {
    const res = lookupRules(bd, seat, bid);
    (res.rules || []).forEach(rule => {
      const fit = ruleFits(rule, hand, bid);
      if (!fit) return;
      const key = bid + '|' + (rule.p || '') + '|' + rule.d.slice(0, 18);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        bid, rule, score: fit.score,
        pts: rule.p || '',
        why: rule.d,
        src: rule.s,
        tags: rule.k || []
      });
    });
  });

  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const va = isContract(a.bid) ? bidVal(a.bid) : 0;
    const vb = isContract(b.bid) ? bidVal(b.bid) : 0;
    return va - vb;
  });

  return out;
}

function bidFace(bid) {
  if (bid === 'PASS') return { cls: '', face: 'Pass' };
  if (bid === 'X') return { cls: 'red', face: '×' };
  if (bid === 'XX') return { cls: 'red', face: '××' };
  const st = bidStrain(bid);
  const lvl = bidLevel(bid);
  if (st === 'NT') return { cls: '', face: lvl + 'NT' };
  const red = (st === 'H' || st === 'D') ? ' red' : '';
  return { cls: red, face: lvl + SUIT_SYM[st] };
}

function paintAdvice() {
  const bd = board();
  const hand = state.hand;
  const sh = handShape(hand);
  const total = hand.S + hand.H + hand.D + hand.C;

  const shapeEl = $('#aiShape');
  if (shapeEl) shapeEl.textContent = sh.text + ' · ' + (sh.bal ? '均型' : '非均型');

  const out = $('#adOut');
  if (!out) return;

  if (total !== 13) {
    out.innerHTML = '<div class="ai-none">四门合计 ' + total + ' 张，应为 13 张。' +
      '<br>到分析页（左滑）调整点力与张数，或在那边直接选牌。</div>';
    return;
  }
  if (bd.done) {
    out.innerHTML = '<div class="ai-none">本局已结束，开始新一局后再说。</div>';
    return;
  }

  const seat = seatToAct(bd);
  if (seat !== state.mySeat) {
    const mate = seat === PTR[state.mySeat];
    out.innerHTML = '<div class="ai-none">轮到自己（' + SEAT_CN[seat] + '家）叫牌时才给建议。<br>现在是' +
      (mate ? '同伴' : '对方') + SEAT_CN[seat] + '家。</div>';
    return;
  }

  const ctx = analyze(bd, seat);
  const list = recommendFor(bd, seat);

  let h = '<div class="ai-ctx"><b>' + SEAT_CN[seat] + '家 · ' + CTX_CN[ctx.type] + '</b>' +
    (ctx.open ? '　开叫 ' + bidLabel(ctx.open) + (ctx.resp ? ' — 应叫 ' + bidLabel(ctx.resp) : '') : '') +
    '</div>';

  if (!list.length) {
    h += '<div class="ai-none">没有与当前点力、牌型同时吻合的条目，可直接在叫品盘上选。</div>';
    out.innerHTML = h;
    return;
  }

  h += '<div class="ai-list">';
  list.slice(0, 5).forEach(it => {
    const f = bidFace(it.bid);
    h += '<button type="button" class="ai-item' + (state.sel === it.bid ? ' on' : '') +
      '" data-pick="' + it.bid + '">' +
      '<span class="ai-bid' + f.cls + '">' + f.face + '</span>' +
      '<span class="ai-pts">' + (it.pts ? ptsText(it.pts) : '不限') + '</span>' +
      '<span class="ai-desc">' + esc(it.why) + '</span>' +
      '</button>';
  });
  h += '</div>';
  if (list.length > 5) {
    h += '<div class="ai-none">另有 ' + (list.length - 5) + ' 条未显示。</div>';
  }
  out.innerHTML = h;
}

/* ---------------- 体系切换 ---------------- */
function renderBrand() {
  const sys = SYSTEMS[state.system] || { name: 'SAYC', full: '' };
  const bs = $('#brandSub'), sn = $('#sysName');
  if (bs) bs.textContent = sys.name + ' · ' + sys.full;
  if (sn) sn.textContent = sys.name;
}

function renderPicker() {
  const list = $('#pkList');
  if (!list) return;
  list.innerHTML = Object.keys(SYSTEMS).map(k => {
    const s = SYSTEMS[k];
    return '<button type="button" class="pk-card' + (k === state.system ? ' on' : '') + '" data-sys="' + k + '">' +
      '<div class="pk-name">' + esc(s.name) + '</div>' +
      '<div class="pk-full">' + esc(s.full) + '</div>' +
      '<div class="pk-blurb">' + esc(s.blurb || '') + '</div>' +
      '<div class="pk-meta">' +
        '<span>规则 <b>' + s.rules.length + '</b> 条</span>' +
        '<span>语境说明 <b>' + s.notes.length + '</b> 条</span>' +
        '<span>约定叫 <b>' + s.convs.length + '</b> 种</span>' +
        '<span>' + esc(s.by || '') + '</span>' +
      '</div></button>';
  }).join('');
}

function openPicker() {
  renderPicker();
  const p = $('#picker');
  if (p) { p.classList.add('on'); p.setAttribute('aria-hidden', 'false'); }
}
function closePicker() {
  const p = $('#picker');
  if (p) { p.classList.remove('on'); p.setAttribute('aria-hidden', 'true'); }
}

/* 切体系：保留首叫方，其余重开 */
function switchSystem(key) {
  if (!SYSTEMS[key]) return;
  if (key !== state.system) {
    useSystem(key);
    const dealer = board() ? board().dealer : 'N';
    state.boards = [newBoard(dealer)];
    state.sel = null;
    state.inspect = null;
    state.aiConv = null;   // 体系变了，旧对话作废
  }
  save(); renderBrand(); render(); renderChat(); renderPicker(); closePicker();
}

function init() {
  const loaded = load();
  if (!loaded) {
    state.boards = [newBoard('N')];
  }
  useSystem(state.system);
  renderBrand();

  $('#btnNew').onclick = () => nextBoard();

  $('#aiRun').onclick = () => runAI();
  $('#aiCopy').onclick = () => copyAIContext();
  $('#aiClear').onclick = () => resetConv();
  $('#aiCfgBtn').onclick = () => openCfg();
  $('#aipClose').onclick = () => closeCfg();
  $('#aip').addEventListener('click', e => { if (e.target.id === 'aip') closeCfg(); });
  $('#aiHandClear').onclick = () => {
    if (!state.aiHand || !state.aiHand.length) return;
    state.aiHand = [];
    save();
    paintAIHand();
  };
  $('#aiHandToggle').onclick = () => {
    const body = $('#aiHandBody');
    if (!body) return;
    body.hidden = !body.hidden;
    const x = document.querySelector('.ai-hh-x');
    if (x) x.textContent = body.hidden ? '展开' : '收起';
    if (!body.hidden) paintAIHand();
  };
  $('#aiHandGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-hcard]');
    if (!b) return;
    const key = b.dataset.hcard;
    const set = new Set(state.aiHand || []);
    if (set.has(key)) set.delete(key); else set.add(key);
    state.aiHand = Array.from(set);
    syncAIHandToHand();
    save();
    paintAIHand();
    render();
  });
  ['aiUrl', 'aiKey', 'aiModel'].forEach(id => {
    const el = $('#' + id);
    if (!el) return;
    el.addEventListener('change', () => {
      state.ai = state.ai || { url: '', key: '', model: '' };
      state.ai[id.slice(2).toLowerCase()] = el.value.trim();
      save();
    });
  });

  $('#tkClear').onclick = () => {
    if (!state.tracker || !state.tracker.length) return;
    state.tracker = [];
    save(); paintTracker();
  };
  $('#tkGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-card]');
    if (!b) return;
    const key = b.dataset.card;
    const set = new Set(state.tracker || []);
    if (set.has(key)) set.delete(key); else set.add(key);
    state.tracker = Array.from(set);
    save(); paintTracker();
  });
  let swRaf = 0;
  $('#swipe').addEventListener('scroll', () => {
    if (swRaf) return;
    swRaf = requestAnimationFrame(() => {
      swRaf = 0;
      syncSwipe();
      paintBubble(board());
    });
  }, { passive: true });
  $('#sysPick').onclick = () => openPicker();

  // 我方
  $('#sidePick').addEventListener('click', e => {
    const b = e.target.closest('[data-seat]');
    if (!b) return;
    if (state.mySeat === b.dataset.seat) return;
    state.mySeat = b.dataset.seat;
    save(); render();
  });

  // 内嵌推荐：手牌输入
  ['ahHcp', 'ahS', 'ahH', 'ahD', 'ahC'].forEach(id => {
    const el = $('#' + id);
    if (!el) return;
    el.addEventListener('input', () => {
      const isHcp = id === 'ahHcp';
      const max = isHcp ? 37 : 13;
      const v = Math.max(0, Math.min(max, parseInt(el.value, 10) || 0));
      if (isHcp) state.hand.hcp = v;
      else state.hand[id.replace(/^(s|ah)/, '')] = v;
      save();
      paintAdvice();
      syncHandInputs();
    });
  });
  syncHandInputs();
  // 点推荐条目 = 选中该叫品
  $('#adOut').addEventListener('click', e => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    const bd = board();
    const bid = b.dataset.pick;
    if (bd.done) return;
    if (!legalSet(bd, seatToAct(bd)).has(bid)) return;
    state.inspect = null;
    state.sel = bid;
    const sw = $('#swipe');
    const needJump = sw && curPage() !== 1;
    if (needJump) sw.scrollTo({ left: sw.clientWidth, behavior: 'smooth' });
    render();
    if (needJump) setTimeout(() => paintBubble(board()), 360);
  });

  // 回看已叫出的叫品（仅在本局未结束时）
  $('#auction').addEventListener('click', e => {
    const sp = e.target.closest('[data-setdealer]');
    if (sp) {
      const bd = board();
      if (bd.auction.length || bd.done) return;
      if (bd.dealer === sp.dataset.setdealer) return;
      bd.dealer = sp.dataset.setdealer;
      state.sel = null;
      save(); render();
      return;
    }
    const cell = e.target.closest('[data-call]');
    if (!cell) return;
    const bd = board();
    if (bd.done) return;
    const idx = +cell.dataset.call;
    if (state.inspect === idx) {
      state.inspect = null;
    } else {
      state.inspect = idx;
      state.sel = null;
    }
    render();
  });
  $('#picker').addEventListener('click', e => {
    const card = e.target.closest('[data-sys]');
    if (card) { switchSystem(card.dataset.sys); return; }
    if (e.target.id === 'picker') closePicker();
  });
  $('#btnUndo').onclick = () => undo();
  document.addEventListener('click', e => {
    if (e.target.closest('#bubbleClose')) {
      state.sel = null;
      state.inspect = null;
      render();
      return;
    }
    // 用事件路径判断：点击后叫品盘会被重绘，e.target 可能已脱离文档，closest 会失效。
    // 只对「气泡本身 / 叫品按钮 / 记录格 / 推荐条目」放行，其余空白一律视为点击外部。
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    const has = (el, attr) => el && el.hasAttribute && el.hasAttribute(attr);
    const keep = path.some(el => {
      if (!el || !el.getAttribute) return false;
      if (el.id === 'bubble') return true;
      return has(el, 'data-bid') || has(el, 'data-call') ||
             has(el, 'data-setdealer') || has(el, 'data-pick');
    });
    if (keep) return;
    if (state.sel || state.inspect != null) {
      state.sel = null;
      state.inspect = null;
      render();
    }
  });

  let bubRaf = 0;
  const reflow = () => {
    if (bubRaf) return;
    bubRaf = requestAnimationFrame(() => { bubRaf = 0; paintBubble(board()); });
  };
  window.addEventListener('scroll', reflow, { passive: true });
  window.addEventListener('resize', reflow);

  bindKeys();
  render();
  paintTracker();
  paintAIHand();
  renderChat();
  syncSwipe();
  // 默认停在叫牌页（第 1 页）
  requestAnimationFrame(() => {
    const sw = $('#swipe');
    if (sw) sw.scrollLeft = sw.clientWidth;
    syncSwipe();
  });
  if (!loaded) openPicker();
}

document.addEventListener('DOMContentLoaded', init);
