/* ============================================================================
   SAYC（Standard American Yellow Card）叫牌规则数据集
   唯一依据：https://www.bridgebum.com/sayc.php 及其 SAYC 系列子页
     sayc.php（总览：开叫 / 加倍 / 满贯 / 争叫 / 首攻 / 信号）
     sayc_1c.php · sayc_1d.php · sayc_1h.php · sayc_1s.php
     1nt_15_17.php · strong_2c.php · weak_two.php
     stayman.php · jacoby_transfers.php · jacoby_2nt.php
     blackwood.php · gerber.php
   子页未涉及的内容一律标「未收录」，不臆造。
   ---------------------------------------------------------------------------
   字段：
     s 来源章节   t 语境  open/resp/opener/responder/def
     o 开叫叫品   r 应叫叫品   rb 开叫方再叫   b 叫品
     p 点力       pw 点力归属  d 说明        k 标签
   ========================================================================== */

const STRAINS = ['C', 'D', 'H', 'S', 'NT'];
const STRAIN_CN = { C: '梅花', D: '方块', H: '红心', S: '黑桃', NT: '无将' };
const SEATS = ['N', 'E', 'S', 'W'];
const SEAT_CN = { N: '北', E: '东', S: '南', W: '西' };

const RULES_SAYC = [];

function add(t, o, r, rb, b, p, pw, d, k, s, note) {
  RULES_SAYC.push({ s, t, o, r, rb, b, p, pw, d, k: k || [], note: note || '' });
}

/* ===== 00 总则（sayc.php 开篇） ===== */
const S00 = 'SAYC 通则（sayc.php）';
add('open', null, null, null, ['1C', '1D'], '13~22', null,
  '三张以上所叫低花。低花 4-4 先开 1♦，3-3 先开 1♣。', ['开叫'], S00);
add('open', null, null, null, ['1H', '1S'], '13~22', null,
  '五张以上所叫高花。5-5 或 6-6 两套等长时开较高花色。', ['开叫'], S00);
add('open', null, null, null, '1NT', '15~17', null,
  '均型（4-4-3-2 / 4-3-3-3 / 5-3-3-2），允许带五张高花或五张低花的半均型。', ['开叫'], S00);
add('open', null, null, null, '2NT', '20~21', null, '均型。', ['开叫'], S00);
add('open', null, null, null, '3NT', '25~27', null, '均型。', ['开叫'], S00);
add('open', null, null, null, '2C', null, null,
  '强开叫、人工：22+ HCP 的均型，或非均型「差一墩成局」（5+ 高花 9 赢墩、5+ 低花 10 赢墩）。', ['开叫', '逼叫'], S00);

/* ===== 01 一阶低花开叫与应叫 ===== */
const S1C = '1♣ 开叫（sayc_1c.php）';
add('resp', '1C', null, null, 'PASS', '0~5', 'responder', '牌力不足，不叫。', ['止叫'], S1C);
add('resp', '1C', null, null, '1D', '6 以上', 'responder', '4 张以上方块，逼叫。', ['逼叫'], S1C);
add('resp', '1C', null, null, ['1H', '1S'], '6 以上', 'responder',
  '4 张以上所叫高花，逼叫。两门高花 4-4 先叫 1♥，5-5 先叫 1♠。', ['逼叫'], S1C);
add('resp', '1C', null, null, '1NT', '6~9', 'responder',
  '均型，否认 4 张高花，通常否认 4 张梅花，不逼叫。', [], S1C);
add('resp', '1C', null, null, '2C', '6~9', 'responder',
  '单加叫：5 张以上梅花支持（手册规定加叫 1♣ 需五张），否认 4 张高花，不逼叫。', [], S1C);
add('resp', '1C', null, null, ['2D', '2H', '2S'], '17~19', 'responder',
  '强跳叫新花色：5 张以上所叫花色，逼叫到局。', ['逼叫'], S1C);
add('resp', '1C', null, null, '2NT', '13~15', 'responder',
  '均型，通常否认 4 张高花（持 4-3-3-3 除外），逼叫到局。', ['逼叫'], S1C);
add('resp', '1C', null, null, '3C', '10~12', 'responder',
  '限制性加叫：5 张以上梅花支持，否认 4 张高花，不逼叫。', ['邀局'], S1C);
add('resp', '1C', null, null, '3NT', '16~17', 'responder',
  '均型，通常否认 4 张高花（持 4-3-3-3 除外）。', [], S1C);
add('resp', '1C', null, null, '4NT', null, 'responder', '黑木问 A。', ['满贯'], S1C);

const S1D = '1♦ 开叫（sayc_1d.php）';
add('resp', '1D', null, null, 'PASS', '0~5', 'responder', '牌力不足，不叫。', ['止叫'], S1D);
add('resp', '1D', null, null, ['1H', '1S'], '6 以上', 'responder',
  '4 张以上所叫高花，逼叫。两门高花 4-4 先叫 1♥，5-5 先叫 1♠。', ['逼叫'], S1D);
add('resp', '1D', null, null, '1NT', '6~9', 'responder',
  '否认 4 张高花，通常否认 4 张方块；可以是带 5 张以上梅花的非均型，不逼叫。', [], S1D);
add('resp', '1D', null, null, '2C', '10 以上', 'responder', '4 张以上梅花，逼叫。', ['逼叫'], S1D);
add('resp', '1D', null, null, '2D', '6~9', 'responder',
  '单加叫：4 张以上方块支持，否认 4 张高花，不逼叫。', [], S1D);
add('resp', '1D', null, null, ['2H', '2S'], '17~19', 'responder',
  '强跳叫新花色：5 张以上所叫花色，逼叫到局。', ['逼叫'], S1D);
add('resp', '1D', null, null, '2NT', '13~15', 'responder',
  '均型，通常否认 4 张高花（持 4-3-3-3 除外），逼叫到局。', ['逼叫'], S1D);
add('resp', '1D', null, null, '3C', '17~19', 'responder',
  '强跳叫新花色：5 张以上梅花，逼叫到局。', ['逼叫'], S1D);
add('resp', '1D', null, null, '3D', '10~12', 'responder',
  '限制性加叫：4 张以上方块支持，否认 4 张高花，不逼叫。', ['邀局'], S1D);
add('resp', '1D', null, null, '3NT', '16~17', 'responder',
  '均型，通常否认 4 张高花（持 4-3-3-3 除外）。', [], S1D);
add('resp', '1D', null, null, '4NT', null, 'responder', '黑木问 A。', ['满贯'], S1D);

