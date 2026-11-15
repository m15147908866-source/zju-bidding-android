# ZJU 叫牌

桥牌自然叫牌练习应用（Android 版）。收录三套叫牌体系，提供叫品含义查询、推荐叫品、手牌选牌、记牌器与 AI 叫牌分析。

## 下载

安装包见 [Releases](https://github.com/m15147908866-source/zju-bidding-android/releases)（`ZJU-bidding.apk`，Android 6.0 及以上）。仓库不再存放构建产物，每次发布由 CI 从 tag 构建。

## 体系

| 体系 | 说明 |
|---|---|
| SAYC | Standard American Yellow Card（ACBL 标准美国黄卡） |
| 浙大自然 | 浙大自然叫牌体系 |
| 新睿桥牌 | 新睿桥牌训练体系 |

## 目录结构

```
├── VERSION                  # 版本号唯一来源
├── index.html               # 主页面（单文件应用入口）
├── app.js                   # 前端逻辑（叫牌交互 / 推荐 / AI 分析）
├── engine.js                # UI 适配层（旧接口 → core，负责存档与展示字段）
├── core/                    # 纯函数层：叫品 / 叫牌过程 / 语境 / 规则 / 推荐 / 手牌
│   ├── calls.js             # 叫品编码、大小比较、合法阶数
│   ├── auction.js           # 叫牌过程、合法叫品、定约与庄家（Laws 2017）
│   ├── context.js           # contextKey 语境键、角色识别、问叫识别
│   ├── rules.js             # 规则索引、语境匹配、唯一性优先级
│   ├── hand.js              # 手牌点数 / 牌型约束
│   └── recommend.js         # 按「语境 + 点力 + 牌型」推荐
├── data/
│   ├── bridge-data.js       # 由 scripts/build-data.mjs 生成的规则包
│   ├── systems.json         # 体系元数据、说明、约定叫、答叫
│   └── rules/*.json         # 迁移后的结构化规则
├── legacy/                  # 旧版扁平规则（仅迁移脚本使用，不再随应用发布）
├── scripts/                 # 迁移、校验、打包、版本同步、冒烟测试
├── manifest.json / sw.js    # PWA 清单与离线缓存
├── icons/                   # 应用图标
└── android/                 # Android 壳工程
    ├── AndroidManifest.xml
    ├── build.sh             # 构建脚本（不依赖 Gradle）
    ├── java/.../MainActivity.java
    └── res/                 # 图标与样式资源
```

## 规则数据的工作流

规则不是手写进应用，而是「迁移 → 校验 → 打包」三步生成，任何一步失败 CI 都会拦下：

```bash
node scripts/migrate-legacy.mjs   # legacy/*.js → data/rules/*.json + data/systems.json
node scripts/validate-rules.mjs   # 结构 / 语境可达性 / 同叫品唯一性
node scripts/build-data.mjs       # 打包成 data/bridge-data.js
node --test core/*.test.js        # 纯函数单测
node scripts/smoke-engine.mjs     # 适配层冒烟（结算、语境、推荐、体系卡）
```

修改规则时请改 `data/rules/*.json` 或迁移脚本里的覆盖项，并保留 `source` / `tags` 以便回指原始体系卡。

## 从源码构建 APK

本仓库不含签名密钥。未指定密钥时，构建会使用 `.keystore/debug.keystore` 中的临时调试密钥（首次自动生成，已被 git 忽略）：

```bash
bash android/build.sh
```

产物输出到 `dist/ZJU-bidding.apk`。签名相关变量（`KEYSTORE`、`KEYSTORE_PASS` 等）见脚本头部注释。

### 依赖

- JDK 17+（脚本优先使用 `JAVA_HOME`）
- Android SDK，含 `build-tools;36.0.0` 与 `platforms;android-34`，通过 `ANDROID_HOME` 指定
- Python 3

## 参与开发

分支规范、提交信息、PR 与发布流程见 [CONTRIBUTING.md](CONTRIBUTING.md)，版本变更见 [CHANGELOG.md](CHANGELOG.md)。

## 网页版（PWA）

应用同时提供无 AI 的两页版 PWA，发布在独立仓库：

https://github.com/m15147908866-source/zju-bidding
