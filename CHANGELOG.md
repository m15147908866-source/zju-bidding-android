# 更新日志

本项目的所有重要改动记录在此。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 新增产品级流程冒烟 `scripts/smoke-ui.mjs`：首屏初始化、出价、结算、悔牌、体系切换、AI 未配置 / http 拦截 / 请求失败，已接入 CI
- AI 分析按钮下方显示本次发送的字符数与 token 估算

### Changed

- 规则数据收口：`data/rules/*.json` 成为唯一数据源，CI 不再重跑迁移；迁移脚本移至 `tools/` 并默认只读（需 `--write`）
- 新增 `scripts/coverage-report.mjs`，CI 打印规则覆盖率与未编码说明清单
- 体系卡默认按当前语境裁剪（历史 / 当前 / 下一手），每次分析按当前叫牌重建；接口设置新增「发送完整体系卡」开关
- AI 接口为 `http://` 时，保存地址与发送请求前都需显式确认；接口设置里常驻明文传输警告
- README 增加「AI 分析：成本与风险」，说明体系卡体积、token 计费、Key 明文存储与 `http` 风险
- `android/build.sh` 不再回退到个人机器路径：SDK 仅从环境变量或常见安装目录探测，缺少 `build-tools` / JDK 时直接报错

## [5.0.1] - 2026-11-16

发布签名。Release APK 改由固定发布密钥签名，从此支持覆盖升级。

### Changed

- Release 构建注入 `ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASS` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASS`，APK 固定由项目发布密钥签名
- README 更新下载、签名与覆盖安装说明

### Notes

- 从 5.0.0 及更早版本（临时调试密钥签名）升级到本版需先卸载一次；此后可直接覆盖升级

## [5.0.0] - 2026-11-16

叫牌内核重写。规则数据由「扁平列表 + 界面里再判断」改为「结构化规则 + 单一语境键」，
结算、语境、推荐三类 P0 缺陷在根上修复。

### Added

- `core/` 纯函数层：`calls` / `auction` / `context` / `rules` / `hand` / `recommend`，可在 Node 里直接单测
- `contextKey` 语境键（`M/P/O` 相对身份 + 规范叫品），彻底取代 `contested` 布尔
- 规则 schema：`contextKeys`、`hcp`、`shape`、`forcing`、`alert`、`recommendable`、`source`
- 迁移脚本 `scripts/migrate-legacy.mjs`：把 599 条旧规则转成结构化规则（当前 768 条），保留 `legacyP` / `meaning` / `source` 以便回指资料
- 校验脚本 `scripts/validate-rules.mjs`：结构、语境可达性、同语境同叫品唯一性
- 打包脚本 `scripts/build-data.mjs`：生成 `data/bridge-data.js`，`file://` 与 APK 均可同步加载
- 网页版打包脚本 `scripts/package-web.mjs`：生成 `dist/ZJU-bidding-web-v<版本>.zip`，Release 同时提供 Android APK 与网页版（PWA）
- 单元测试（`core/*.test.js`）、适配层冒烟（`scripts/smoke-engine.mjs`）与资源引用检查（`scripts/check-assets.mjs`），CI 全量执行
- 版本号改为以 `VERSION` 文件为唯一来源，由 `scripts/set-version.mjs` 同步到 Android 清单与离线缓存名
- CI：PR 与 `main` 推送时执行 JS 语法检查、清单校验、版本一致性校验，并构建 APK 与网页版 zip 作为检查产物
- CI 汇总为单一必需检查 `ci-success`，PR 标题按 Conventional Commits 校验
- 发布工作流：推送 `v*` tag 自动构建签名 APK 与网页版 zip 并创建 GitHub Release
- PR、Bug、功能建议、叫牌数据纠错四类模板
- `main` 分支保护规则（`.github/ruleset-main.json`）、CODEOWNERS、Dependabot（仅跟进 Actions）
- `SECURITY.md`、`CODE_OF_CONDUCT.md`、`.editorconfig`
- `LICENSE`（MIT）

### Changed

- `engine.js` 改为适配层：内部调用 `core`，对外保持 `legalSet / analyze / lookupRules / contractInfo` 等接口，存档格式不变
- 三套体系数据移入 `legacy/`，不再随应用发布
- Android 页面改用虚拟 https 源 `https://appassets.androidplatform.net/`，移除 `setAllowUniversalAccessFromFileURLs` 等 file:// 开关
- 推荐改由 `recommend.js` 统一计算：必须命中「语境 + 点力 + 牌型」且 `recommendable !== false`
- `android/build.sh` 去掉硬编码的本机路径，改为环境变量（`ANDROID_HOME`、`BUILD_TOOLS`、`OUT_APK`、`KEYSTORE` 等），本地与 CI 共用
- 构建产物统一输出到 `dist/`，不再覆盖仓库根目录下的文件
- APK 停止提交进仓库，改为随 Release 附件分发
- Release 资产扩展为 Android APK + 网页版 zip，网页版可直接部署到任意静态站点

