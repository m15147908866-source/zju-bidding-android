# 贡献指南

本文件规定本仓库的改动流程。除非是错别字级别的修正，所有改动都必须走「分支 → Pull Request → CI 通过 → 合并 → 发布」这条链路，`main` 上不直接提交。

## 1. 环境

- Node.js 20+：只用于跑 `scripts/set-version.mjs` 与 CI 的静态检查
- JDK 17+、Android SDK（`build-tools;36.0.0`、`platforms;android-34`）：只在需要打 APK 时用
- Python 3：构建脚本用它把 `classes.dex` 写进 APK

构建脚本不依赖 Gradle，所有路径都通过环境变量传入，不写死在本机路径上：

```bash
OUT_APK=dist/ZJU-bidding.apk bash android/build.sh
```

完整变量见 [android/build.sh](android/build.sh) 头部注释。

## 2. 分支

`main` 始终保持可发布状态。每个改动开一条短生命周期分支，从最新的 `main` 切出，合并后立即删除。

| 前缀 | 用途 | 示例 |
|---|---|---|
| `feat/` | 新功能 | `feat/relay-ask` |
| `fix/` | 问题修复 | `fix/back-key-exit` |
| `data/` | 叫牌体系数据 | `data/zju-1nt-response` |
| `chore/` | 工程配置、依赖、构建 | `chore/ci-setup` |
| `docs/` | 文档 | `docs/readme-build` |
| `hotfix/` | 线上紧急修复，事后补齐流程 | `hotfix/install-crash` |

## 3. 提交信息

采用 Conventional Commits，标题写「做了什么」，正文写「为什么」：

```
fix(engine): 修正 1NT 应叫后 2C 的合法性判断

Stayman 在对手争叫后不应再可用，原规则只判断了开叫方。
```

常用 type：`feat` `fix` `data` `refactor` `chore` `docs` `test`。一条提交只做一件事；数据文件的批量改动单独成一条，便于回溯。

## 4. 版本号

`VERSION` 文件是**唯一来源**，不要手改 `android/AndroidManifest.xml` 或 `sw.js` 里的版本相关内容。改完 `VERSION` 后执行：

```bash
node scripts/set-version.mjs
```

脚本会同步 `versionName`、`versionCode`（= major×10000 + minor×100 + patch）和离线缓存名 `CACHE`。CI 会用 `--check` 校验三者一致，不一致直接失败。

缓存名必须随版本变化，否则老用户会一直拿 `sw.js` 里的旧缓存。

## 5. 本地自测

```bash
for f in app.js engine.js core/*.js; do node --check "$f"; done   # 改动过的 JS 逐个检查
node scripts/migrate-legacy.mjs         # 仅在改 legacy/ 或迁移规则时需要
node scripts/validate-rules.mjs         # 规则结构 / 语境可达性 / 同叫品唯一性
node scripts/build-data.mjs             # 重新打包 data/bridge-data.js
node --test core/*.test.js              # 核心纯函数单测
node scripts/smoke-engine.mjs           # 适配层冒烟：结算、合法集、语境、推荐、体系卡
node scripts/check-assets.mjs           # 资源引用：index/sw/manifest/build.sh/原生桥一致性
node scripts/set-version.mjs --check    # 版本一致性
```

规则数据的「迁移 → 校验 → 打包」流程见 [README.md](README.md)。`data/bridge-data.js` 是生成物，
必须和源数据一起提交；CI 会重跑迁移与打包，用 `git diff --exit-code data/` 确认仓库里的文件是最新的。

改 Android 壳或影响启动路径时，另外确认：冷启动正常、返回键能逐级退出、旋转屏幕不重载、重启应用后多局记录还在（记录走 `AndroidStore` 桥存进 SharedPreferences）、AI 分析能正常请求（APK 内的网络请求走 `AndroidHttp` 原生桥，不受 WebView 的 CORS 限制）。

## 6. Pull Request

1. 推送分支，按模板开 PR，标题与主提交保持同一风格（CI 会校验标题格式）
2. 填写 PR 模板里的自查项；`Closes #<issue>` 关联对应 issue
3. 等 CI 三个任务都变绿：**静态检查**、**规则与测试**、**构建 APK**，汇总检查名为 `ci-success`
4. 评审通过后由维护者 **Squash and merge**，合并后的提交信息用 PR 标题，并删除分支
5. 用户可见的改动，在合并前把 `CHANGELOG.md` 的 `[Unreleased]` 段补上

