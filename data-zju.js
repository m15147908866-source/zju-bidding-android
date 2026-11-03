/* ============================================================================
   浙大自然叫牌体系 —— 规则数据集
   唯一依据：《公共体系最终版.doc》（世界桥联约定卡格式，含开叫表 307 行、
   防守与竞争叫牌 84 行）。
   ---------------------------------------------------------------------------
   字段：s 来源 / t 语境 / o 开叫 / r 应叫 / rb 开叫方再叫 / b 叫品
        p 点力 / pw 点力归属 / d 说明 / k 标签
   ========================================================================== */

const RULES_ZJU = [];

function zju(t, o, r, rb, b, p, pw, d, k, s, note) {
  RULES_ZJU.push({ s, t, o, r, rb, b, p, pw, d, k: k || [], note: note || '' });
}

const ZR = 'responder';
const ZO = 'opener';

/* =========================================================================--
   一、开叫
   ========================================================================= */
const Z_OPEN = '浙大体系 · 开叫表';

zju('open', null, null, null, '1C', '12~21', null,
  '3 张以上梅花，无 5 张高花。低花 3-3 时开 1♣。', ['开叫'], Z_OPEN);
zju('open', null, null, null, '1D', '12~21', null,
  '3 张以上方块，无 5 张高花。低花 4-4 时开 1♦（♦ 极差时可视作 3 张）。', ['开叫'], Z_OPEN);
zju('open', null, null, null, '1H', '12~21', null, '5 张以上红心。', ['开叫'], Z_OPEN);
zju('open', null, null, null, '1S', '12~21', null, '5 张以上黑桃。', ['开叫'], Z_OPEN);
zju('open', null, null, null, '1NT', '15~17', null,
  '平均牌型，允许 5 张高花（持 5M 时另一门高花一般少于 4 张），允许 6 张低花（不鼓励）。', ['开叫'], Z_OPEN);
zju('open', null, null, null, '2C', null, null,
  '强开叫：手上赢墩离进局只差 1 墩；或 22P 以上平均牌型；或其他一阶开叫后可能丢局的牌。双套好牌或单一低花套不鼓励开 2♣。',
  ['开叫', '逼叫'], Z_OPEN);
zju('open', null, null, null, '2D', null, null,
  '双高阻击：保证 4-5 两门高花。无局 6~10P，有局 8~10P。', ['开叫', '阻击'], Z_OPEN);
zju('open', null, null, null, ['2H', '2S'], '6~11', null,
  '6 张以上所叫高花。好套的标准：同伴两张小牌支持时可望只输一墩。', ['开叫', '阻击'], Z_OPEN);
zju('open', null, null, null, '2NT', '20~22', null,
  '均型或半均型，允许 5 张高花、6 张低花。', ['开叫'], Z_OPEN);
zju('open', null, null, null, ['3C', '3D'], null, null,
  '一般 7 张，有利条件下允许好 6 张。', ['开叫', '阻击'], Z_OPEN);
zju('open', null, null, null, ['3H', '3S'], null, null,
  '一般 7 张，有利条件下允许好 6 张；也允许 6 张高花 + 4 张低花。', ['开叫', '阻击'], Z_OPEN);
zju('open', null, null, null, '3NT', null, null,
  '赌博性：7~8 张坚固低花套（AKQ 领头），边花没有 A 和 K。', ['开叫', '约定叫'], Z_OPEN);
zju('open', null, null, null, ['4C', '4D'], null, null,
  'Namyats：7~8 张所叫高花（4♣ 为红心、4♦ 为黑桃），旁门最多 1 个 A，8~8.5 个做牌赢墩，至少 1.5 个防守赢墩；有利时允许 7 张。',
  ['开叫', '约定叫'], Z_OPEN);
zju('open', null, null, null, ['4H', '4S'], '6~12', null, '8 张以上所叫高花。', ['开叫', '阻击'], Z_OPEN);
zju('open', null, null, null, '4NT', null, null, '问 A。', ['开叫', '约定叫', '满贯'], Z_OPEN);
zju('open', null, null, null, ['5C', '5D'], null, null, '9 张，有利条件下允许较好的 8 张。', ['开叫', '阻击'], Z_OPEN);
zju('open', null, null, null, ['5H', '5S'], null, null,
  '要求同伴在将牌上持三顶张之一时叫到 6 阶。', ['开叫', '约定叫'], Z_OPEN);

/* =========================================================================--
   二、1♣ / 1♦ 应叫
   ========================================================================= */
const Z1C = '浙大体系 · 1♣/1♦ 应叫';

zju('resp', ['1C', '1D'], null, null, ['1D', '1H', '1S'], '6 以上', ZR,
  '一盖一应叫：高花 4 张以上。未 PASS 过时逼叫。1♣ 开叫后优先显示 4 张高花。', ['逼叫'], Z1C);
zju('resp', ['1C', '1D'], null, null, '1NT', null, ZR,
  '均型。1♣—1NT 为 8~10P（6~7P 均型先叫 1♦）；1♦—1NT 表示均型。', [], Z1C);
zju('resp', ['1C', '1D'], null, null, { type: 'raise' }, '11 以上', ZR,
  '单加叫：一般 5 张支持，保证 4 张。逼叫，后续谁越过 3 阶就基本确定进局。', ['逼叫'], Z1C);
zju('resp', ['1C', '1D'], null, null, { type: 'doubleRaise' }, '5 以下', ZR,
  '双加叫：5 张支持，阻击性。', ['阻击'], Z1C);
zju('resp', ['1C', '1D'], null, null, '2NT', '11~12', ZR,
  '均型，否认 4 张高花。', ['邀局'], Z1C);
zju('resp', ['1C', '1D'], null, null, '3NT', '13~15', ZR,
  '均型，否认 4 张高花。', [], Z1C);
zju('resp', '1C', null, null, ['2H', '2S'], '弱', ZR,
  '跳叫高花：弱牌，点力基本集中在所叫套，至少 6 张。', ['弱'], Z1C);
zju('resp', '1C', null, null, '2D', '5 以下', ZR,
  '1♣—2♦：两门高花 5-5，弱牌。', ['约定叫'], Z1C);
zju('resp', '1D', null, null, '2C', '12 以上', ZR,
  '二盖一：保证 5 张，未 PASS 过为进局逼叫；已 PASS 过逼叫一轮（除非开叫人轻开叫）。', ['逼叫'], Z1C);
zju('resp', '1D', null, null, '2H', '7~9', ZR,
  '1♦—2♥：红心-黑桃 5-4。', ['约定叫'], Z1C);
zju('resp', '1D', null, null, '2S', '9~12', ZR,
  '1♦—2S：红心-黑桃 5-4，邀局实力。', ['约定叫'], Z1C);
zju('resp', '1D', null, null, '3C', null, ZR, '梅花套邀请。', ['邀局'], Z1C);
zju('resp', ['1C', '1D'], null, null, { type: 'splinter' }, null, ZR,
  '双跳新花：爆裂叫，5 张支持，满贯倾向。', ['约定叫', '满贯'], Z1C);
zju('resp', ['1C', '1D'], null, null, { type: 'raise', level: 4 }, null, ZR,
  '4 阶开叫低花：罗马关键张问叫（RKCB）。', ['约定叫', '满贯'], Z1C);
zju('resp', ['1C', '1D'], null, null, '4NT', null, ZR, '简单问 A。', ['约定叫', '满贯'], Z1C);

/* =========================================================================--
   三、1♣ / 1♦ 开叫方再叫
   ========================================================================= */
const Z1CR = '浙大体系 · 1♣/1♦ 开叫方再叫';

zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'newSuit', level: 1 }, '12~17', ZO,
  '再一盖一：4 张，半逼叫（仅应叫人低限且有支持时可不叫）。', [], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, '1NT', '12~14', ZO,
  '均型，可能有未叫的 4 张高花。', [], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'newSuit', level: 2 }, '12~17', ZO,
  '顺叫 2 阶新花：4 张，开叫花色一般 5 张。', [], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'rebidOwn' }, '12~14', ZO,
  '再叫原花：低花 5 张，高花有时 6 张。', [], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'raise' }, '12~14', ZO,
  '单加叫：4 张支持。', [], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'jumpRaise' }, '15~17', ZO,
  '双加叫：较好 4 张支持，邀局，一般控制较差或点力较散。', ['邀局'], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'jumpRaise', level: 3 }, '18~19', ZO,
  '高花三加叫：4 张支持，均型。', ['邀局'], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'reverse' }, '17 以上', ZO,
  '逆叫新花：4 张，逼叫一轮。', ['逼叫'], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'jumpNewSuit' }, '18 以上', ZO,
  '跳叫新花：4 张，开叫花色一般 5 张，进局逼叫。', ['逼叫'], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, '2NT', '18~20', ZO,
  '跳叫 2NT：好 18 至差 20P，平均牌型。', ['邀局'], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'jumpRebidOwn' }, '15~17', ZO,
  '跳叫原花：好 6 张套，邀请。', ['邀局'], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'doubleJumpOwn' }, null, ZO,
  '双跳原花至 4 阶：高花为 8 张，稍有配合的牌型牌，进局逼叫；低花为好 5 张以上。', ['逼叫'], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, '3NT', null, ZO,
  '跳叫 3NT：无高花兴趣，低花 6~7 张坚固套，非均型，未叫花色有止。', [], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'splinter' }, '15 以上', ZO,
  '双跳、逆跳新花：爆裂叫，进局逼叫，一般没有满贯兴趣（好 15P 以上除外）。', ['约定叫'], Z1CR);
