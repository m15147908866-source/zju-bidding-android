# ZJU 叫牌

[![CI](https://github.com/m15147908866-source/zju-bidding-android/actions/workflows/ci.yml/badge.svg)](https://github.com/m15147908866-source/zju-bidding-android/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/m15147908866-source/zju-bidding-android?label=release)](https://github.com/m15147908866-source/zju-bidding-android/releases)
[![License](https://img.shields.io/github/license/m15147908866-source/zju-bidding-android)](LICENSE)
![Android](https://img.shields.io/badge/Android-6.0%2B-3ddc84?logo=android&logoColor=white)

桥牌自然叫牌练习与教学工具。收录 **SAYC、浙大自然、新睿桥牌** 三套体系共 **768 条规则**，提供叫品含义查询、手牌推荐、记牌器与可选的 AI 叫牌分析。同一套代码同时产出 **Android APK** 与 **可离线 PWA**。

- 叫牌台：点一次看含义，再点一次叫出；支持 Pass / 加倍 / 再加倍、撤回、新一局
- 手牌推荐：输入大牌点与四门张数，按「语境 + 点力 + 牌型 + 判断层」给出候选与理由
- 体系切换：三套体系独立收录，切换后当前牌局重新开始
- 记牌器：按花色记录已出与剩余张数
- AI 分析（可选）：接入任意 OpenAI 兼容接口，把手牌与叫牌过程整理成提示词；Android 走原生 HTTP，网页版需接口允许跨域。接口限 `https`，`http` 明文地址需二次确认

## 下载

发布由 CI 从 tag 构建，附件见 [Releases](https://github.com/m15147908866-source/zju-bidding-android/releases)：

| 客户端 | 附件 | 说明 |
|---|---|---|
| Android | `ZJU-bidding.apk` | Android 6.0（API 23）及以上；含 AI 分析与本地存档 |
| 网页版 | `ZJU-bidding-web-v<版本>.zip` | 解压后用 HTTP 静态服务打开；支持安装到主屏幕与离线使用 |

> Release 的 APK 由 CI 使用项目发布密钥签名，可直接覆盖升级。从 5.0.0 及更早版本（临时调试密钥）升级时需先卸载一次；自行构建且未提供 `KEYSTORE` 时仍会回退到临时调试密钥。

## 三套体系

| 体系 | 规则数 | 说明 |
|---|---:|---|
| SAYC | 297 | Standard American Yellow Card，依据 ACBL 手册与 bridgebum SAYC 系列整理 |
| 浙大自然 | 400 | 《公共体系最终版》，含 XYZ 双路重询、逆朱瑞、Namyats、低花斯台曼、Cappelletti、Lebensohl 等 |
| 新睿桥牌 | 71 | 新睿桥牌训练体系，二盖一逼局、第四花色逼局、满贯扣叫从 3♣ 起 |

三套体系都以五张高花开叫、1NT 15~17 为基础，细节按各自体系卡区分。SAYC 侧的 1M 应叫采用 2/1 配套的**半逼叫 1NT**：`1♥/1♠—1NT` 为 6~14 点、逼叫一轮，开叫人不得 Pass；13~14 点经 1NT 后再叫 2NT 邀局，15~17 点走 3NT，4 张以上将牌支持走 Jacoby 2NT。

## 快速开始

### 网页版

```bash
unzip ZJU-bidding-web-v5.0.1.zip -d zju-bidding
cd zju-bidding
python -m http.server 8000
```

浏览器访问 `http://localhost:8000`。请勿直接双击 `index.html`：Service Worker 与 AI 请求在 `file://` 下不可用。

### 叫牌台操作

1. 顶部选择体系，点「开始」进入牌局
2. 叫品按钮**点一次**弹出含义卡，**再点一次**才真正叫出
3. 左右滑动切换「分析 / 叫牌 / 记牌器」三页
4. 分析页可切换本家座位，输入手牌后查看推荐叫品

## AI 分析：成本与风险

AI 分析默认关闭，只有填了接口地址与 Key 才会联网。使用前需要知道三件事：

- **上下文按语境裁剪**：体系卡默认只带与当前语境相关的规则（怎么走到这里、当前这一手、下一手），并在每次分析时按当前叫牌重建。实测开叫时：SAYC 约 8.7 千、浙大约 1.1 万、新睿约 4.3 千字符；叫牌推进后通常降到 4~6 千字符。接口设置里勾选「发送完整体系卡」可以回到全量（SAYC 约 2.08 万、浙大约 2.58 万、新睿约 4.4 千字符），token 消耗明显更高。程序只裁剪最近 12 条对话，体系卡不裁。
- **费用可见**：每次点「分析当前局面」，按钮下方会显示本次发送的字符数与 token 估算（按约 1.6 字符/token 粗估）。这只是量级提示，实际计费仍以服务商账单为准。
- **Key 存在本机**：Android 存在 `SharedPreferences`、网页版存在 `localStorage`，均为明文。Key 只发往你填写的接口地址，不经过项目服务器。
- **`http` 是明文传输**：一旦接口地址不是 `https`，Key 与手牌会以明文经过网络。保存 `http` 地址时会弹窗确认，接口设置里也会常驻红色提示；建议只在完全信任的本地或内网接口上使用。

## 从源码构建

### 依赖

- Node.js 20+（脚本与测试，无第三方依赖）
- JDK 17+（`JAVA_HOME`）
- Android SDK：`build-tools;36.0.0`、`platforms;android-34`（`ANDROID_HOME`）
- Python 3（构建脚本用它把 `classes.dex` 写入 APK）

### Android APK

构建不依赖 Gradle，直接调用 SDK 工具链：

```bash
bash android/build.sh                 # 产物 dist/ZJU-bidding.apk
OUT_APK=/tmp/app.apk bash android/build.sh
```

可用变量：`BUILD_TOOLS`、`ANDROID_PLATFORM`、`OUT_APK`、`KEYSTORE`、`KEYSTORE_PASS`、`KEY_ALIAS`、`KEY_PASS`，详见 [android/build.sh](android/build.sh) 头部注释。

SDK 只从 `ANDROID_HOME` / `ANDROID_SDK_ROOT` 读取；两者都没设置时，脚本会探测常见安装目录（如 `%LOCALAPPDATA%\Android\Sdk`、`~/Library/Android/sdk`），仍找不到就明确报错。JDK 同理：优先 `JAVA_HOME`，否则要求 `javac` 在 `PATH` 上。

### 网页版 zip

```bash
node scripts/package-web.mjs          # 产物 dist/ZJU-bidding-web-v<VERSION>.zip
```

### 版本号

版本唯一来源是 [VERSION](VERSION)，同步写入 `AndroidManifest.xml` 与 `sw.js`：

```bash
node scripts/set-version.mjs 5.0.1    # 修改三处
node scripts/set-version.mjs --check  # CI 用，校验三处一致
```

## 规则数据流水线

规则不手写进应用，而是「迁移 → 校验 → 打包」生成，CI 会验证生成物与仓库一致：

```
legacy/*.js ──migrate-legacy.mjs──▶ data/rules/*.json ──build-data.mjs──▶ data/bridge-data.js
                     │                        │
                     └──────────── validate-rules.mjs（结构 / 语境可达 / 同叫品唯一）
```

```bash
node scripts/migrate-legacy.mjs   # 旧版扁平规则 → 结构化 JSON（点力、牌型、语境键）
node scripts/validate-rules.mjs   # 0 错误 0 警告方可提交
node scripts/build-data.mjs       # 生成运行时规则包
git diff --exit-code data/        # CI：确保迁移可重复
```

新增或修改规则时改 `legacy/data*.js`（或迁移脚本里的显式覆盖项），保留 `source` / `tags`，以便回指体系卡原文。

## 测试与 CI

| 命令 | 覆盖内容 |
|---|---|
| `node --test core/*.test.js` | 叫品编码、叫牌过程、语境键、规则匹配、手牌约束、推荐器 |
| `node scripts/validate-rules.mjs` | 规则结构、语境可达性、唯一性 |
| `node scripts/smoke-engine.mjs` | `engine.js` 适配层：结算、语境、推荐、体系卡 |
| `node scripts/smoke-ui.mjs` | 产品级流程：首屏、出价、结算、悔牌、体系切换、AI 失败路径 |
| `node scripts/check-assets.mjs` | 页面引用、构建脚本复制清单、资源完整性 |
| `node scripts/set-version.mjs --check` | VERSION / AndroidManifest / sw.js 一致 |

CI（[ci.yml](.github/workflows/ci.yml)）在 PR 上跑「静态检查」与「构建 APK」，汇总为唯一必需检查 `ci-success`；打 `v*` tag 时 [release.yml](.github/workflows/release.yml) 校验 tag 与 VERSION 一致，构建并发布 APK 与网页版 zip。

## 目录结构

```
├── VERSION                  # 版本号唯一来源
├── index.html               # 单文件页面入口（三页滑动布局）
├── app.js                   # 界面与交互：叫牌台、分析页、记牌器
├── engine.js                # 适配层：旧接口 → core，负责存档与展示字段
├── core/                    # 纯函数层（UMD，无构建步骤）
│   ├── calls.js             # 叫品编码、大小比较、阶数
│   ├── auction.js           # 叫牌过程、合法叫品、定约与庄家（Laws 2017）
│   ├── context.js           # contextKey 语境键、角色识别、问叫识别
│   ├── rules.js             # 规则索引、语境匹配、唯一性优先级
│   ├── hand.js              # 大牌点与牌型约束
│   ├── recommend.js         # 推荐评分与 PASS 抑制
│   └── *.test.js            # node:test 回归测试
├── data/
│   ├── bridge-data.js       # 生成的规则包
│   ├── systems.json         # 体系元数据、说明、约定叫
│   └── rules/*.json         # 迁移后的结构化规则
├── legacy/                  # 旧版扁平规则，仅供迁移
├── scripts/                 # 迁移、校验、打包、版本、冒烟
├── manifest.json / sw.js    # PWA 清单与离线缓存
├── icons/                   # 应用图标
└── android/                 # Android 壳工程（WebView + 原生存储/HTTP 桥）
    ├── AndroidManifest.xml
    ├── build.sh             # 无 Gradle 构建脚本
    ├── java/com/feng/sayc/MainActivity.java
    └── res/
```

## 设计要点

- **零构建前端**：`core/`、`data/`、`engine.js`、`app.js` 均为可直接加载的 UMD 脚本，改完刷新即可，不引入打包器与依赖。
- **语境相对化**：规则用 `contextKey`（如 `M:1H P:1N`）描述「谁在第几轮叫什么」，与绝对座位解耦，换庄换座位不影响匹配。
- **推荐不是查表**：候选得分 = 100 + 点力匹配 + 牌型匹配 + 判断层修正；`PARTNER_FORCING` 会抑制 PASS，避免在同伴逼叫时推荐不叫。
- **规则可回溯**：每条规则带来源章节与标签，界面上的含义卡直接展示原文说明。

## 参与开发

流程见 [CONTRIBUTING.md](CONTRIBUTING.md)：所有改动走「分支 → PR → CI 通过 → Squash 合并」，提交信息用 Conventional Commits，用户可见改动同步更新 [CHANGELOG.md](CHANGELOG.md)。安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。

## 许可

[MIT](LICENSE)。规则文本整理自公开体系资料，引用出处见各规则条目的 `source` 字段。
