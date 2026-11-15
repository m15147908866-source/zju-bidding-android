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
├── engine.js                # 叫牌引擎（语境识别 / 规则匹配 / 合法性）
├── data.js                  # SAYC 体系规则
├── data-zju.js              # 浙大自然体系规则
├── data-xinrui.js           # 新睿桥牌体系规则
├── manifest.json / sw.js    # PWA 清单与离线缓存
├── icons/                   # 应用图标
├── scripts/                 # 版本同步等仓库脚本
└── android/                 # Android 壳工程
    ├── AndroidManifest.xml
    ├── build.sh             # 构建脚本（不依赖 Gradle）
    ├── java/.../MainActivity.java
    └── res/                 # 图标与样式资源
```

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