/* ===== 02 1♥ 开叫与应叫 ===== */
const S1H = '1♥ 开叫（sayc_1h.php）';
add('resp', '1H', null, null, 'PASS', '0~5', 'responder', '牌力不足，不叫。', ['止叫'], S1H);
add('resp', '1H', null, null, '1S', '6 以上', 'responder',
  '4 张以上黑桃，逼叫。持 4 张黑桃配 3 张红心时优先叫 1♠，先找 4-4 配。', ['逼叫'], S1H);
add('resp', '1H', null, null, '1NT', '6~10', 'responder',
  '否认 3 张红心支持与 4 张黑桃；可以是带 5 张以上低花的非均型，不逼叫。', ['示弱'], S1H);
add('resp', '1H', null, null, ['2C', '2D'], '11 以上', 'responder',
  '4 张以上所叫花色，逼叫。', ['逼叫'], S1H);
add('resp', '1H', null, null, '2H', '6~10', 'responder',
  '单加叫：3 张以上红心支持（按牌型点计），通常否认 4 张黑桃（4-4 双高花除外），不逼叫。', [], S1H);
add('resp', '1H', null, null, '2S', '17~19', 'responder',
  '强跳叫（strong jump shift）：5 张以上黑桃，邀满贯。手册只写「邀满贯」未给点力区间，17~19 为通行量化。', ['逼叫', '满贯'], S1H);
add('resp', '1H', null, null, '2NT', '13 以上', 'responder',
  '杰克贝 2NT（Jacoby 2NT）：4 张以上红心支持的逼局加叫，请开叫方描述牌型。', ['约定叫', '逼叫'], S1H);
add('resp', '1H', null, null, ['3C', '3D'], '17~19', 'responder',
  '强跳叫（strong jump shift）：5 张以上所叫花色，邀满贯。手册只写「邀满贯」，17~19 为通行量化。', ['逼叫', '满贯'], S1H);
add('resp', '1H', null, null, '3H', '10~12', 'responder',
  '限制性加叫：4 张红心，不逼叫。', ['邀局'], S1H);
add('resp', '1H', null, null, '3NT', '15~17', 'responder',
  '均型、两张红心支持，通常否认 4 张黑桃，逼叫到局。', ['逼叫'], S1H);
add('resp', '1H', null, null, '4H', '9 以下', 'responder',
  '通常 5 张以上红心并带单缺，少于 10 个大牌点，不逼叫。', ['止叫', '阻击'], S1H);
add('resp', '1H', null, null, '4NT', null, 'responder', '黑木问 A。', ['满贯'], S1H);

/* ===== 03 1♠ 开叫与应叫 ===== */
const S1S = '1♠ 开叫（sayc_1s.php）';
add('resp', '1S', null, null, 'PASS', '0~5', 'responder', '牌力不足，不叫。', ['止叫'], S1S);
add('resp', '1S', null, null, '1NT', '6~10', 'responder',
  '否认 3 张黑桃支持；可以是非均型、带 5 张以上旁花，不逼叫。', ['示弱'], S1S);
add('resp', '1S', null, null, ['2C', '2D', '2H'], '11 以上', 'responder',
  '4 张以上所叫花色，逼叫。', ['逼叫'], S1S);
add('resp', '1S', null, null, '2S', '6~10', 'responder',
  '单加叫：3 张以上黑桃支持（按牌型点计），不逼叫。', [], S1S);
add('resp', '1S', null, null, '2NT', '13 以上', 'responder',
  '杰克贝 2NT（Jacoby 2NT）：4 张以上黑桃支持的逼局加叫，请开叫方描述牌型。', ['约定叫', '逼叫'], S1S);
add('resp', '1S', null, null, ['3C', '3D', '3H'], '17~19', 'responder',
  '强跳叫（strong jump shift）：5 张以上所叫花色，邀满贯。手册只写「邀满贯」，17~19 为通行量化。', ['逼叫', '满贯'], S1S);
add('resp', '1S', null, null, '3S', '10~12', 'responder',
  '限制性加叫：4 张黑桃，不逼叫。', ['邀局'], S1S);
add('resp', '1S', null, null, '3NT', '15~17', 'responder',
  '均型、两张黑桃支持，通常否认 4 张红心，逼叫到局。', ['逼叫'], S1S);
add('resp', '1S', null, null, '4S', '9 以下', 'responder',
  '通常 5 张以上黑桃并带单缺，少于 10 个大牌点，不逼叫。', ['止叫', '阻击'], S1S);
add('resp', '1S', null, null, '4NT', null, 'responder', '黑木问 A。', ['满贯'], S1S);

/* ===== 04 一阶高花开叫后的开叫方再叫 ===== */
const S1HR = '1♥ — 1♠ 后再叫（sayc_1h.php）';
add('opener', '1H', '1S', null, '1NT', '12~14', 'opener', '均型，不逼叫。', [], S1HR);
add('opener', '1H', '1S', null, ['2C', '2D'], '13~18', 'opener', '4 张以上所叫花色，不逼叫。', [], S1HR);
add('opener', '1H', '1S', null, '2H', '13~15', 'opener', '6 张以上红心，不逼叫。', [], S1HR);
add('opener', '1H', '1S', null, '2S', '13~15', 'opener', '4 张支持同伴黑桃，不逼叫。', [], S1HR);
add('opener', '1H', '1S', null, '2NT', '18~19', 'opener', '均型，不逼叫。', [], S1HR);
add('opener', '1H', '1S', null, ['3C', '3D'], '19~22', 'opener',
  '4 张以上所叫花色，逼叫到局；牌型别扭时（如 1-6-3-3）三张也可。', ['逼叫'], S1HR);
add('opener', '1H', '1S', null, '3H', '16~18', 'opener', '6 张以上红心，不逼叫。', [], S1HR);
add('opener', '1H', '1S', null, '3S', '15~18', 'opener', '4 张支持，不逼叫。', [], S1HR);
add('opener', '1H', '1S', null, '4S', '19~22', 'opener', '4 张支持，不逼叫。', [], S1HR);

const S1HNT = '1♥ — 1NT 后再叫（sayc_1h.php）';
add('opener', '1H', '1NT', null, ['2C', '2D'], '13~18', 'opener', '4 张以上所叫花色，不逼叫。', [], S1HNT);
add('opener', '1H', '1NT', null, '2H', '13~15', 'opener', '6 张以上红心，不逼叫。', [], S1HNT);
add('opener', '1H', '1NT', null, '2S', '16 以上', 'opener', '逆叫：4 张以上黑桃，逼叫。', ['逼叫'], S1HNT);
add('opener', '1H', '1NT', null, '2NT', '18~19', 'opener', '均型，不逼叫。', [], S1HNT);
add('opener', '1H', '1NT', null, ['3C', '3D'], '19~22', 'opener', '4 张以上所叫花色，逼叫到局。', ['逼叫'], S1HNT);
add('opener', '1H', '1NT', null, '3H', '16~18', 'opener', '6 张以上红心，不逼叫。', [], S1HNT);