zju('opener', ['1C', '1D'], ['1D', '1H', '1S'], null, { type: 'exclusion' }, '15 以上', ZO,
  '逆双跳新花：排除花色关键张问叫。', ['约定叫', '满贯'], Z1CR);

zju('opener', ['1C', '1D'], '1NT', null, 'PASS', '12~14', ZO, '均型，示弱。', [], Z1CR);
zju('opener', ['1C', '1D'], '1NT', null, { type: 'rebidOwn' }, '12~14', ZO,
  '再叫原花：5 张以上，示弱。', [], Z1CR);
zju('opener', ['1C', '1D'], '1NT', null, { type: 'newSuit', level: 2 }, '12~17', ZO,
  '顺叫 2♣：至少 4-4，半逼叫（仅应叫人低限且有支持时可不叫）。', [], Z1CR);
zju('opener', ['1C', '1D'], '1NT', null, { type: 'reverse' }, '17 以上', ZO,
  '逆叫 2 新花：逼叫一轮。', ['逼叫'], Z1CR);
zju('opener', ['1C', '1D'], '1NT', null, { type: 'jumpNewSuit' }, '18 以上', ZO,
  '跳叫新花：进局逼叫。', ['逼叫'], Z1CR);
zju('opener', ['1C', '1D'], '1NT', null, ['3NT', { type: 'gameOwn' }], '17~19', ZO,
  '封局叫品：止叫，3NT 一般好 17~19P。', ['止叫'], Z1CR);

zju('opener', '1D', '2C', null, { type: 'rebidOwn' }, '12~15', ZO,
  '2♦：5 张以上方块优先表达，不承诺额外实力，可能有 4 张高花。', [], Z1CR);
zju('opener', '1D', '2C', null, ['2H', '2S'], null, ZO,
  '4 张高花，方块不多于 4 张，非均型，不保证额外实力，默认梅花没配合。', [], Z1CR);
zju('opener', '1D', '2C', null, '2NT', null, ZO, '均型，等待叫。', [], Z1CR);
zju('opener', '1D', '2C', null, '3C', null, ZO, '3 张梅花支持，非均型。', [], Z1CR);
zju('opener', '1D', '2C', null, '3D', '15 以上', ZO, '6 张方块。', [], Z1CR);
zju('opener', '1D', '2C', null, ['3H', '3S'], null, ZO,
  '梅花支持的爆裂叫，一般有额外实力。', ['约定叫'], Z1CR);
zju('opener', '1D', '2C', null, '3NT', '18~20', ZO, '自然叫。', [], Z1CR);
zju('opener', '1D', '2C', null, ['4C', '4D'], null, ZO,
  '指定将牌的 RKCB。', ['约定叫', '满贯'], Z1CR);

zju('opener', ['1C', '1D'], { type: 'raise' }, null, ['2H', '2S'], null, ZO,
  '非均型，保证 4 张，优先从低叫。', [], Z1CR);
zju('opener', ['1C', '1D'], { type: 'raise' }, null, '2NT', '12~14', ZO, '均型，逼叫。', ['逼叫'], Z1CR);
zju('opener', ['1C', '1D'], { type: 'raise' }, null, { type: 'rebidOwn' }, '12~13', ZO,
  '只保证 4 张，不逼叫。', [], Z1CR);
zju('opener', ['1C', '1D'], { type: 'raise' }, null, '3NT', '18~19', ZO,
  '保证未叫花色有止张。', [], Z1CR);
zju('opener', ['1C', '1D'], { type: 'raise' }, null, { type: 'jumpNewSuit' }, null, ZO,
  '跳叫新花：爆裂叫，满贯兴趣。', ['约定叫', '满贯'], Z1CR);
zju('opener', ['1C', '1D'], { type: 'raise' }, null, { type: 'jumpRebidOwn' }, null, ZO,
  '跳叫 4 阶原花：罗马关键张问叫。', ['约定叫', '满贯'], Z1CR);
zju('opener', ['1C', '1D'], { type: 'raise' }, null, { type: 'exclusion' }, null, ZO,
  '4 阶高于配合花色：排除关键张问叫。', ['约定叫', '满贯'], Z1CR);

zju('opener', ['1C', '1D'], { type: 'doubleRaise' }, null, { type: 'newSuit' }, '20 左右', ZO,
  '再叫新花：报止张，逼叫。', ['逼叫'], Z1CR);
zju('opener', ['1C', '1D'], { type: 'doubleRaise' }, null, { type: 'rebidOwn' }, null, ZO,
  '再叫原花：低限或无止张。', [], Z1CR);
zju('opener', ['1C', '1D'], { type: 'doubleRaise' }, null, '3NT', null, ZO,
  '高限，有未叫花色止张。', [], Z1CR);
zju('opener', ['1C', '1D'], { type: 'doubleRaise' }, null, { type: 'gameOwn' }, null, ZO,
  '封局止叫。', ['止叫'], Z1CR);
zju('opener', ['1C', '1D'], { type: 'doubleRaise' }, null, { type: 'gameRaise' }, null, ZO,
  '4 阶原花：邀请应叫人高限进局。', ['邀局'], Z1CR);

zju('opener', ['1C', '1D'], '2NT', null, { type: 'rebidOwn' }, '12~14', ZO, '非均型。', [], Z1CR);
zju('opener', ['1C', '1D'], '2NT', null, ['3NT', { type: 'gameOwn' }], null, ZO, '止叫。', ['止叫'], Z1CR);
zju('opener', ['1C', '1D'], '2NT', null, ['4C', '4D'], null, ZO,
  '格伯问 A。', ['约定叫', '满贯'], Z1CR);
zju('opener', ['1C', '1D'], '2NT', null, { type: 'newSuit' }, null, ZO,
  '再叫新花：逼叫或扣叫，满贯兴趣。', ['满贯'], Z1CR);
zju('opener', ['1C', '1D'], '2NT', null, ['4NT', '5NT'], null, ZO,
  '直接满贯邀请。', ['满贯'], Z1CR);

/* =========================================================================--
   四、1♥ / 1♠ 应叫
   ========================================================================= */
const Z1H = '浙大体系 · 1♥/1♠ 应叫';

zju('resp', '1H', null, null, '1S', '6 以上', ZR,
  '1♥—1♠：同低花一盖一。有 4 张黑桃一般优先叫 1♠，除非另有 5 张低花的逼叫进局实力，此时一定要先二盖一。',
  ['逼叫'], Z1H);
zju('resp', ['1H', '1S'], null, null, '1NT', '5~12', ZR,
  '逼叫（除非应叫人已 PASS 过且开叫人轻开叫）。', ['逼叫'], Z1H);
zju('resp', ['1H', '1S'], null, null, '2C', '9~12', ZR,
  '逆朱瑞（应叫人已 PASS 过）：3 张高花支持，9 至 12 减。', ['约定叫'], Z1H);
zju('resp', ['1H', '1S'], null, null, ['2C', '2D', '2H', '2S'], '12 以上', ZR,
  '二盖一应叫（未 PASS 过）：进局逼叫（除非应叫人连续三次叫同一门低花）；一般保证 5 张，非均型时允许 4 张好套。已 PASS 过则 2♦/2♥ 表示 10P 以上 5 张以上，同伴轻开叫可 PASS。',
  ['逼叫'], Z1H);
zju('resp', ['1H', '1S'], null, null, { type: 'raise' }, '8~10', ZR,
  '单加叫：保证 3 张支持；有 4 张支持则在对方争叫时加到 3 阶。', [], Z1H);
zju('resp', ['1H', '1S'], null, null, '2NT', '12 以上', ZR,
  '均型逼局牌力，也允许有将牌支持的非均型；要求开叫人描述牌情。', ['逼叫'], Z1H);
zju('resp', '1H', null, null, { type: 'inviteRaise' }, '10~12', ZR,
  '（1♥）-3♣/3♦：4 张将牌支持，10~12 牌型点，邀请进局。', ['邀局'], Z1H);
zju('resp', '1S', null, null, { type: 'inviteRaise' }, '10~12', ZR,
  '（1♠）-3♣/3♦/3♥：4 张将牌支持，10~12 牌型点，邀请进局。', ['邀局'], Z1H);
zju('resp', ['1H', '1S'], null, null, '3NT', '15 以下', ZR,
  '均型，想打。继续叫牌即表示有满贯兴趣，4♣ 为格伯问 A。', ['止叫'], Z1H);
zju('resp', ['1H', '1S'], null, null, { type: 'doubleRaise' }, '5 以下', ZR,
  '双加叫：4 张支持，阻击性。', ['阻击'], Z1H);
