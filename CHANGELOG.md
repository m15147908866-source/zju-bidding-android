# 更新日志

本项目的所有重要改动记录在此。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 版本号改为以 `VERSION` 文件为唯一来源，由 `scripts/set-version.mjs` 同步到 Android 清单与离线缓存名
- CI：PR 与 `main` 推送时执行 JS 语法检查、清单校验、版本一致性校验，并构建 APK 作为检查产物
- CI 汇总为单一必需检查 `ci-success`，PR 标题按 Conventional Commits 校验
- 发布工作流：推送 `v*` tag 自动构建签名 APK 并创建 GitHub Release
- PR、Bug、功能建议、叫牌数据纠错四类模板
- `main` 分支保护规则（`.github/ruleset-main.json`）、CODEOWNERS、Dependabot（仅跟进 Actions）
- `SECURITY.md`、`CODE_OF_CONDUCT.md`、`.editorconfig`
- `LICENSE`（MIT）

### Changed

- `android/build.sh` 去掉硬编码的本机路径，改为环境变量（`ANDROID_HOME`、`BUILD_TOOLS`、`OUT_APK`、`KEYSTORE` 等），本地与 CI 共用
- 构建产物统一输出到 `dist/`，不再覆盖仓库根目录下的文件
- APK 停止提交进仓库，改为随 Release 附件分发

### Fixed

- `build.sh` 依赖未定义的 `$PYTHON`，在未预先导出的环境下会构建失败
- 离线缓存名固定为 `zju-bid-v1`，升级后老用户可能继续命中旧缓存

## [4.3.0] - 2026-11-15

首个规范化的基线版本，内容与 4.3 一致，仅调整仓库工程与发布方式。

### Added

- 三套叫牌体系：SAYC、浙大自然、新睿桥牌
- 叫品含义查询、推荐叫品、手牌选牌、记牌器与 AI 叫牌分析
- PWA 离线缓存，无网络也可使用
- Android WebView 壳，页面全部内置，记录经 `AndroidStore` 桥存入 SharedPreferences

[Unreleased]: https://github.com/m15147908866-source/zju-bidding-android/compare/v4.3.0...HEAD
[4.3.0]: https://github.com/m15147908866-source/zju-bidding-android/releases/tag/v4.3.0