### Fixed

- 庄家按「同阵营中最早叫出最终花色的人」判定（Laws 2017 Definitions），修正结算页做庄人错误
- 同方不能再加倍；新叫品覆盖先前的加倍；被加倍后仍可再加倍
- `1S-(2H)-3H` 不再被当成「强跳新花」：语境键包含对手争叫，未收录时如实显示「未收录」
- 0 点手牌不再推荐 2S~7S 扣叫，6 点手牌不再推荐 4NT 黑木
- 同一语境下一个叫品只取最具体的一条规则（具体叫品 > 扣叫 > 爆裂 > 跳叫 > 加叫）
- `bidStrain` 误返回阶数，导致花色形态规则长期匹配失败
- 开叫推荐补齐原说明里的张数/牌型约束：4 张高花不再被推荐为 1♥/1♠，1NT 要求均型，弱二与阻击要求所叫花色张数
- 迁移时叫品比较误用字符串，斯台曼/转移/2♣ 后续说明的语境键被清空、页面上不可达
- 浙大体系「对抗 2 阶阻击用 Lebensohl」的语境键写成半截通配 `O:2*`，永远匹配不上真实叫品；改为具体二阶花色并降级为语境说明（加倍本身的含义仍由「技术性加倍」提供），校验脚本同时拒绝半截通配
- 离线缓存补上 `apple-touch-icon.png`
- 约定叫的含义卡补上「提示」标记（规则自带 `alert`，新睿斯台曼/转移此前不可见），旧标签「约定 / 转移」也按约定叫着色
- 手牌点数输入后，手牌摘要的「按点数 · N 点」不及时刷新，显示与推荐不一致
- 新一局或切换体系时清空记牌器：记牌器按局生效，不把上一副已出的牌带进下一副
- Android 返回键先关设置、体系选择、含义气泡与结算卡，没有可关的层才退出；字体缩放交还系统设置
- Android 关闭 `allowBackup`（API Key 不进云备份），屏幕方向与 PWA 统一为竖屏
- AI 请求增加 90 秒超时与并发保护；回看历史叫品时约定叫不再显示成 `[object Object]`
- `build.sh` 依赖未定义的 `$PYTHON`，在未预先导出的环境下会构建失败
- 离线缓存名固定为 `zju-bid-v1`，升级后老用户可能继续命中旧缓存
- 推荐与教材对齐：1♦ 要求 4 张、拼搏 3NT 要求 7 张低花、一阶/二阶争叫要求 5 张好套、Jacoby 2NT 要求 4 张支持
- 1NT 应叫按 6–10 点处理：6 张高花优先转移，4-4 双高花先斯台曼，均型无高花才叫 2NT
- 2/1 逼局后不再推荐 PASS，补齐 4♥/4♠ 与 3NT 的继续叫牌；逆叫后再支持第一门高花按配合计分
- 1♥/1♠ 后的 1NT 改为半逼叫 6–12：13–14 点、2 张将牌、无五张套时先叫 1NT、下一轮再叫 2NT 邀局，不再 PASS 掉一局；开叫人不得 Pass 1NT，低限五张高花再叫 2M；10 点、4 张支持的限制性加叫不再漏叫
- 黑木/盖伯答叫按实际 A/K 数量高亮（原实现把花色字母当成点数，2 个 A 会显示成 0 个）
- 开叫方低限在 1♥/1♠-2♥/2♠ 后不再推荐 2NT；6 张以上长套的 5–11 点不再被 PASS 压过阻击/弱二开叫
- 平衡位漏掉争叫、技术性加倍不可推荐、二阶争叫误匹配跳叫等问题

## [4.3.0] - 2026-11-15

首个规范化的基线版本，内容与 4.3 一致，仅调整仓库工程与发布方式。

### Added

- 三套叫牌体系：SAYC、浙大自然、新睿桥牌
- 叫品含义查询、推荐叫品、手牌选牌、记牌器与 AI 叫牌分析
- PWA 离线缓存，无网络也可使用
- Android WebView 壳，页面全部内置，记录经 `AndroidStore` 桥存入 SharedPreferences

[Unreleased]: https://github.com/m15147908866-source/zju-bidding-android/compare/v5.0.0...HEAD
[5.0.0]: https://github.com/m15147908866-source/zju-bidding-android/releases/tag/v5.0.0
[4.3.0]: https://github.com/m15147908866-source/zju-bidding-android/releases/tag/v4.3.0