zju('resp', ['1H', '1S'], null, null, { type: 'splinter' }, '10~13', ZR,
  '隐藏单缺花色的爆裂叫，4 张支持，进局逼叫；接力叫问单缺花色。', ['约定叫'], Z1H);
zju('resp', '1H', null, null, '3D', '7~9', ZR,
  '（1♥）-3♦：4 张将牌支持，7~9 牌型点。', ['阻击'], Z1H);
zju('resp', '1S', null, null, '3H', '7~9', ZR,
  '（1♠）-3♥：4 张将牌支持，7~9 牌型点。', ['阻击'], Z1H);
zju('resp', ['1H', '1S'], null, null, { type: 'tripleRaise' }, '5 以下', ZR,
  '三加叫：至少 4 张，一般 5 张，有牌型。', ['阻击'], Z1H);
zju('resp', ['1H', '1S'], null, null, { type: 'splinter', level: 4 }, '13~15', ZR,
  '跳两级叫新花：4 张以上将牌支持，所叫花色单缺，进局逼叫。', ['约定叫'], Z1H);
zju('resp', ['1H', '1S'], null, null, '4NT', null, ZR, 'RKCB 罗马关键张问叫。', ['约定叫', '满贯'], Z1H);
zju('resp', ['1H', '1S'], null, null, { type: 'newSuit', level: 5 }, null, ZR,
  '5 阶新花：排除关键张问叫。', ['约定叫', '满贯'], Z1H);

/* =========================================================================--
   五、1♥ / 1♠ 开叫方再叫
   ========================================================================= */
const Z1HR = '浙大体系 · 1♥/1♠ 开叫方再叫';

zju('opener', ['1H', '1S'], '1NT', null, { type: 'newSuit', level: 2 }, '12~17', ZO,
  '2♣：只保证 3 张，优先作其他描述性叫品。', [], Z1HR);
zju('opener', '1H', '1NT', null, '2D', null, ZO,
  '约定叫，逼叫一轮。', ['约定叫', '逼叫'], Z1HR);
zju('opener', ['1H', '1S'], '1NT', null, { type: 'rebidOwn' }, null, ZO,
  '再叫原高花：6 张。', [], Z1HR);
zju('opener', ['1H', '1S'], '1NT', null, '2NT', '12~14', ZO, '均型。', [], Z1HR);
zju('opener', ['1H', '1S'], '1NT', null, { type: 'newSuit', level: 3 }, null, ZO,
  '3♣：5 张。', [], Z1HR);
zju('opener', ['1H', '1S'], '1NT', null, { type: 'newSuit' }, '12~17', ZO,
  '顺叫新花：4 张以上。', [], Z1HR);
zju('opener', ['1H', '1S'], '1NT', null, { type: 'rebidOwn' }, '12~14', ZO,
  '再叫原花：好 6 张或 7 张套。', [], Z1HR);
zju('opener', ['1H', '1S'], '1NT', null, { type: 'reverse' }, '17 以上', ZO,
  '逆叫：4 张以上，逼叫。', ['逼叫'], Z1HR);
zju('opener', ['1H', '1S'], '1NT', null, { type: 'jumpRebidOwn' }, '15~17', ZO,
  '跳叫原花：6 张套，邀请。', ['邀局'], Z1HR);
zju('opener', ['1H', '1S'], '1NT', null, { type: 'doubleJumpOwn' }, null, ZO,
  '双跳原花至 4 阶：想打，无满贯兴趣。', ['止叫'], Z1HR);
zju('opener', ['1H', '1S'], '1NT', null, '2NT', '18~20', ZO,
  '跳叫 2NT：除 5332 外任何牌型。', ['邀局'], Z1HR);
zju('opener', ['1H', '1S'], '1NT', null, { type: 'jumpNewSuit' }, '18 以上', ZO,
  '跳叫新花：3♣ 保证 4 张，3♦/3♥ 保证 5 张。', ['逼叫'], Z1HR);
zju('opener', ['1H', '1S'], '1NT', null, '3NT', '18~20', ZO,
  '一般为 5332 牌型。', [], Z1HR);

zju('opener', ['1H', '1S'], ['2C', '2D', '2H', '2S'], null, { type: 'newSuit', level: 2 }, null, ZO,
  '顺叫 2 阶新花：4 张，中限实力。', [], Z1HR);
zju('opener', ['1H', '1S'], ['2C', '2D', '2H', '2S'], null, { type: 'rebidOwn' }, null, ZO,
  '再叫原花：低限不保证 6 张，或 6 张非低限。', [], Z1HR);
zju('opener', ['1H', '1S'], ['2C', '2D', '2H', '2S'], null, { type: 'reverse' }, null, ZO,
  '逆叫 2 新花：不需要额外实力。', [], Z1HR);
zju('opener', ['1H', '1S'], ['2C', '2D', '2H', '2S'], null, '2NT', '18~20', ZO,
  '好 14P 或 18P 以上均型。', [], Z1HR);
zju('opener', ['1H', '1S'], ['2C', '2D', '2H', '2S'], null, { type: 'newSuit', level: 3 }, '14 以上', ZO,
  '顺叫 3 阶新花：保证 14P 以上，或低限 5-5 牌型。', [], Z1HR);
zju('opener', ['1H', '1S'], ['2C', '2D', '2H', '2S'], null, { type: 'raise' }, null, ZO,
  '加叫应叫人花色：4 张支持；3 张支持时要保证 14P 以上。', [], Z1HR);
zju('opener', ['1H', '1S'], ['2C', '2D', '2H', '2S'], null, { type: 'splinter' }, null, ZO,
  '跳叫新花：爆裂叫，4 张支持，一般有额外实力，满贯兴趣。', ['约定叫', '满贯'], Z1HR);
zju('opener', ['1H', '1S'], ['2C', '2D', '2H', '2S'], null, { type: 'jumpRebidOwn' }, null, ZO,
  '跳叫原花：至少 6 张，质量非常好。', [], Z1HR);
zju('opener', ['1H', '1S'], ['2C', '2D', '2H', '2S'], null, '3NT', '18~20', ZO,
  '平均牌型。', [], Z1HR);

zju('opener', ['1H', '1S'], { type: 'raise' }, null, { type: 'rebidOwn' }, null, ZO,
  '3 原花：止叫。', ['止叫'], Z1HR);
zju('opener', ['1H', '1S'], { type: 'raise' }, null, { type: 'gameOwn' }, null, ZO,
  '4 原花：封局。', ['止叫'], Z1HR);
zju('opener', ['1H', '1S'], { type: 'raise' }, null, { type: 'newSuit' }, null, ZO,
  '求助花色进局邀请（1♥—2♥—3♣/3♦/2NT；1♠—2♠—3♣/3♦/3♥）。', ['邀局'], Z1HR);

zju('opener', ['1H', '1S'], '2NT', null, { type: 'newSuit', level: 3 }, null, ZO,
  '3 阶新花：所叫花色 4 张以上。', [], Z1HR);
zju('opener', ['1H', '1S'], '2NT', null, '3NT', null, ZO, '5332 牌型，低限。', [], Z1HR);
zju('opener', ['1H', '1S'], '2NT', null, '4NT', null, ZO, '5332 牌型，中限以上实力。', [], Z1HR);
zju('opener', ['1H', '1S'], '2NT', null, { type: 'rebidOwn' }, null, ZO, '6 张以上。', [], Z1HR);
zju('opener', ['1H', '1S'], { type: 'doubleRaise' }, null, { type: 'newSuit' }, null, ZO,
  '再叫新花：20P 左右，报止张，逼叫。', ['逼叫'], Z1HR);

/* =========================================================================--
   六、1NT 应叫（15~17）
   ========================================================================= */
const ZNT = '浙大体系 · 1NT 应叫';

zju('resp', '1NT', null, null, 'PASS', '0~7', ZR, '弱牌，不叫。', ['止叫'], ZNT);
zju('resp', '1NT', null, null, '2C', '8 以上', ZR,
  '斯台曼：有 4 张高花。同一叫品另含两种用法——弱斯台曼（7P 以下，高花 4-4/4-3/4-5、4 张方块的非均型）与过渡斯台曼（8~9P 均型或单套低花邀请）。',
  ['约定叫'], ZNT);
zju('resp', '1NT', null, null, '2D', null, ZR,
  '高级杰克贝转移叫：5 张以上红心。', ['转移叫'], ZNT);
zju('resp', '1NT', null, null, '2H', null, ZR,
  '高级杰克贝转移叫：5 张以上黑桃。', ['转移叫'], ZNT);
zju('resp', '1NT', null, null, '2S', null, ZR,
  '低花斯台曼：两门低花长套，或双低弱牌。', ['约定叫'], ZNT);
zju('resp', '1NT', null, null, '2NT', null, ZR,
  '贝尔（Bell）约定叫：有 5 张高花套，低限。', ['约定叫'], ZNT);
zju('resp', '1NT', null, null, '3C', null, ZR,
  '转移到 3♦：梅花单套强牌或单套弱牌，或梅花 + 另一花色 5-4 的满贯兴趣。', ['转移叫'], ZNT);
zju('resp', '1NT', null, null, '3D', null, ZR,
  '问 5 张高花，进局逼叫。', ['约定叫', '逼叫'], ZNT);
