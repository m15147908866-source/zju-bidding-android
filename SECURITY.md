# 安全策略

## 报告漏洞

请不要通过公开 issue、Discussion 或 PR 报告安全问题。本仓库使用 GitHub 私密漏洞报告：**Security → Report a vulnerability**。

报告里请写明：受影响版本（tag 或 versionCode）、复现步骤、影响范围。

## 响应时限

| 阶段 | 目标 |
|---|---|
| 确认收到 | 3 个工作日内 |
| 初步评估 | 7 个工作日内 |
| 修复发布 | 严重问题 30 天内，一般问题 90 天内 |

## 支持版本

| 版本 | 安全更新 |
|---|---|
| 最新发布的 minor | 支持 |
| 更早版本 | 不支持，请升级 |

## 披露

修复发布后通过 GitHub Security Advisory 公布，报告者在公告中致谢（除非要求匿名）。

## 本项目的攻击面

应用是纯本地单页应用加 WebView 壳，不联网、不上报数据，页面资源全部内置在 APK 的 assets 中。相关的安全关注点只有两类：

- 构建与分发链路：签名密钥泄露、Release 附件被替换
- WebView 配置：`MainActivity` 里的 JS 桥（`AndroidStore`）暴露面

## 维护者自查

- [ ] 签名密钥只存在于本地备份与仓库 Secrets，从未进入提交历史
- [ ] 已开启 secret scanning 与 push protection
- [ ] Dependabot alerts 已评估
- [ ] `main` 禁强推，合并必须经过 PR 与 CI