PR 规模：有效 diff 控制在 400 行以内，超过就拆。数据文件的批量改动单独开 PR，便于回溯。

评审节奏：首次响应 1 个工作日内。评审关注点：叫牌数据是否符合所声明的体系、引擎规则改动是否会让既有序列行为漂移、是否引入新的全局状态。

### 紧急修复通道

线上有严重问题时允许先修复后补流程：开 `hotfix/<问题>` 分支 → 走同一个 PR（可先合并）→ 事后 24 小时内补齐 issue、CHANGELOG 与回归说明。不要用 `--no-verify` 或直接推 `main` 绕过。

## 7. 发布

版本号遵循语义化版本：叫牌数据纠错与 bug 修复发 `patch`，新功能发 `minor`，界面或数据结构不兼容发 `major`。

发布由维护者执行：

```bash
# 1. 准备发布提交（走 PR，不要直接推 main）
node scripts/set-version.mjs            # 改 VERSION 后同步
# 把 CHANGELOG.md 的 [Unreleased] 内容移到新版本标题下，并补日期

# 2. 合并 PR 后，在 main 上打 tag
git switch main && git pull
git tag -a v4.3.0 -m "v4.3.0"
git push origin v4.3.0
```

推 tag 会触发 `.github/workflows/release.yml`：校验 tag 与 `VERSION` 一致 → 构建 APK → 用 `CHANGELOG.md` 对应段落生成发布说明 → 创建 GitHub Release 并把 `ZJU-bidding.apk` 作为附件上传。

**APK 不入库**，只作为 Release 附件分发。仓库里出现 `*.apk` 视为误提交。

### 签名

`.github/workflows/release.yml` 会从仓库 Secrets 读取发布密钥；没有配置时退回临时调试密钥，产物与历史版本签名不同、无法覆盖安装，工作流会打 warning。

首次配置（密钥文件不要进仓库）：

```bash
keytool -genkeypair -keystore release.jks -alias zju \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.jks > release.jks.b64
```

然后在 Settings → Secrets and variables → Actions 添加：

| Secret | 内容 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `release.jks.b64` 的内容 |
| `ANDROID_KEYSTORE_PASS` | keystore 口令 |
| `ANDROID_KEY_ALIAS` | 别名，如 `zju` |
| `ANDROID_KEY_PASS` | 密钥口令 |

`release.jks` 请离线备份：一旦丢失，已安装用户只能卸载重装才能升级。

### 一次性仓库设置

需要仓库管理员权限，配完用命令核对一遍。

```bash
# 1) main 保护：必需 PR、必需 ci-success、禁强推与删除
gh api -X POST repos/m15147908866-source/zju-bidding-android/rulesets \
  --input .github/ruleset-main.json

# 2) 核对规则已生效
gh api repos/m15147908866-source/zju-bidding-android/rulesets \
  --jq '.[] | {name, enforcement}'
```

界面上还要确认三处：

- Settings → General → Pull Requests：只勾 **Squash and merge**，并勾选合并后自动删除分支
- Settings → Actions → General：Workflow permissions 选 **Read repository contents**，不让默认 token 带写权限
- Settings → Code security：开启 **Secret scanning**、**Push protection**、**Dependabot alerts**

单人维护阶段 ruleset 里的批准人数是 `0`：仍然强制走 PR 与 CI，但不要求别人批准，避免作者无法批准自己的 PR 而导致无法合并。有第二位评审人后，把 `required_approving_review_count` 改成 `1`，并把 `require_code_owner_review` 打开。

完整清单见规范包 `09_落地检查表.md`：阶段 0–1 已完成，阶段 2 里的 commitlint / pre-commit 暂不引入——仓库没有 Node 依赖，PR 标题校验已用 `pr-title.yml` 覆盖，不额外增加本地钩子。

## 8. 行为与安全

- 参与讨论与提交请遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- 安全问题的报告渠道与响应时限见 [SECURITY.md](SECURITY.md)，不要开公开 issue