zju('resp', '1NT', null, null, ['3H', '3S'], null, ZR,
  '所叫高花单张，另一门高花 4 张，低花 4-4，进局逼叫，不排除满贯兴趣。', ['约定叫'], ZNT);
zju('resp', '1NT', null, null, '3NT', null, ZR, '封局。', ['止叫'], ZNT);
zju('resp', '1NT', null, null, '4C', null, ZR, '格伯问 A。', ['约定叫', '满贯'], ZNT);
zju('resp', '1NT', null, null, ['4D', '4H'], null, ZR,
  'Texas 转移：至少 6 张高花，无满贯兴趣或自行试探满贯。', ['转移叫'], ZNT);
zju('resp', '1NT', null, null, '4NT', '15~17', ZR,
  '6NT 邀请，基本均型。', ['邀局'], ZNT);
zju('resp', '1NT', null, null, '5NT', null, ZR, '小满贯逼叫，6 阶开始对套。', ['满贯'], ZNT);
zju('resp', '1NT', null, null, '6NT', null, ZR, '止叫，无大满贯兴趣（均型 18P 左右）。', ['止叫'], ZNT);

const ZNTS = '浙大体系 · 1NT — 斯台曼答叫';
zju('opener', '1NT', '2C', null, '2D', null, ZO, '无 4 张高花。', [], ZNTS);
zju('opener', '1NT', '2C', null, '2H', null, ZO, '4 张红心，不排除 4 张黑桃。', [], ZNTS);
zju('opener', '1NT', '2C', null, '2S', null, ZO, '4 张黑桃，无 4 张红心。', [], ZNTS);

const ZNT2D = '浙大体系 · 1NT — 2♣ — 2♦ 之后';
zju('responder', '1NT', '2C', ['2D'], 'PASS', '0~7', ZR,
  '弱斯台曼，4~5 张方块。', ['止叫'], ZNT2D);
zju('responder', '1NT', '2C', ['2D'], '2H', null, ZR, '红心-黑桃 5-4，进局邀请。', ['邀局'], ZNT2D);
zju('responder', '1NT', '2C', ['2D'], '2S', null, ZR, '红心-黑桃 4-5，进局邀请。', ['邀局'], ZNT2D);
zju('responder', '1NT', '2C', ['2D'], '2NT', '8~9', ZR, '均型，进局邀请。', ['邀局'], ZNT2D);
zju('responder', '1NT', '2C', ['2D'], ['3C', '3D'], null, ZR,
  '单套低花邀请，一般三顶张有二。', ['邀局'], ZNT2D);
zju('responder', '1NT', '2C', ['2D'], ['3H', '3S'], null, ZR,
  '斯莫伦（Smolen）：高花 5-4、6-4 或 4-5、4-6，叫的是 4 张套，进局逼叫。', ['约定叫'], ZNT2D);
zju('responder', '1NT', '2C', ['2D'], '3NT', null, ZR, '封局。', ['止叫'], ZNT2D);
zju('responder', '1NT', '2C', ['2D'], ['4D', '4H'], null, ZR,
  '斯莫伦转移叫，4-6 或 6-4 高花，无满贯希望或自行试探满贯。', ['转移叫'], ZNT2D);
zju('responder', '1NT', '2C', ['2D'], ['4NT', '5NT', '6NT', '7NT'], null, ZR,
  '同直接应叫。', [], ZNT2D);

const ZNT2H = '浙大体系 · 1NT — 2♣ — 2♥ 之后';
zju('responder', '1NT', '2C', ['2H'], 'PASS', '0~7', ZR, '弱斯台曼。', ['止叫'], ZNT2H);
zju('responder', '1NT', '2C', ['2H'], '2S', null, ZR,
  '红心支持；要求开叫人接力 2NT，后续 3♣/3♦ 保证 4 张、3♠ 保证 5 张，满贯兴趣。', ['满贯'], ZNT2H);
zju('responder', '1NT', '2C', ['2H'], '2NT', '8~9', ZR,
  '均型，邀请，不一定有 4 张黑桃。开叫人再叫 3♠ 表示 4-4 高花、进局逼叫。', ['邀局'], ZNT2H);
zju('responder', '1NT', '2C', ['2H'], ['3C', '3D'], null, ZR, '单套低花邀请，一般三顶张有二。', ['邀局'], ZNT2H);
zju('responder', '1NT', '2C', ['2H'], '3H', '8~9', ZR, '4 张红心，邀请。', ['邀局'], ZNT2H);
zju('responder', '1NT', '2C', ['2H'], '3NT', null, ZR, '有 4 张黑桃，开叫人可 PASS 或改 4♠。', [], ZNT2H);
zju('responder', '1NT', '2C', ['2H'], ['3S', '4C', '4D'], null, ZR,
  '4 张以上支持，爆裂叫。', ['约定叫'], ZNT2H);
zju('responder', '1NT', '2C', ['2H'], '4H', null, ZR, '封局。', ['止叫'], ZNT2H);
zju('responder', '1NT', '2C', ['2H'], ['4NT', '5NT', '6NT', '7NT'], null, ZR,
  '同直接应叫，高花无配合。', [], ZNT2H);

const ZNT2S = '浙大体系 · 1NT — 2♣ — 2♠ 之后';
zju('responder', '1NT', '2C', ['2S'], 'PASS', '0~7', ZR, '弱斯台曼。', ['止叫'], ZNT2S);
zju('responder', '1NT', '2C', ['2S'], '2NT', '8~9', ZR, '均型，邀请，不一定有 4 张红心。', ['邀局'], ZNT2S);
zju('responder', '1NT', '2C', ['2S'], ['3C', '3D'], null, ZR, '单套低花邀请，一般三顶张有二。', ['邀局'], ZNT2S);
zju('responder', '1NT', '2C', ['2S'], '3H', null, ZR,
  '黑桃支持；要求接力 3♠，后续 4♣/4♦/4♥ 为扣叫，满贯兴趣；4♠ 邀请 6♠；3NT 请同伴示选。', ['满贯'], ZNT2S);
zju('responder', '1NT', '2C', ['2S'], '3S', '8~9', ZR, '4 张黑桃，邀请。', ['邀局'], ZNT2S);
zju('responder', '1NT', '2C', ['2S'], '3NT', null, ZR, '有 4 张红心，封局。', ['止叫'], ZNT2S);
zju('responder', '1NT', '2C', ['2S'], ['4C', '4D', '4H'], null, ZR,
  '4 张以上支持，爆裂叫。', ['约定叫'], ZNT2S);
zju('responder', '1NT', '2C', ['2S'], '4S', null, ZR, '封局。', ['止叫'], ZNT2S);
zju('responder', '1NT', '2C', ['2S'], ['4NT', '5NT', '6NT', '7NT'], null, ZR,
  '同直接应叫，高花无配合。', [], ZNT2S);

const ZNTR = '浙大体系 · 1NT — 转移叫答叫与后续';
zju('opener', '1NT', '2D', null, '2H', null, ZO, '2~3 张红心，任何强度，接受转移。', ['转移叫'], ZNTR);
zju('opener', '1NT', '2D', null, '2NT', null, ZO,
  '4 张以上红心，高限，4-3-3-3 或方块双张。', ['转移叫'], ZNTR);
zju('opener', '1NT', '2D', null, ['2S', '3C'], null, ZO,
  '所叫花色双张，4 张以上红心，高限。', ['转移叫'], ZNTR);
zju('opener', '1NT', '2D', null, '3H', null, ZO, '4 张以上红心，非高限。', ['转移叫'], ZNTR);
zju('opener', '1NT', '2H', null, '2S', null, ZO, '2~3 张黑桃，任何强度，接受转移。', ['转移叫'], ZNTR);
zju('opener', '1NT', '2H', null, '2NT', null, ZO,
  '4 张以上黑桃，高限，4-3-3-3 或红心双张。', ['转移叫'], ZNTR);
zju('opener', '1NT', '2H', null, ['3C', '3D'], null, ZO,
  '所叫花色双张，4 张以上黑桃，高限。', ['转移叫'], ZNTR);
zju('opener', '1NT', '2H', null, '3S', null, ZO, '4 张以上黑桃，非高限。', ['转移叫'], ZNTR);

const ZNTRH = '浙大体系 · 1NT — 2♦ — 2♥ 之后';
zju('responder', '1NT', '2D', ['2H'], '2S', null, ZR,
  '高花 5-5，进局邀请；后续 2NT 表示无配合低限，应叫人再叫 3♥ 为 5-6、3S 为 6-5，均不逼叫。', ['邀局'], ZNTRH);
zju('responder', '1NT', '2D', ['2H'], '2NT', null, ZR, '仅 5 张红心，进局邀请。', ['邀局'], ZNTRH);
zju('responder', '1NT', '2D', ['2H'], ['3C', '3D'], null, ZR,
  '保证 4 张、一般 5 张，进局逼叫，不排除满贯兴趣。', ['逼叫'], ZNTRH);
