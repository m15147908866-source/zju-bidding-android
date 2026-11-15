## 改了什么

<!-- 一句话说清改动内容，以及为什么改 -->

## 类型

- [ ] 新功能（feat）
- [ ] 问题修复（fix）
- [ ] 叫牌数据 / 体系规则（data）
- [ ] 重构或工程配置（refactor / chore）
- [ ] 文档（docs）

## 自查

- [ ] 标题符合 Conventional Commits（`fix(engine): ...`），合并后它就是 main 上的提交信息
- [ ] 有效 diff 在 400 行以内，超出已拆分
- [ ] `node --test core/*.test.js` 与 `node scripts/validate-rules.mjs` 通过
- [ ] `node scripts/set-version.mjs --check` 通过
- [ ] 改了用户可见的行为，已在 `CHANGELOG.md` 的 `[Unreleased]` 下补条目
- [ ] 改了安卓壳：已真机或模拟器验证启动、返回键退出、旋转屏幕、重启后记录仍在
- [ ] 没有提交 `build/`、`dist/`、`*.apk`、`*.jks` 等产物或密钥

## 验证方式

<!-- 说明你是怎么确认这次改动有效的；只动文档可写「不涉及」 -->

## 关联 issue

Closes #
