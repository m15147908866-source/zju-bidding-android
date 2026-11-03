# ZJU 叫牌

桥牌自然叫牌练习应用（Android 版）。收录三套叫牌体系，提供叫品含义查询、推荐叫品、手牌选牌、记牌器与 AI 叫牌分析。

## 体系

| 体系 | 说明 |
|---|---|
| SAYC | Standard American Yellow Card（ACBL 标准美国黄卡） |
| 浙大自然 | 浙大自然叫牌体系 |
| 新睿桥牌 | 新睿桥牌训练体系 |

## 目录结构

```
├── ZJU-bidding.apk          # 成品安装包（可直接安装）
├── index.html               # 主页面（单文件应用入口）
├── app.js                   # 前端逻辑（叫牌交互 / 推荐 / AI 分析）
├── engine.js                # 叫牌引擎（语境识别 / 规则匹配 / 合法性）
├── data.js                  # SAYC 体系规则
├── data-zju.js              # 浙大自然体系规则
├── data-xinrui.js           # 新睿桥牌体系规则
├── manifest.json / sw.js    # PWA 清单与离线缓存
├── icons/                   # 应用图标
└── android/                 # Android 壳工程
    ├── AndroidManifest.xml
    ├── build.sh             # 构建脚本（不依赖 Gradle）
    ├── java/.../MainActivity.java
    └── res/                 # 图标与样式资源
```

## 从源码重新打包 APK

本仓库不含签名密钥（`keystore.jks`），构建时会自动生成一个新的调试密钥：

```bash
cd android
bash build.sh
```

产物输出到上级目录 `ZJU-bidding.apk`。

### 依赖

- JDK（构建脚本默认指向 `C:/Program Files/Microsoft/jdk-25.0.3.9-hotspot`，可按需修改）
- Android SDK（`build-tools/36.0.0`、`platforms/android-34`）

## 网页版（PWA）

应用同时提供无 AI 的两页版 PWA，发布在独立仓库：

https://github.com/m15147908866-source/zju-bidding