zju('responder', '1NT', '2D', ['2H'], '3H', null, ZR, '6 张或很好 5 张红心，进局邀请。', ['邀局'], ZNTRH);
zju('responder', '1NT', '2D', ['2H'], '3NT', '10 以上', ZR,
  '仅 5 张红心，半均型，进局逼叫（开叫人 PASS 或 4♥）。', ['逼叫'], ZNTRH);
zju('responder', '1NT', '2D', ['2H'], ['3S', '4C', '4D'], null, ZR,
  '爆裂叫，较好 6 张红心，满贯邀请。', ['约定叫'], ZNTRH);
zju('responder', '1NT', '2D', ['2H'], '4H', null, ZR, '较好 6 张红心，温和满贯兴趣。', ['满贯'], ZNTRH);
zju('responder', '1NT', '2D', ['2H'], '4NT', null, ZR, '6♥/6NT 邀请，不是关键张问叫。', ['邀局'], ZNTRH);
zju('responder', '1NT', '2D', ['2H'], '5NT', null, ZR, '7NT 邀请。', ['邀局'], ZNTRH);

const ZNTRS = '浙大体系 · 1NT — 2♥ — 2♠ 之后';
zju('responder', '1NT', '2H', ['2S'], 'PASS', '0~7', ZR, '黑桃-红心 5-4 弱牌或仅 5 张黑桃弱牌。', ['止叫'], ZNTRS);
zju('responder', '1NT', '2H', ['2S'], '2NT', null, ZR, '仅 5 张黑桃，进局邀请。', ['邀局'], ZNTRS);
zju('responder', '1NT', '2H', ['2S'], ['3C', '3D'], null, ZR,
  '保证 4 张、一般 5 张，进局逼叫，不排除满贯兴趣。', ['逼叫'], ZNTRS);
zju('responder', '1NT', '2H', ['2S'], '3H', null, ZR, '高花 5-5、6-5，进局逼叫。', ['逼叫'], ZNTRS);
zju('responder', '1NT', '2H', ['2S'], '3S', null, ZR, '6 张或很好 5 张黑桃，进局邀请。', ['邀局'], ZNTRS);
zju('responder', '1NT', '2H', ['2S'], '3NT', '10 以上', ZR,
  '仅 5 张黑桃，半均型，进局逼叫（开叫人 PASS 或 4♠）。', ['逼叫'], ZNTRS);
zju('responder', '1NT', '2H', ['2S'], ['4C', '4D', '4H'], null, ZR,
  '爆裂叫，较好 6 张黑桃，满贯邀请。', ['约定叫'], ZNTRS);
zju('responder', '1NT', '2H', ['2S'], '4S', null, ZR, '较好 6 张黑桃，温和满贯兴趣。', ['满贯'], ZNTRS);
zju('responder', '1NT', '2H', ['2S'], '4NT', null, ZR, '6♠/6NT 邀请，不是关键张问叫。', ['邀局'], ZNTRS);
zju('responder', '1NT', '2H', ['2S'], '5NT', null, ZR, '7♠/7NT 邀请。', ['邀局'], ZNTRS);

const ZNTL = '浙大体系 · 1NT — 低花斯台曼与低花转移';
zju('opener', '1NT', '2S', null, '2NT', null, ZO, '两门低花均少于 4 张。', [], ZNTL);
zju('opener', '1NT', '2S', null, '3C', null, ZO, '两门低花至少 5-5，弱牌。', [], ZNTL);
zju('opener', '1NT', '2S', null, '3D', null, ZO, '两门低花至少 5-5，进局逼叫。', ['逼叫'], ZNTL);
zju('opener', '1NT', '2S', null, ['3H', '3S'], null, ZO,
  '所叫高花单缺，双低 5-4，进局逼叫，不排除满贯兴趣。', [], ZNTL);
zju('opener', '1NT', '2S', null, '3NT', '13~15', ZO,
  '两门低花至少 4-4、一般 5-4，高花无单缺，温和满贯邀请。', ['邀局'], ZNTL);
zju('opener', '1NT', '2S', null, ['4H', '4S'], null, ZO,
  '排除花色双低花 RKCB，按 14/03/2无Q/2低Q/2高Q/2双Q 答叫。', ['约定叫', '满贯'], ZNTL);
zju('opener', '1NT', '2S', null, '4NT', '15~17', ZO,
  '两门低花至少 4-4、一般 5-4，高花无单缺，强烈满贯邀请，仅绝对低限可不接受。', ['满贯'], ZNTL);
zju('opener', '1NT', '3C', null, '3D', null, ZO, '接受转移。', ['转移叫'], ZNTL);
zju('opener', '1NT', '3D', null, ['3H', '3S'], null, ZO, '所叫花色 5 张。', [], ZNTL);
zju('opener', '1NT', '3D', null, '3NT', null, ZO, '无 5 张高花。', [], ZNTL);
zju('opener', '1NT', '3H', null, '3S', null, ZO,
  '保证 3 张黑桃，红心不强，低花缺少配合，邀请。', ['邀局'], ZNTL);
zju('opener', '1NT', '3H', null, '3NT', null, ZO, '该高花有止（至少 1 个确定挡张）。', [], ZNTL);
zju('opener', '1NT', '3H', null, '4S', null, ZO, '4 张黑桃，封局。', ['止叫'], ZNTL);
zju('opener', '1NT', '3H', null, ['4C', '4D'], null, ZO,
  '至少 4 张支持，高限。', [], ZNTL);
zju('opener', '1NT', '3H', null, ['5C', '5D'], null, ZO,
  '至少 4 张支持，低限，止叫。', ['止叫'], ZNTL);
zju('opener', '1NT', '3S', null, '3NT', null, ZO, '该高花有止。', [], ZNTL);
zju('opener', '1NT', '3S', null, '4H', null, ZO, '4 张红心，封局。', ['止叫'], ZNTL);

/* =========================================================================--
   七、2♣ 强开叫
   ========================================================================= */
const Z2C = '浙大体系 · 2♣ 强开叫';
zju('resp', '2C', null, null, '2D', '0~7', ZR, '等待叫，人工。', ['约定叫', '示弱'], Z2C);
zju('resp', '2C', null, null, ['2H', '2S'], '8 以上', ZR,
  '自然出套，5 张以上，逼叫到局。', ['逼叫'], Z2C);
zju('resp', '2C', null, null, '2NT', '8 以上', ZR, '均型，逼叫到局。', ['逼叫'], Z2C);
zju('resp', '2C', null, null, ['3C', '3D'], '8 以上', ZR,
  '6 张以上所叫花色，逼叫到局。', ['逼叫'], Z2C);
zju('resp', '2C', null, null, ['3H', '3S'], '0~6', ZR,
  '破烂的 7 张以上套。', ['阻击'], Z2C);

const Z2CR = '浙大体系 · 2♣ — 2♦ 之后开叫方再叫';
zju('opener', '2C', '2D', null, '2H', null, ZO, '过渡叫。', [], Z2CR);
zju('opener', '2C', '2D', null, '2S', null, ZO, '接力示弱，0~3P 或均型牌等待叫。', [], Z2CR);
zju('opener', '2C', '2D', null, '2NT', '24~25', ZO, '均型。', [], Z2CR);
zju('opener', '2C', '2D', null, '3NT', '26~27', ZO, '均型。', [], Z2CR);
zju('opener', '2C', '2D', null, ['3C', '3D', '3S'], '4~7', ZO, '出套。', [], Z2CR);
zju('opener', '2C', '2D', null, '3H', '4~7', ZO, '红心有 3 张以上，优先叫 3♥。', [], Z2CR);
zju('opener', '2C', '2D', null, '4C', null, ZO, '常规斯台曼（同 1NT 后 2♣）。', ['约定叫'], Z2CR);
zju('opener', '2C', '2D', null, ['4D', '4H'], null, ZO, '转移叫。', ['转移叫'], Z2CR);
zju('opener', '2C', '2D', null, '4S', null, ZO, '双低套满贯试探。', ['满贯'], Z2CR);
zju('opener', '2C', '2D', null, '5C', null, ZO, '高格伯问叫。', ['约定叫', '满贯'], Z2CR);

const Z2CP = '浙大体系 · 2♣ — 正应叫之后';
zju('opener', '2C', ['2H', '2S', '3C', '3D'], null, '2NT', '22~23', ZO, '均型。', [], Z2CP);
zju('opener', '2C', ['2H', '2S', '3C', '3D'], null, '3NT', null, ZO,
  '单套强牌，约九赢墩。', [], Z2CP);
zju('opener', '2C', ['2H', '2S', '3C', '3D'], null, ['3H', '3S'], null, ZO,
  '坚固长套，同时是控制问叫；之后再叫旁门花色为问该花色控制。', ['约定叫'], Z2CP);
zju('opener', '2C', ['2H', '2S', '3C', '3D'], null, { type: 'raise' }, null, ZO,
  '加叫同伴花色：3 张以上支持。', [], Z2CP);
zju('opener', '2C', ['2H', '2S', '3C', '3D'], null, { type: 'newSuit' }, null, ZO,
  '叫新花色：5 张以上，自然。', [], Z2CP);

/* =========================================================================--
   八、2♦ 双高阻击
   ========================================================================= */