const S1H2M = '1♥ — 2♣/2♦ 后再叫（sayc_1h.php）';
add('opener', '1H', ['2C', '2D'], null, '2H', '13~15', 'opener',
  '加叫开叫花色到 2 阶：3 张以上支持，不逼叫。', [], S1H2M);
add('opener', '1H', ['2C', '2D'], null, '3H', '16~18', 'opener',
  '跳加叫开叫花色：6 张以上红心，逼叫到局。', ['逼叫'], S1H2M);
add('opener', '1H', ['2C', '2D'], null, '2NT', '12~14', 'opener', '均型，不逼叫。', [], S1H2M);
add('opener', '1H', ['2C', '2D'], null, '3NT', '18~19', 'opener', '均型，不逼叫。', [], S1H2M);
add('opener', '1H', ['2C', '2D'], null, ['3C'], '13~15', 'opener',
  '加叫同伴梅花：3 张以上支持，不逼叫（仅 1♥—2♣ 后）。', [], S1H2M);
add('opener', '1H', ['2C', '2D'], null, ['2D', '2S'], '16 以上', 'opener',
  '逆叫：4 张以上所叫花色，逼叫。', ['逼叫'], S1H2M);

const S1H2H = '1♥ — 2♥ 后再叫（sayc_1h.php）';
add('opener', '1H', '2H', null, '2NT', null, 'opener',
  '自然叫，通常表示红心较弱的好均型牌。', [], S1H2H);
add('opener', '1H', '2H', null, ['3C', '3D', '3S'], null, 'opener',
  '三阶新花色为红心邀局试探；应叫方按牌力与配合选择 3♥ 或 4♥。', ['邀局'], S1H2H);
add('opener', '1H', '2H', null, '3H', null, 'opener', '自然邀局。', ['邀局'], S1H2H);
add('opener', '1H', '2H', null, '4H', null, 'opener', '止叫。', ['止叫'], S1H2H);

const S1SR = '1♠ — 1NT 后再叫（sayc_1s.php）';
add('opener', '1S', '1NT', null, ['2C', '2D', '2H'], '13~18', 'opener', '4 张以上所叫花色，不逼叫。', [], S1SR);
add('opener', '1S', '1NT', null, '2S', '13~15', 'opener', '6 张以上黑桃，不逼叫。', [], S1SR);
add('opener', '1S', '1NT', null, '2NT', '18~19', 'opener', '均型，不逼叫。', [], S1SR);
add('opener', '1S', '1NT', null, ['3C', '3D', '3H'], '19~22', 'opener', '4 张以上所叫花色，逼叫到局。', ['逼叫'], S1SR);
add('opener', '1S', '1NT', null, '3S', '16~18', 'opener', '6 张以上黑桃，不逼叫。', [], S1SR);

const S1S2M = '1♠ — 2♣/2♦/2♥ 后再叫（sayc_1s.php）';
add('opener', '1S', ['2C', '2D', '2H'], null, '2NT', '12~14', 'opener', '均型，不逼叫。', [], S1S2M);
add('opener', '1S', ['2C', '2D', '2H'], null, '3NT', '18~19', 'opener', '均型，不逼叫。', [], S1S2M);
add('opener', '1S', ['2C', '2D', '2H'], null, '2S', '13~15', 'opener', '6 张以上黑桃，不逼叫。', [], S1S2M);
add('opener', '1S', ['2C', '2D', '2H'], null, '3S', '16~18', 'opener', '6 张以上黑桃，不逼叫。', [], S1S2M);

const S1S2S = '1♠ — 2♠ 后再叫（sayc_1s.php）';
add('opener', '1S', '2S', null, '2NT', null, 'opener',
  '自然叫，通常表示黑桃较弱的好均型牌。', [], S1S2S);
add('opener', '1S', '2S', null, ['3C', '3D', '3H'], null, 'opener',
  '三阶新花色为黑桃邀局试探；应叫方按牌力与配合选择 3♠ 或 4♠。', ['邀局'], S1S2S);
add('opener', '1S', '2S', null, '3S', null, 'opener', '自然邀局。', ['邀局'], S1S2S);
add('opener', '1S', '2S', null, '4S', null, 'opener', '止叫。', ['止叫'], S1S2S);