const Z2D = '浙大体系 · 2♦ 双高阻击';
zju('resp', '2D', null, null, ['2H', '2S'], null, ZR, '示选，止叫。', ['止叫'], Z2D);
zju('resp', '2D', null, null, '2NT', null, ZR, '问叫，邀请以上实力。', ['约定叫', '逼叫'], Z2D);
zju('resp', '2D', null, null, ['3C', '3D'], null, ZR, '5 张出套，逼叫一轮。', ['逼叫'], Z2D);
zju('resp', '2D', null, null, ['3H', '3S'], null, ZR, '加深阻击。', ['阻击'], Z2D);
zju('resp', '2D', null, null, ['4H', '4S'], null, ZR, '止叫。', ['止叫'], Z2D);
zju('opener', '2D', '2NT', null, ['3C', '3D'], null, ZO,
  '所叫花色单缺，5-4-3-1 或 6-4-2-1，黑桃 4 张。', [], Z2D);
zju('opener', '2D', '2NT', null, '3H', null, ZO, '5-4-2-2，红心 5 张，低限均型。', [], Z2D);
zju('opener', '2D', '2NT', null, '3S', null, ZO, '5-5-2-1 以上。', [], Z2D);
zju('opener', '2D', '2NT', null, '3NT', null, ZO, '5-4-2-2，高限均型。', [], Z2D);

/* =========================================================================--
   九、2♥ / 2♠ 弱二
   =========================================================================-- */
const Z2W = '浙大体系 · 2♥/2♠ 弱二';
zju('resp', ['2H', '2S'], null, null, { type: 'newSuit' }, null, ZR,
  '新花色：保证 6 张较好套，逼叫一轮。', ['逼叫'], Z2W);
zju('resp', ['2H', '2S'], null, null, '2NT', null, ZR,
  '问叫，至少有进局邀请实力。', ['约定叫', '逼叫'], Z2W);
zju('resp', ['2H', '2S'], null, null, '3C', null, ZR, '问单张。', ['约定叫'], Z2W);
zju('resp', ['2H', '2S'], null, null, { type: 'raise' }, null, ZR, '单加叫：加深阻击。', ['阻击'], Z2W);
zju('resp', ['2H', '2S'], null, null, '3NT', null, ZR, '止叫。', ['止叫'], Z2W);
zju('resp', ['2H', '2S'], null, null, { type: 'jumpNewSuit' }, null, ZR,
  '跳叫新花：控制问叫。', ['约定叫'], Z2W);
zju('resp', ['2H', '2S'], null, null, '4NT', null, ZR, 'RKCB。', ['约定叫', '满贯'], Z2W);
zju('opener', ['2H', '2S'], '2NT', null, '3C', null, ZO, '烂牌烂套。', [], Z2W);
zju('opener', ['2H', '2S'], '2NT', null, '3D', null, ZO, '好牌烂套。', [], Z2W);
zju('opener', ['2H', '2S'], '2NT', null, '3H', null, ZO, '烂牌好套。', [], Z2W);
zju('opener', ['2H', '2S'], '2NT', null, '3S', null, ZO, '好牌好套。', [], Z2W);
zju('opener', ['2H', '2S'], '2NT', null, { type: 'newSuit', level: 4 }, null, ZO,
  '新花：控制问叫。', ['约定叫'], Z2W);
zju('opener', ['2H', '2S'], '3C', null, { type: 'newSuit' }, null, ZO,
  '所叫花色为单张；3NT 表示梅花单张或原花无单张。', [], Z2W);

/* =========================================================================--
   十、2NT（20~22）应叫
   ========================================================================= */
const Z2NT = '浙大体系 · 2NT 应叫';
zju('resp', '2NT', null, null, 'PASS', '0~3', ZR, '弱牌，不叫。', ['止叫'], Z2NT);
zju('resp', '2NT', null, null, '3C', null, ZR,
  '傀儡斯台曼，不一定有 4 张高花（可用于问开叫人有无 5 张高花），进局逼叫。', ['约定叫', '逼叫'], Z2NT);
zju('resp', '2NT', null, null, '3D', null, ZR, '杰克贝转移叫：5 张以上红心。', ['转移叫'], Z2NT);
zju('resp', '2NT', null, null, '3H', null, ZR, '杰克贝转移叫：5 张以上黑桃。', ['转移叫'], Z2NT);
zju('resp', '2NT', null, null, '3S', null, ZR,
  '转移到 3NT，低花兴趣并有满贯倾向。', ['转移叫'], Z2NT);
zju('resp', '2NT', null, null, '3NT', null, ZR, '止叫。', ['止叫'], Z2NT);
zju('resp', '2NT', null, null, '4C', null, ZR, '格伯问 A。', ['约定叫', '满贯'], Z2NT);
zju('resp', '2NT', null, null, ['4D', '4H'], null, ZR, 'Texas 转移。', ['转移叫'], Z2NT);
zju('resp', '2NT', null, null, '4NT', null, ZR, '小满贯邀请。', ['满贯'], Z2NT);
zju('resp', '2NT', null, null, '5NT', null, ZR, '小满贯逼叫。', ['满贯'], Z2NT);
zju('opener', '2NT', '3C', null, '3D', null, ZO, '无 5 张高花，有 4 张高花。', [], Z2NT);
zju('opener', '2NT', '3C', null, '3H', null, ZO, '5 张红心。', [], Z2NT);
zju('opener', '2NT', '3C', null, '3S', null, ZO, '5 张黑桃。', [], Z2NT);
zju('opener', '2NT', '3C', null, '3NT', null, ZO, '无 4 张高花。', [], Z2NT);
zju('opener', '2NT', '3D', null, '3H', null, ZO, '接受转移。', ['转移叫'], Z2NT);
zju('opener', '2NT', '3H', null, '3S', null, ZO, '接受转移。', ['转移叫'], Z2NT);
zju('opener', '2NT', '3S', null, '3NT', null, ZO, '接受转移。', ['转移叫'], Z2NT);

/* =========================================================================--
   十一、三阶以上阻击开叫的应叫
   ========================================================================= */
const Z34 = '浙大体系 · 阻击开叫应叫';
zju('resp', ['3C', '3D'], null, null, '3D', null, ZR, '3♣ 开叫后 3♦：问 3 张高花。', ['约定叫'], Z34);
zju('resp', '3C', null, null, '3H', null, ZR, '有 3 张黑桃。', [], Z34);
zju('resp', '3C', null, null, '3S', null, ZR, '有 3 张红心。', [], Z34);
zju('resp', ['3C', '3D'], null, null, '3NT', null, ZR, '没有 3 张高花（3♣ 后）；或止叫。', [], Z34);
zju('resp', '3C', null, null, '4D', null, ZR, '两门高花均为 3 张。', [], Z34);
zju('resp', ['3C', '3D'], null, null, { type: 'newSuit' }, null, ZR,
  '新花色：逼叫一轮。', ['逼叫'], Z34);
zju('resp', '3C', null, null, '4D', null, ZR, 'RKCB 罗马关键张问叫。', ['约定叫', '满贯'], Z34);
zju('resp', '3D', null, null, '4C', null, ZR, 'RKCB 罗马关键张问叫。', ['约定叫', '满贯'], Z34);
zju('resp', ['3C', '3D'], null, null, { type: 'jumpNewSuit' }, null, ZR,
  '跳叫：控制问叫。', ['约定叫'], Z34);
zju('resp', ['3H', '3S'], null, null, '3NT', null, ZR, '止叫。', ['止叫'], Z34);
zju('resp', ['3H', '3S'], null, null, { type: 'gameOwn' }, null, ZR, '止叫。', ['止叫'], Z34);
zju('resp', ['3H', '3S'], null, null, ['5H', '5S'], null, ZR,
  '5 阶原花：阻击性。', ['阻击'], Z34);
zju('resp', ['3H', '3S'], null, null, '4NT', null, ZR, '以阻击花色为将的 RKCB。', ['约定叫', '满贯'], Z34);
zju('resp', ['3H', '3S'], null, null, { type: 'jumpNewSuit' }, null, ZR,
  '跳叫：控制问叫。', ['约定叫'], Z34);

const Z3NT = '浙大体系 · 赌博性 3NT 应叫';
zju('resp', '3NT', null, null, 'PASS', null, ZR, '觉得有机会打成。', ['止叫'], Z3NT);
zju('resp', '3NT', null, null, ['4C', '5C'], null, ZR,
  '希望打 4 阶低花，或成局低花 5 阶定约。', [], Z3NT);
zju('resp', '3NT', null, null, ['4NT', '5NT'], null, ZR,
  '邀叫 6 阶 / 7 阶低花，要求有一个富裕赢墩。', ['满贯'], Z3NT);
zju('resp', '3NT', null, null, ['4H', '4S'], null, ZR, '实叫。', [], Z3NT);
zju('resp', '3NT', null, null, '4D', null, ZR,
  '满贯兴趣，要求开叫人叫出边花特征。', ['满贯'], Z3NT);
zju('opener', '3NT', '4D', null, ['4H', '4S'], null, ZO, '所叫花色单缺。', [], Z3NT);
zju('opener', '3NT', '4D', null, '4NT', null, ZO, '无单缺。', [], Z3NT);
zju('opener', '3NT', '4D', null, '5C', null, ZO, '方块单缺。', [], Z3NT);
zju('opener', '3NT', '4D', null, '5D', null, ZO, '梅花单缺。', [], Z3NT);

const Z4C = '浙大体系 · 4♣/4♦（Namyats）应叫';
zju('resp', ['4C', '4D'], null, null, { type: 'newSuit', level: 4 }, null, ZR,
  '接力：问边花控制，有 A 直接叫出，有 K 叫 4NT（后再用 5♣ 问），没有则回到 4♥/4♠。', ['约定叫'], Z4C);
zju('resp', ['4C', '4D'], null, null, { type: 'gameOwn' }, null, ZR, '止叫。', ['止叫'], Z4C);
zju('resp', ['4C', '4D'], null, null, '5NT', null, ZR,
  '将牌完全坚固，请上 7 阶高花。', ['约定叫', '满贯'], Z4C);
zju('resp', ['4C', '4D'], null, null, '4NT', null, ZR, 'RKCB，按 14-03-22 答叫。', ['约定叫', '满贯'], Z4C);
zju('resp', ['4C', '4D'], null, null, { type: 'newSuit' }, null, ZR,
  '新花：控制问叫。', ['约定叫'], Z4C);

const Z4H = '浙大体系 · 4♥/4♠ 开叫应叫';
zju('resp', ['4H', '4S'], null, null, '4NT', null, ZR,
  'RKCB：五级答叫——4♦ 没有关键张、4♥ 1 个、4♠ 1 个 + 将牌 Q、4NT 2 个、5♣ 2 个 + 将牌 Q。', ['约定叫', '满贯'], Z4H);
zju('resp', ['4H', '4S'], null, null, '5C', null, ZR,
  '0 个关键张（五级答叫中的最低级）。', ['满贯'], Z4H);

const Z4NT = '浙大体系 · 4NT 问 A';
zju('resp', '4NT', null, null, '5C', null, ZR, '0 个 A。', ['约定叫', '满贯'], Z4NT);
zju('resp', '4NT', null, null, '5D', null, ZR, '方块 A。', ['约定叫', '满贯'], Z4NT);
zju('resp', '4NT', null, null, '5H', null, ZR, '红心 A。', ['约定叫', '满贯'], Z4NT);
zju('resp', '4NT', null, null, '5S', null, ZR, '黑桃 A。', ['约定叫', '满贯'], Z4NT);
zju('resp', '4NT', null, null, '6C', null, ZR, '梅花 A。', ['约定叫', '满贯'], Z4NT);
zju('resp', '4NT', null, null, '5NT', null, ZR, '2 个 A。', ['约定叫', '满贯'], Z4NT);

const Z5H = '浙大体系 · 5♥/5♠ 开叫应叫';
zju('resp', ['5H', '5S'], null, null, ['6H', '6S'], null, ZR,
  '同伴在将牌上持三顶张之一时叫 6 阶。', ['满贯'], Z5H);

/* =========================================================================--
   十二、争叫与防守
   ========================================================================= */
const ZDF = '浙大体系 · 争叫与加倍';

zju('def', null, null, null, { type: 'newSuit', level: 1 }, '6~15', 'overcaller',
  '一阶花色争叫：6~15P。应叫新花逼叫，扣叫为邀请以上实力。', [], ZDF);
zju('def', null, null, null, '1NT', '15~18', 'overcaller',
  '1NT 争叫（第 2、4 家）：15~18P。应叫方式基本与开叫 1NT 相同，转移到敌方花色为扣叫。', [], ZDF);
zju('def', null, null, null, '1NT', '11~14', 'overcaller',
  '平衡位置的 1NT 争叫：11~14P，被加倍后逃叫方式同 1NT 开叫被加倍。', [], ZDF);
zju('def', null, null, null, { type: 'jumpSuit' }, '弱', 'overcaller',
  '跳争叫：单套弱牌。应叫自然，对 2 阶高花的 2NT 应叫为问叫。', ['阻击'], ZDF);
zju('def', null, null, null, '2NT', null, 'overcaller',
  '不寻常 2NT：除外开叫花色的最低两套（5-5 以上）。', ['约定叫'], ZDF);
zju('def', null, null, null, ['4NT', '5NT'], null, 'overcaller',
  '不寻常 NT：4NT、5NT 均为除外开叫花色的最低双套。', ['约定叫'], ZDF);
zju('def', null, null, null, { type: 'cue' }, null, 'overcaller',
  '迈克尔斯扣叫：扣低花 = 双高套；扣高花 = 另一门高花 + 一门低花。无局 6~11P 或强牌，有局 12P 以上。',
  ['约定叫'], ZDF);
zju('def', null, null, null, { type: 'cue', level: 3 }, null, 'overcaller',
  '跳至 3 阶扣叫：高花为问挡张，低花为套。', ['约定叫'], ZDF);
zju('def', null, null, null, 'X', null, 'overcaller',
  '技术性加倍：牌型好时允许点力稍低。', ['约定叫'], ZDF);
zju('def', null, null, null, 'XX', null, 'overcaller',
  '再加倍：10 点以上，有惩罚倾向，无好的高花配合。', ['约定叫'], ZDF);

const ZDFN = '浙大体系 · 对抗 NT / 阻击';
zju('def', null, null, null, 'X', null, 'overcaller',
  '对抗对方 1NT：对强、弱均用 Cappelletti——X = 惩罚；2♣ = 单套；2♦ = 双高套；2♥ = 红心 + 一门低花；2♠ = 黑桃 + 一门低花；2NT = 双低套。余自然叫。',
  ['约定叫'], ZDFN);
zju('def', null, null, null, '2C', null, 'overcaller',
  'Cappelletti 的 2♣：单套牌。', ['约定叫'], ZDFN);
zju('def', null, null, null, '2D', null, 'overcaller',
  'Cappelletti 的 2♦：双高套。', ['约定叫'], ZDFN);
zju('def', null, null, null, '2NT', null, 'overcaller',
  'Cappelletti 的 2NT：双低套。', ['约定叫'], ZDFN);
zju('def', null, null, null, 'X', null, 'responder',
  '对抗阻击叫：加倍对手 2 阶阻击后使用 Lebensohl 约定叫。', ['约定叫'], ZDFN);

const ZDFD = '浙大体系 · 技术性加倍之后';
zju('def', null, null, null, '1NT', '7~9', 'responder',
  '1M—X—1NT：7~9P，3 张支持的加叫。', [], ZDFD);
zju('def', null, null, null, { type: 'raise' }, null, 'responder',
  '1M—X—2M：阻击性加叫。', ['阻击'], ZDFD);
zju('def', null, null, null, 'X', null, 'responder',
  '负加倍：至 4♥（表示另外两套，如 1♣—4♥—X）。', ['约定叫'], ZDFD);
zju('def', null, null, null, 'X', null, 'opener',
  '支持性加倍 / 再加倍：同伴争叫花色有大牌，直到 2♥（表示 3 张支持，如 1♣—1♠—2♥—X）。', ['约定叫'], ZDFD);
zju('def', null, null, null, 'X', null, 'opener',
  '应答性加倍：直到 4♦（表示有实力、无可叫，如 3♦—X—4♦—X）。', ['约定叫'], ZDFD);
zju('def', null, null, null, 'X', null, 'opener',
  '高限争叫加倍：至 3♥（表示邀请实力，如 1♠—2♥—2♠—3♥—X）。', ['约定叫'], ZDFD);
zju('def', null, null, null, 'X', null, 'opener',
  '首攻指示加倍。', ['约定叫'], ZDFD);

/* =========================================================================--
   十三、语境说明
   ========================================================================= */