/* ===== 05 一阶低花开叫后的开叫方再叫 ===== */
const S1CR = '1♣/1♦ — 一阶应叫后再叫（sayc_1c.php / sayc_1d.php）';
add('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, '1NT', '12~14', 'opener', '均型，不逼叫。', [], S1CR);
add('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, '2NT', '18~19', 'opener', '均型，不逼叫。', [], S1CR);
add('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, ['2C', '2D'], '13~15', 'opener',
  '再叫开叫低花：6 张以上（1♣—1♠ 后 5 张也可），不逼叫。', [], S1CR);
add('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, ['3C', '3D'], '16~18', 'opener', '6 张以上，不逼叫。', [], S1CR);
add('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, ['2H', '2S'], '13~15', 'opener',
  '对同伴高花的单加叫：4 张以上支持，不逼叫。', [], S1CR);
add('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, ['3H', '3S'], '16~18', 'opener',
  '对同伴高花的双加叫：4 张以上支持，不逼叫。', [], S1CR);
add('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, ['4H', '4S'], '19~22', 'opener',
  '对同伴高花直接加叫到局：4 张以上支持，不逼叫。', [], S1CR);
add('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'jumpNewSuit' }, '19 以上', 'opener',
  '跳叫新花色：4 张以上（牌型别扭时三张也可），逼叫到局。', ['逼叫'], S1CR);
add('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'newSuit' }, '13~18', 'opener',
  '最便宜水平叫新花色：4 张以上，不逼叫。越过开叫花色两阶以上的新花色为逆叫，需 16 点以上且逼叫。', [], S1CR);

const S1CNT = '1♣/1♦ — 1NT 后再叫（sayc_1c.php / sayc_1d.php）';
add('opener', ['1C', '1D'], '1NT', null, '2NT', '18~19', 'opener', '均型，不逼叫。', [], S1CNT);
add('opener', ['1C', '1D'], '1NT', null, ['2C', '2D'], '13~15', 'opener', '6 张以上开叫花色，不逼叫。', [], S1CNT);
add('opener', ['1C', '1D'], '1NT', null, ['3C', '3D'], '16~18', 'opener', '6 张以上开叫花色，逼叫。', ['逼叫'], S1CNT);
add('opener', ['1C', '1D'], '1NT', null, { type: 'newSuit' }, '16 以上', 'opener',
  '逆叫：4 张以上新花色，逼叫。', ['逼叫'], S1CNT);

const S1D2C = '1♦ — 2♣ 后再叫（sayc_1d.php）';
add('opener', '1D', '2C', null, '2D', '13~15', 'opener',
  '6 张以上方块；若持 4 张高花而牌力不足以逆叫，5 张也可，不逼叫。', [], S1D2C);
add('opener', '1D', '2C', null, ['2H', '2S'], '16 以上', 'opener', '逆叫：4 张以上，逼叫。', ['逼叫'], S1D2C);
add('opener', '1D', '2C', null, '2NT', '12~14', 'opener', '均型，不逼叫。', [], S1D2C);
add('opener', '1D', '2C', null, '3C', '13~15', 'opener', '3 张以上梅花支持，不逼叫。', [], S1D2C);
add('opener', '1D', '2C', null, '3D', '16~18', 'opener', '6 张以上方块，不逼叫。', [], S1D2C);
add('opener', '1D', '2C', null, '3NT', '18~19', 'opener', '均型，不逼叫。', [], S1D2C);
add('opener', '1D', '2C', null, '4C', '16~18', 'opener', '4 张以上梅花支持，不逼叫。', [], S1D2C);

/* ===== 06 1NT 开叫（15~17）与应叫 ===== */
const S1NT = '1NT 开叫（1nt_15_17.php）';
add('resp', '1NT', null, null, 'PASS', '0~7', 'responder',
  '无五张高花、无六张低花，不叫。', ['止叫'], S1NT);
add('resp', '1NT', null, null, '2C', '8 以上', 'responder',
  '斯台曼：至少一门四张高花，通常排除 4-3-3-3 牌型。', ['约定叫'], S1NT);
add('resp', '1NT', null, null, '2D', '5 张以上 H', 'responder',
  '杰克贝转移叫：五张以上红心，开叫方必须叫 2♥。', ['转移叫'], S1NT);
add('resp', '1NT', null, null, '2H', '5 张以上 S', 'responder',
  '杰克贝转移叫：五张以上黑桃，开叫方必须叫 2♠。', ['转移叫'], S1NT);
add('resp', '1NT', null, null, '2S', '6 张以上低花', 'responder',
  '人工叫品：弱牌、六张以上低花。开叫方必须叫 3♣，应叫方 PASS 或改叫 3♦。', ['转移叫'], S1NT);
add('resp', '1NT', null, null, '2NT', '8~9', 'responder',
  '均型邀局，通常否认四张高花（持 4-3-3-3 除外）。', ['邀局'], S1NT);
add('resp', '1NT', null, null, ['3C', '3D'], '7~8', 'responder',
  '六张以上所叫低花，邀叫 3NT。', ['邀局'], S1NT);
add('resp', '1NT', null, null, '3H', '6 张以上 H', 'responder',
  '六张以上红心，满贯兴趣。', ['满贯'], S1NT);
add('resp', '1NT', null, null, '3S', '6 张以上 S', 'responder',
  '六张以上黑桃，满贯兴趣。', ['满贯'], S1NT);
add('resp', '1NT', null, null, '3NT', '10~13', 'responder', '自然叫，止叫。', ['止叫'], S1NT);
add('resp', '1NT', null, null, '4C', null, 'responder',
  '盖伯（Gerber）：问 A。', ['约定叫'], S1NT);
add('resp', '1NT', null, null, '4NT', null, 'responder',
  '定量邀叫：邀请开叫方高限时叫 6NT。', ['邀局'], S1NT);

/* ===== 07 2NT / 3NT 开叫与应叫 ===== */
const S2NT = '2NT 开叫（20~21，sayc.php）';
add('resp', '2NT', null, null, '3C', '8 以上', 'responder',
  '斯台曼：至少一门四张高花。', ['约定叫'], S2NT);
add('resp', '2NT', null, null, '3D', '5 张以上 H', 'responder',
  '杰克贝转移叫：五张以上红心，开叫方叫 3♥。', ['转移叫'], S2NT);
add('resp', '2NT', null, null, '3H', '5 张以上 S', 'responder',
  '杰克贝转移叫：五张以上黑桃，开叫方叫 3♠。', ['转移叫'], S2NT);
add('resp', '2NT', null, null, '3NT', '3~8', 'responder', '止叫。', ['止叫'], S2NT);
add('resp', '2NT', null, null, '4C', null, 'responder', '盖伯：问 A。', ['约定叫'], S2NT);
add('resp', '2NT', null, null, '4NT', null, 'responder',
  '定量邀叫：邀请开叫方高限时叫 6NT。', ['邀局'], S2NT);

const S3NT = '3NT 开叫（25~27，sayc.php）';
add('resp', '3NT', null, null, '4C', null, 'responder', '盖伯：问 A。', ['约定叫'], S3NT);
add('resp', '3NT', null, null, '4D', '5 张以上 H', 'responder',
  '杰克贝转移叫：五张以上红心，开叫方叫 4♥。', ['转移叫'], S3NT);
add('resp', '3NT', null, null, '4H', '5 张以上 S', 'responder',
  '杰克贝转移叫：五张以上黑桃，开叫方叫 4♠。', ['转移叫'], S3NT);

/* ===== 08 2♣ 强开叫与应叫 ===== */
const S2C = '2♣ 强开叫（strong_2c.php）';
add('resp', '2C', null, null, '2D', '0~7', 'responder',
  '人工「等待叫」（negative / waiting）：通常示弱；偶有 8 点以上但无合适叫品（如 4-4-4-1）。', ['示弱', '约定叫'], S2C);
add('resp', '2C', null, null, '2H', '8 以上', 'responder',
  '五张以上红心，自然、逼叫到局。', ['逼叫'], S2C);
add('resp', '2C', null, null, '2S', '8 以上', 'responder',
  '五张以上黑桃，自然、逼叫到局。', ['逼叫'], S2C);
add('resp', '2C', null, null, '2NT', '8 以上', 'responder',
  '均型，逼叫到局；此后无将体系（斯台曼、转移叫）全部启用。', ['逼叫'], S2C);
add('resp', '2C', null, null, '3C', '8 以上', 'responder',
  '五张以上梅花，自然、逼叫到局。', ['逼叫'], S2C);
add('resp', '2C', null, null, '3D', '8 以上', 'responder',
  '五张以上方块，自然、逼叫到局。', ['逼叫'], S2C);

const S2CR = '2♣ — 2♦ 等待叫后开叫方再叫（strong_2c.php）';
add('opener', '2C', '2D', null, '2H', '17 以上', 'opener', '五张以上红心，自然、逼叫一轮。', ['逼叫'], S2CR);
add('opener', '2C', '2D', null, '2S', '17 以上', 'opener', '五张以上黑桃，自然、逼叫一轮。', ['逼叫'], S2CR);
add('opener', '2C', '2D', null, '2NT', '22~24', 'opener', '均型；无将叫品不逼叫。', [], S2CR);
add('opener', '2C', '2D', null, '3C', '17 以上', 'opener', '五张以上梅花，自然、逼叫一轮。', ['逼叫'], S2CR);
add('opener', '2C', '2D', null, '3D', '17 以上', 'opener', '五张以上方块，自然、逼叫一轮。', ['逼叫'], S2CR);
add('opener', '2C', '2D', null, '3NT', '25~27', 'opener', '均型；无将叫品不逼叫。', [], S2CR);
add('opener', '2C', '2D', null, '4NT', '28~30', 'opener', '均型；无将叫品不逼叫。', [], S2CR);
add('opener', '2C', '2D', null, '5NT', '31~32', 'opener', '均型；无将叫品不逼叫。', [], S2CR);
add('opener', '2C', '2D', null, ['2D', '2H', '2S', '3C', '3D'], '17 以上', 'opener',
  '（花色再叫一律自然、逼叫一轮；4-4-4-1 建议按均型处理改叫无将。）', ['逼叫'], S2CR);

const S2CP = '2♣ — 正应叫后开叫方再叫（strong_2c.php）';
add('opener', '2C', ['2H', '2S', '3C', '3D'], null, '2NT', '23~24', 'opener', '均型。', [], S2CP);
add('opener', '2C', ['2H', '2S', '3C', '3D'], null, '3NT', '25~27', 'opener',
  '在 3♣/3♦ 之后为 23~24 均型；在 2♥/2♠ 之后（跳叫 3NT）为 25~27 均型。', [], S2CP);
add('opener', '2C', ['2H', '2S', '3C', '3D'], null, { type: 'raise' }, '17 以上', 'opener',
  '加叫同伴花色：3 张以上支持，自然。', [], S2CP);
add('opener', '2C', ['2H', '2S', '3C', '3D'], null, { type: 'newSuit' }, '17 以上', 'opener',
  '叫新花色：5 张以上，自然。', [], S2CP);

/* ===== 09 弱二开叫（2♦/2♥/2♠）与应叫 ===== */
const S2W = '弱二开叫（weak_two.php）';
add('open', null, null, null, ['2D', '2H', '2S'], '5~11', null,
  '六张所叫花色，牌力集中在该套；通常不另带四张高花。', ['开叫', '阻击'], S2W);
add('resp', ['2D', '2H', '2S'], null, null, ['3D', '3H', '3S'], '6~13', 'responder',
  '单加叫（RONF, Raise Only Non Forcing）：3~4 张支持，阻击、完全不逼叫。', ['阻击', '止叫'], S2W);
add('resp', ['2D', '2H', '2S'], null, null, ['4D', '4H', '4S'], null, 'responder',
  '跳加叫：通常为弱阻击（至少 4 张支持）；持 5 张支持时不论牌力都可直接跳加叫。', ['阻击'], S2W);
add('resp', ['2D', '2H', '2S'], null, null, { type: 'newSuit' }, null, 'responder',
  '新花色：自然、逼叫一轮，通常 5 张以上且不支持同伴花色。', ['逼叫'], S2W);
add('resp', ['2D', '2H', '2S'], null, null, '2NT', null, 'responder',
  '强人工逼叫：多用于持 3 张以上支持时。开叫方在三阶叫出有 A 或 K 的旁花；叫回原花色表示低限、无边花大牌。',
  ['约定叫', '逼叫'], S2W);

const S2WNT = '弱二 — 2NT 之后开叫方答叫（weak_two.php）';
add('opener', ['2D', '2H', '2S'], '2NT', null, ['3C', '3D', '3H', '3S'], null, 'opener',
  '三阶叫出有 A 或 K 的旁花（示特征）。', [], S2WNT);
add('opener', ['2D', '2H', '2S'], '2NT', null, ['3D', '3H', '3S'], null, 'opener',
  '叫回原开叫花色：低限牌、无旁花特征。', ['示弱'], S2WNT);

/* ===== 10 三阶、四阶阻击开叫 ===== */
const S34 = '三阶 / 四阶开叫（sayc.php）';
add('open', null, null, null, ['3C', '3D', '3H', '3S'], '5~11', null,
  '七张所叫花色，阻击叫。', ['开叫', '阻击'], S34);
add('open', null, null, null, ['4C', '4D'], '5~11', null,
  '八张所叫花色，阻击叫。', ['开叫', '阻击'], S34);
add('open', null, null, null, ['4H', '4S'], null, null,
  '七张以上所叫高花；无局约 7 个赢墩，有局约 8 个赢墩。', ['开叫', '阻击'], S34);

/* ===== 11 满贯约定叫：答叫统一由 ANSWER_RULES 按「问叫触发」处理 ===== */

/* ===== 12 争叫与加倍 ===== */
const SOV = '争叫 / 加倍（sayc.php）';
add('def', null, null, null, { type: 'newSuit', level: 1 }, '8~16', 'overcaller',
  '一阶花色争叫：4 张以上所叫花色。', [], SOV);
add('def', null, null, null, '1NT', '15~18', 'overcaller', '均型争叫。', [], SOV);
add('def', null, null, null, { type: 'jumpSuit' }, '5~11', 'overcaller',
  '弱跳争叫：6 张所叫花色，阻击。', ['阻击'], SOV);
add('def', null, null, null, 'X', null, 'overcaller',
  '技术性加倍：要求同伴叫出未叫过的花色；或 17 点以上的强牌。', ['约定叫'], SOV);
add('def', null, null, null, { type: 'cue' }, null, 'overcaller',
  '扣叫对方花色：迈克尔斯（Michaels），表示 5-5 以上的两套牌。', ['约定叫'], SOV);
add('def', null, null, null, '2NT', null, 'overcaller',
  '不寻常 2NT（Unusual 2NT）：5-5 以上的两门较低未叫花色。', ['约定叫'], SOV);
add('def', null, null, null, 'XX', null, 'overcaller',
  'SOS 再加倍：对方惩罚性加倍后，要求同伴改叫。', ['约定叫'], SOV);

/* ===== 13 斯台曼答叫与后续 ===== */
const SSTM = '斯台曼答叫（stayman.php）';
add('opener', '1NT', '2C', null, '2D', null, 'opener', '否认四张高花。', [], SSTM);
add('opener', '1NT', '2C', null, '2H', null, 'opener', '四张红心，可能还有四张黑桃。', [], SSTM);
add('opener', '1NT', '2C', null, '2S', null, 'opener', '四张黑桃，否认四张红心。', [], SSTM);

const SSTM2D = '斯台曼 — 2♦ 之后应叫方再叫（stayman.php）';
add('responder', '1NT', '2C', ['2D'], '2H', null, 'responder', '四张黑桃 + 五张红心，邀局，不逼叫。', ['邀局'], SSTM2D);
add('responder', '1NT', '2C', ['2D'], '2S', null, 'responder', '五张黑桃 + 四张红心，邀局，不逼叫。', ['邀局'], SSTM2D);
add('responder', '1NT', '2C', ['2D'], '2NT', null, 'responder', '邀局。', ['邀局'], SSTM2D);
add('responder', '1NT', '2C', ['2D'], ['3C', '3D'], null, 'responder',
  '逼叫到局：5 张以上（通常 6 张）所叫低花，不保证四张高花。', ['逼叫'], SSTM2D);
add('responder', '1NT', '2C', ['2D'], '3H', null, 'responder', '四张黑桃 + 五张红心，逼叫到局。', ['逼叫'], SSTM2D);
add('responder', '1NT', '2C', ['2D'], '3S', null, 'responder', '五张黑桃 + 四张红心，逼叫到局。', ['逼叫'], SSTM2D);
add('responder', '1NT', '2C', ['2D'], '3NT', null, 'responder', '止叫。', ['止叫'], SSTM2D);
add('responder', '1NT', '2C', ['2D'], '4H', null, 'responder', '四张黑桃 + 六张红心，止叫。', ['止叫'], SSTM2D);
add('responder', '1NT', '2C', ['2D'], '4S', null, 'responder', '六张黑桃 + 四张红心，止叫。', ['止叫'], SSTM2D);
add('responder', '1NT', '2C', ['2D'], '4NT', null, 'responder', '定量邀叫，邀请 6NT。', ['邀局'], SSTM2D);

const SSTM2H = '斯台曼 — 2♥ 之后应叫方再叫（stayman.php）';
add('responder', '1NT', '2C', ['2H'], '2S', null, 'responder', '五张黑桃 + 四张红心，邀局，不逼叫。', ['邀局'], SSTM2H);
add('responder', '1NT', '2C', ['2H'], '2NT', null, 'responder',
  '四张黑桃、红心不足四张，邀局。开叫方可 PASS、3♠ 止叫、4♠ 封局或 3NT。', ['邀局'], SSTM2H);
add('responder', '1NT', '2C', ['2H'], ['3C', '3D'], null, 'responder',
  '逼叫到局：5 张以上（通常 6 张）所叫低花，不保证四张高花。', ['逼叫'], SSTM2H);
add('responder', '1NT', '2C', ['2H'], '3H', null, 'responder', '四张红心，邀局。', ['邀局'], SSTM2H);
add('responder', '1NT', '2C', ['2H'], '3S', null, 'responder', '五张以上黑桃 + 四张红心，逼叫到局。', ['逼叫'], SSTM2H);
add('responder', '1NT', '2C', ['2H'], '3NT', null, 'responder', '四张黑桃、红心不足四张；开叫方可 PASS 或持四张黑桃改 4♠。', [], SSTM2H);
add('responder', '1NT', '2C', ['2H'], '4H', null, 'responder', '止叫。', ['止叫'], SSTM2H);
add('responder', '1NT', '2C', ['2H'], '4NT', null, 'responder', '定量邀叫，邀请 6NT。', ['邀局'], SSTM2H);

const SSTM2S = '斯台曼 — 2♠ 之后应叫方再叫（stayman.php）';
add('responder', '1NT', '2C', ['2S'], '2NT', null, 'responder', '邀局。', ['邀局'], SSTM2S);
add('responder', '1NT', '2C', ['2S'], ['3C', '3D'], null, 'responder',
  '逼叫到局：5 张以上（通常 6 张）所叫低花，不保证四张高花。', ['逼叫'], SSTM2S);
add('responder', '1NT', '2C', ['2S'], '3H', null, 'responder', '四张黑桃 + 五张红心，逼叫到局。', ['逼叫'], SSTM2S);
add('responder', '1NT', '2C', ['2S'], '3S', null, 'responder', '四张黑桃，邀局。', ['邀局'], SSTM2S);
add('responder', '1NT', '2C', ['2S'], '3NT', null, 'responder', '四张红心，止叫。', ['止叫'], SSTM2S);
add('responder', '1NT', '2C', ['2S'], '4S', null, 'responder', '止叫。', ['止叫'], SSTM2S);
add('responder', '1NT', '2C', ['2S'], '4NT', null, 'responder', '定量邀叫，邀请 6NT。', ['邀局'], SSTM2S);

/* ===== 14 转移叫完成与后续 ===== */
const STRF = '转移叫完成（jacoby_transfers.php）';
add('opener', '1NT', '2D', null, '2H', null, 'opener', '完成转移：应叫方为五张以上红心。', ['转移叫'], STRF);
add('opener', '1NT', '2H', null, '2S', null, 'opener', '完成转移：应叫方为五张以上黑桃。', ['转移叫'], STRF);
add('opener', '1NT', '2D', null, '3H', '17 以上', 'opener',
  '超级接受：四张红心支持 + 17 点，直接跳叫 3♥。', ['转移叫'], STRF);
add('opener', '1NT', '2H', null, '3S', '17 以上', 'opener',
  '超级接受：四张黑桃支持 + 17 点，直接跳叫 3♠。', ['转移叫'], STRF);

const STRFH = '1NT — 2♦ — 2♥ 之后应叫方再叫（jacoby_transfers.php）';
add('responder', '1NT', '2D', ['2H'], 'PASS', '0~7', 'responder', '弱牌，五张以上红心。', ['止叫'], STRFH);
add('responder', '1NT', '2D', ['2H'], '2S', '8~9', 'responder',
  '五张红心 + 五张黑桃，邀局，不逼叫。', ['邀局'], STRFH);
add('responder', '1NT', '2D', ['2H'], '2NT', null, 'responder',
  '均型或半均型、五张红心，邀局。开叫方可 PASS、3♥ 止叫或 3NT。', ['邀局'], STRFH);
add('responder', '1NT', '2D', ['2H'], ['3C', '3D'], null, 'responder',
  '五张以上红心 + 4 张以上所叫低花，逼叫到局。', ['逼叫'], STRFH);
add('responder', '1NT', '2D', ['2H'], '3H', null, 'responder',
  '六张以上红心，邀局。开叫方可 PASS 或 4♥。', ['邀局'], STRFH);
add('responder', '1NT', '2D', ['2H'], '3S', null, 'responder',
  '黑桃单缺、满贯兴趣（非原版约定，可选用）。', ['满贯'], STRFH);
add('responder', '1NT', '2D', ['2H'], '3NT', null, 'responder',
  '均型（无单缺）、五张红心。开叫方可 PASS 或改 4♥。', [], STRFH);
add('responder', '1NT', '2D', ['2H'], '4H', null, 'responder', '六张以上红心，止叫。', ['止叫'], STRFH);
add('responder', '1NT', '2D', ['2H'], '4NT', null, 'responder',
  '定量邀叫，邀请红心或无将满贯；开叫方可改 5♥。', ['邀局'], STRFH);

const STRFS = '1NT — 2♥ — 2♠ 之后应叫方再叫（jacoby_transfers.php）';
add('responder', '1NT', '2H', ['2S'], 'PASS', '0~7', 'responder', '弱牌，五张以上黑桃。', ['止叫'], STRFS);
add('responder', '1NT', '2H', ['2S'], '2NT', null, 'responder',
  '均型或半均型、五张黑桃，邀局。开叫方可 PASS、3♠ 止叫或 3NT。', ['邀局'], STRFS);
add('responder', '1NT', '2H', ['2S'], ['3C', '3D'], null, 'responder',
  '五张以上黑桃 + 4 张以上所叫低花，逼叫到局。', ['逼叫'], STRFS);
add('responder', '1NT', '2H', ['2S'], '3H', null, 'responder',
  '五张以上黑桃 + 五张以上红心，逼叫到局且满贯兴趣（强于直接 4♥）。', ['满贯'], STRFS);
add('responder', '1NT', '2H', ['2S'], '3S', null, 'responder',
  '六张以上黑桃，邀局。开叫方可 PASS 或 4♠。', ['邀局'], STRFS);
add('responder', '1NT', '2H', ['2S'], '3NT', null, 'responder',
  '均型（无单缺）、五张黑桃。开叫方可 PASS 或改 4♠。', [], STRFS);
add('responder', '1NT', '2H', ['2S'], '4H', null, 'responder',
  '五张以上黑桃 + 五张以上红心，成局牌力；开叫方可 PASS 或改 4♠。', [], STRFS);
add('responder', '1NT', '2H', ['2S'], '4S', null, 'responder', '六张以上黑桃，止叫。', ['止叫'], STRFS);
add('responder', '1NT', '2H', ['2S'], '4NT', null, 'responder',
  '定量邀叫，邀请黑桃或无将满贯；开叫方可改 5♠。', ['邀局'], STRFS);

/* ===== 15 黑木 / 盖伯 答叫（按「最后叫品是问叫」触发） ===== */
const ANSWERS_SAYC = {
  blackwood: {
    '5C': [{ p: null, d: '答 0 个或 4 个 A。', s: '黑木 4NT（blackwood.php）', k: ['满贯'] }],
    '5D': [{ p: null, d: '答 1 个 A。', s: '黑木 4NT（blackwood.php）', k: ['满贯'] }],
    '5H': [{ p: null, d: '答 2 个 A。', s: '黑木 4NT（blackwood.php）', k: ['满贯'] }],
    '5S': [{ p: null, d: '答 3 个 A。', s: '黑木 4NT（blackwood.php）', k: ['满贯'] }]
  },
  blackwoodK: {
    '6C': [{ p: null, d: '答 0 个或 4 个 K。', s: '黑木 5NT 问 K（blackwood.php）', k: ['满贯'] }],
    '6D': [{ p: null, d: '答 1 个 K。', s: '黑木 5NT 问 K（blackwood.php）', k: ['满贯'] }],
    '6H': [{ p: null, d: '答 2 个 K。', s: '黑木 5NT 问 K（blackwood.php）', k: ['满贯'] }],
    '6S': [{ p: null, d: '答 3 个 K。', s: '黑木 5NT 问 K（blackwood.php）', k: ['满贯'] }]
  },
  gerber: {
    '4D': [{ p: null, d: '答 0 个或 4 个 A。', s: '盖伯 4♣（gerber.php）', k: ['满贯'] }],
    '4H': [{ p: null, d: '答 1 个 A。', s: '盖伯 4♣（gerber.php）', k: ['满贯'] }],
    '4S': [{ p: null, d: '答 2 个 A。', s: '盖伯 4♣（gerber.php）', k: ['满贯'] }],
    '4NT': [{ p: null, d: '答 3 个 A。', s: '盖伯 4♣（gerber.php）', k: ['满贯'] }]
  },
  gerberK: {
    '5D': [{ p: null, d: '答 0 个或 4 个 K。', s: '盖伯 5♣ 问 K（gerber.php）', k: ['满贯'] }],
    '5H': [{ p: null, d: '答 1 个 K。', s: '盖伯 5♣ 问 K（gerber.php）', k: ['满贯'] }],
    '5S': [{ p: null, d: '答 2 个 K。', s: '盖伯 5♣ 问 K（gerber.php）', k: ['满贯'] }],
    '5NT': [{ p: null, d: '答 3 个 K。', s: '盖伯 5♣ 问 K（gerber.php）', k: ['满贯'] }]
  }
};
const NOTES_SAYC = [
  { t: 'resp', o: ['1C', '1D', '1H', '1S'], r: null, s: 'SAYC 通则',
    cond: { respBid: ['2D', '2H', '2S', '3C', '3D', '3H'] },
    text: '跳叫新花色为强跳叫（Strong Jump Shift）：17~19 点、5 张以上好套，逼叫到局。' },
  { t: 'opener', o: ['1C', '1D'], r: null, s: '1♣/1♦ 再叫通则',
    text: '开叫方的优先顺序：先加叫同伴高花（4 张支持），再叫无将显示 12~14 / 18~19，再叫开叫低花显示 6 张，最后才是叫新花色。' },
  { t: 'opener', o: ['1H', '1S'], r: null, s: '一阶高花再叫通则',
    text: '开叫方 12~14 均型叫 1NT；13~15 六张套再叫原花色；18~19 均型跳叫 2NT；19~22 跳叫新花色为逼叫到局。' },
  { t: 'opener', o: '1NT', r: '2C', s: '斯台曼答叫（stayman.php）',
    text: '2♦ 否认四张高花；2♥ 四张红心、可能还有四张黑桃；2♠ 四张黑桃、否认四张红心。' },
  { t: 'responder', o: '1NT', r: '2C', rb: ['2D', '2H', '2S'], s: '斯台曼后续（stayman.php）',
    text: '2NT 邀局；3♣/3♦ 逼局、5 张以上（通常 6 张）低花；3♥/3♠ 显示 5-4 双高花；4NT 定量邀 6NT。' },
  { t: 'resp', o: '1NT', r: null, s: '1NT 被干扰后（ACBL 手册）',
    cond: { contested: true },
    text: '对方加倍：斯台曼与转移仍然有效（2♣ 仍是斯台曼，2♦/2♥ 仍是转移）。对方争叫：约定应叫关闭，叫品均为自然，唯一例外是扣叫对方花色——表示进局实力，代替斯台曼。' },
  { t: 'opener', o: '1NT', r: ['2D', '2H'], s: '转移叫完成（jacoby_transfers.php）',
    text: '开叫方必须完成转移（2♦→2♥、2♥→2♠）。持 4 张支持且 17 点时可「超级接受」，直接跳叫 3♥/3♠。' },
  { t: 'responder', o: '1NT', r: ['2D', '2H'], rb: ['2H', '2S'], s: '转移后续（jacoby_transfers.php）',
    text: '转移完成后：PASS 示弱 0~7；2NT 均型邀局；3 阶低花 5 张以上第二套、逼局；3 阶原高花 6 张邀局；3NT 均型 5 张高花；4 阶原高花 6 张止叫；4NT 定量。' },
  { t: 'opener', o: ['1H', '1S'], r: '2NT', s: '杰克贝 2NT 答叫（jacoby_2nt.php）',
    text: '3♣/3♦/3♥/3♠ 叫新花色 = 该花色单缺；叫回将牌到 3 阶 = 16 点以上、满贯兴趣；3NT = 14~15 均型；4 阶将牌 = 12~14 均型止叫；4 阶低花 = 5 张以上第二套。' },
  { t: 'opener', o: '2C', r: '2D', s: '2♣ — 2♦ 之后（strong_2c.php）',
    text: '花色再叫自然、逼叫一轮；无将再叫不逼叫（2NT 22~24、3NT 25~27、4NT 28~30、5NT 31~32）。' },
  { t: 'responder', o: '2C', r: '2D', rb: ['2H', '2S', '3C', '3D'], s: '2♣ — 2D 之后应叫方再叫（strong_2c.php）',
    text: '单加叫同伴花色 = 3 张以上支持、有满贯兴趣（即使首叫是 2♦）；双跳加叫 = 止叫（「快达」原则）。其余叫品自然。' },
  { t: 'opener', o: ['2D', '2H', '2S'], r: '2NT', s: '弱二 — 2NT 之后（weak_two.php）',
    text: '开叫方在三阶叫出有 A 或 K 的旁花；叫回原花色表示低限、无旁花大牌。' },
  { t: 'resp', o: '3NT', r: null, s: '3NT 开叫后（sayc.php）',
    text: '3NT 为 25~27 均型；应叫方 4♣ 盖伯问 A，4♦/4♥ 为转移叫。' }
];

/* ---------------------------------------------------------------------------
   约定叫速查
   ------------------------------------------------------------------------- */
const CONVS_SAYC = [
  { s: '黑木 Blackwood 4NT（blackwood.php）', q: '4NT', a: '问同伴手上有几个 A（有将定约）',
    rows: [['5♣', '0 个或 4 个 A'], ['5♦', '1 个 A'], ['5♥', '2 个 A'], ['5♠', '3 个 A']],
    note: '同伴答叫后，问叫方的再叫均为自然叫，唯一例外是 5NT 继续问 K：6♣=0或4、6♦=1、6♥=2、6♠=3。' },
  { s: '盖伯 Gerber 4♣（gerber.php）', q: '4♣', a: '问同伴手上有几个 A（无将定约）',
    rows: [['4♦', '0 个或 4 个 A'], ['4♥', '1 个 A'], ['4♠', '2 个 A'], ['4NT', '3 个 A']],
    note: '再叫 5♣ 问 K：5♦=0或4、5♥=1、5♠=2、5NT=3。仅用于无将；1NT—4NT 是定量邀叫，不是黑木。' },
  { s: '斯台曼 Stayman（stayman.php）', q: '2♣ / 3♣', a: '问开叫方的四张高花',
    rows: [['2♦', '否认四张高花'], ['2♥', '四张红心，可能还有四张黑桃'], ['2♠', '四张黑桃，否认四张红心']],
    note: '1NT—2♣、2NT—3♣ 使用；1NT 被惩罚性加倍后 2♣ 改为自然止叫。' },
  { s: '杰克贝转移叫 Jacoby Transfers（jacoby_transfers.php）', q: '2♦ / 2♥', a: '转移高花',
    rows: [['2♦ → 2♥', '五张以上红心'], ['2♥ → 2♠', '五张以上黑桃'], ['2♠ → 3♣', '六张以上低花（人工）']],
    note: '1NT 被加倍后转移仍开；被争叫后转移关闭。开叫方持 4 张支持且 17 点可跳叫 3 阶「超级接受」。' },
  { s: '大满贯逼叫 Grand Slam Force（sayc.php）', q: '5NT', a: '要求同伴在三张将牌大牌中持两张时叫大满贯',
    rows: [['6 阶将牌', '将牌大牌不足两张以上'], ['7 阶将牌', '持三张将牌大牌中的两张']],
    note: 'SAYC 总览页仅列出此用途；5NT 在 1NT 开叫后另有「大满贯定量邀叫」用法。' },
  { s: '杰克贝 2NT Jacoby 2NT（jacoby_2nt.php）', q: '1♥/1♠ — 2NT', a: '4 张以上将牌支持的逼局加叫',
    rows: [['3 阶新花色', '该花色单缺'], ['3 阶将牌', '16 点以上，满贯兴趣'], ['3NT', '14~15 点均型'], ['4 阶将牌', '12~14 点均型，止叫']],
    note: '要求 13 点以上、其中至少 11 HCP；同伴加倍后 2NT 改为乔丹 2NT（限制性加叫或更好）。' }
];

/* ---------------- 注册体系 ---------------- */
registerSystem({
  key: 'sayc',
  name: 'SAYC',
  full: 'Standard American Yellow Card',
  by: 'ACBL · bridgebum.com',
  rules: RULES_SAYC,
  notes: NOTES_SAYC,
  convs: CONVS_SAYC,
  answers: ANSWERS_SAYC,
  blurb: '五张高花开叫、1NT 15~17 的强无将体系，BBO 等平台的默认约定卡。'
});