const NOTES_ZJU = [
  { t: 'open', o: null, r: null, s: '浙大体系 · 开叫通则',
    text: '五张高花开叫。低花 4-4 开 1♦、3-3 开 1♣；1♣/1♦ 只保证 3 张，通常否认 5 张高花。1NT 允许 5 张高花与 6 张低花。' },
  { t: 'resp', o: ['1C', '1D'], r: null, s: '1♣/1♦ 应叫通则',
    text: '一盖一 6P 以上、4 张高花，未 PASS 过逼叫；1♣ 后优先显示 4 张高花。二盖一 12P 以上进局逼叫。单加叫 11P 以上、逼叫。' },
  { t: 'resp', o: ['1H', '1S'], r: null, s: '1♥/1♠ 应叫通则',
    text: '1NT 为 5~12P 逼叫；二盖一 12P 以上进局逼叫；单加叫 8~10P 保证 3 张；2NT 为均型逼局；跳叫新花为爆裂叫。' },
  { t: 'opener', o: ['1C', '1D'], r: null, s: '1♣/1♦ 开叫方再叫通则',
    text: '优先加叫同伴高花（12~14 单加叫 / 15~17 双加叫 / 18~19 三加叫），其次 1NT 12~14、再叫原花 12~14、顺叫新花 12~17；逆叫 17P 以上、跳叫新花 18P 以上。' },
  { t: 'opener', o: ['1H', '1S'], r: null, s: '1♥/1♠ 开叫方再叫通则',
    text: '1NT 后再叫 2♣ 只保证 3 张，优先作其他描述性叫品；二盖一后逆叫不需要额外实力。' },
  { t: 'opener', o: '1NT', r: '2C', s: '斯台曼答叫',
    text: '2♦ 无 4 张高花；2♥ 4 张红心、不排除 4 张黑桃；2♠ 4 张黑桃、无 4 张红心。' },
  { t: 'responder', o: '1NT', r: '2C', rb: ['2D', '2H', '2S'], s: '斯台曼后续',
    text: '弱斯台曼（7P 以下）用 PASS；2NT 8~9P 邀请；3♣/3♦ 单套低花邀请；3♥/3♠ 为斯莫伦（5-4 或 6-4 高花，进局逼叫）；4NT 定量。' },
  { t: 'opener', o: '1NT', r: ['2D', '2H'], s: '转移叫答叫',
    text: '2~3 张接受转移；持 4 张支持且高限时用 2NT（4333 或双张）或叫双张花色表示；3 阶原高花表示 4 张支持但非高限。' },
  { t: 'responder', o: '1NT', r: ['2D', '2H'], rb: ['2H', '2S'], s: '转移后续',
    text: '2NT 仅 5 张、邀请；3 阶低花保证 4 张、进局逼叫；3 阶原高花 6 张或很好 5 张、邀请；3NT 半均型 10P 以上逼叫；爆裂叫表示满贯邀请。' },
  { t: 'opener', o: '2C', r: '2D', s: '2♣ 强开叫后续',
    text: '2♥ 为过渡叫，2♠ 为接力示弱（0~3P 或均型等待）；无将阶梯 2NT 24~25、3NT 26~27。' },
  { t: 'opener', o: ['2H', '2S'], r: '2NT', s: '弱二问叫答叫',
    text: '3♣ 烂牌烂套、3♦ 好牌烂套、3♥ 烂牌好套、3♠ 好牌好套；新花为控制问叫。' },
  { t: 'opener', o: '2D', r: '2NT', s: '双高阻击问叫答叫',
    text: '3♣/3♦ 单缺（5-4-3-1 或 6-4-2-1）；3♥ 5-4-2-2 低限；3♠ 5-5-2-1 以上；3NT 5-4-2-2 高限。' },
  { t: 'resp', o: ['1C', '1D', '1H', '1S'], r: null, s: 'XYZ 约定叫',
    cond: { respBid: ['1D', '1H', '1S', '1NT'] },
    text: 'XYZ（双路重询）：1X—1Y—1Z 后，2♣ = 转移到 2♦（之后任何再叫为邀请）；2♦ = 进局逼叫。' },
  { t: 'resp', o: ['1C', '1D'], r: null, s: '沃尔什应叫',
    cond: { respBid: ['1H', '1S'] },
    text: '1♣/1♦ 开叫后应 1♥/1♠ 为沃尔什风格：优先显示 4 张高花，可能掩盖更长的低花。' }
];

/* =========================================================================--
   十四、约定叫速查
   ========================================================================= */
const CONVS_ZJU = [
  { s: '罗马关键张问叫 RKCB（4NT）', q: '4NT', a: '以将牌为关键张的满贯问叫',
    rows: [['5♣', '1 或 4 个关键张'], ['5♦', '0 或 3 个关键张'], ['5♥', '2 个关键张，无将牌 Q'], ['5♠', '2 个关键张，有将牌 Q']],
    note: '即 14/03/22 制。排除关键张问叫用逆双跳新花。' },
  { s: '罗马关键张（14/03/25/25+Q）', q: '1NT', a: '部分序列采用的六段答叫',
    rows: [['5♣', '1 或 4 个关键张'], ['5♦', '0 或 3 个关键张'], ['5♥', '2 个关键张，无 Q'], ['5♠', '2 个关键张，有 Q']],
    note: '约定卡另注明「6 阶低于将牌花色为奇数张关键张 + 缺门、5NT 为偶数张关键张 + 缺门」。' },
  { s: '格伯 Gerber（4♣）', q: '4♣', a: '无将定约问 A',
    rows: [['4♦', '0 或 4 个 A'], ['4♥', '1 个 A'], ['4♠', '2 个 A'], ['4NT', '3 个 A']],
    note: '5♣ 继续问 K。2♣ 后 5♣ 为「高格伯」。' },
  { s: '斯台曼 Stayman（2♣ / 傀儡 3♣）', q: '2♣', a: '问 4 张高花',
    rows: [['2♦', '无 4 张高花'], ['2♥', '4 张红心'], ['2♠', '4 张黑桃']],
    note: '1NT 后用 2♣，2NT 后用 3♣（傀儡斯台曼，可问 5 张高花）。' },
  { s: '杰克贝转移叫 Jacoby Transfers', q: '2♦', a: '转移高花',
    rows: [['2♦ → 2♥', '5 张以上红心'], ['2♥ → 2♠', '5 张以上黑桃'], ['3♣ → 3♦', '转移低花']],
    note: '本体系的转移为「高级杰克贝」，开叫人可用 2NT / 双张花色表示高限 4 张支持。' },
  { s: '低花斯台曼', q: '2♠', a: '1NT 后问两门低花',
    rows: [['2NT', '两门低花均少于 4 张'], ['3♣', '双低 5-5 弱牌'], ['3♦', '双低 5-5 进局逼叫']],
    note: '3♥/3♠ 表示该高花单缺、双低 5-4、进局逼叫。' },
  { s: '朱瑞 / 逆朱瑞', q: '2♣', a: '1M 后的 3 张支持约定叫',
    rows: [['（已 PASS 过）2♣', '3 张高花支持，9~12P'], ['2NT', '均型逼局']],
    note: '1M—2♣ 为逆朱瑞，仅限已 PASS 过的应叫人。' },
  { s: 'Namyats（4♣/4♦）', q: '4♣', a: '4♣ 表示红心长套、4♦ 表示黑桃长套',
    rows: [['4♣', '红心 7~8 张，旁门最多 1A'], ['4♦', '黑桃 7~8 张，旁门最多 1A']],
    note: '8~8.5 个做牌赢墩、至少 1.5 个防守赢墩。应叫 4NT 为 RKCB，5NT 请上 7 阶。' },
  { s: 'Cappelletti（对抗 1NT）', q: '2♣', a: '对抗对方 1NT 的约定叫',
    rows: [['X', '惩罚'], ['2♣', '单套'], ['2♦', '双高套'], ['2♥/2♠', '该高花 + 一门低花'], ['2NT', '双低套']],
    note: '对强、弱均使用。' },
  { s: 'Lebensohl（对抗阻击）', q: '2NT', a: '加倍对方 2 阶阻击后使用',
    rows: [['直接扣叫 3 阶敌花', '敌花无挡'], ['先 2NT 再扣叫', '敌花有挡，另有 4 张高花'], ['直接 3NT', '无敌花挡张'], ['先 2NT 再 3NT', '敌花有挡，无另外 4 张高花']],
    note: '弱低花套经 2NT 过渡。' },
  { s: '迈克尔斯 Michaels', q: '扣叫', a: '扣叫对方花色表示两套',
    rows: [['扣低花', '双高套'], ['扣高花', '另一门高花 + 一门低花'], ['跳至 3 阶扣叫', '高花问挡张，低花为套']],
    note: '无局 6~11P 或强牌，有局 12P 以上。' },
  { s: '不寻常 2NT', q: '2NT', a: '争叫 2NT 表示最低两套',
    rows: [['2NT', '除外开叫花色的最低两套 5-5 以上'], ['4NT/5NT', '同义，阶数更高']],
    note: '应叫自然，对 2 阶高花的 2NT 应叫为问叫。' }
];

/* =========================================================================--
   十五、问叫答叫表（按「同伴刚发出问叫」触发）
   ========================================================================= */
const ANSWERS_ZJU = {
  rkcb: {
    '5C': [{ p: null, d: '1 或 4 个关键张。', s: '浙大体系 · RKCB', k: ['满贯'] }],
    '5D': [{ p: null, d: '0 或 3 个关键张。', s: '浙大体系 · RKCB', k: ['满贯'] }],
    '5H': [{ p: null, d: '2 个关键张，无将牌 Q。', s: '浙大体系 · RKCB', k: ['满贯'] }],
    '5S': [{ p: null, d: '2 个关键张，有将牌 Q。', s: '浙大体系 · RKCB', k: ['满贯'] }]
  }
};

/* ---------------- 注册体系 ---------------- */
registerSystem({
  key: 'zju',
  name: '浙大自然',
  full: '浙大自然叫牌体系',
  by: '《公共体系最终版》· 世界桥联约定卡格式',
  rules: RULES_ZJU,
  notes: NOTES_ZJU,
  convs: CONVS_ZJU,
  answers: ANSWERS_ZJU,
  blurb: '五张高花开叫、1NT 15~17；含 XYZ 双路重询、逆朱瑞、Namyats、低花斯台曼、Cappelletti、Lebensohl 等约定。'
});
