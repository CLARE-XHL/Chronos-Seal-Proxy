# Chronos Seal Proxy

> 零知识“盲代理”授权中转服务器 —— 为 Chronos Seal GUI 提供 OAuth Token 交换服务。

## 🛡️ 核心安全原则

本服务器是 Chronos Seal GUI（桌面端）的 OAuth 授权中继。它的唯一作用是**将 GitHub 的授权码（code）换取为访问令牌（access_token）**。它被设计为极度的“盲代理”，以确保用户的终极安全。

### 我们绝对不做的事：
1. **绝对不存储任何数据**：无数据库，无日志记录，Vercel Serverless 函数执行完毕后立刻销毁。
2. **绝对不接触用户种子**：用户的加密种子（Master Seed）完全在本地 GUI 生成，并通过本地 GUI 直接写入用户自己的 GitHub Secrets。
3. **绝对不访问用户的私人仓库**：GitHub App 的权限被严格限定为仅针对用户自己 Fork 的模板仓库。

### 数据流向：
`本地 GUI` -> `唤起浏览器授权` -> `本地 GUI 捕获 code` -> `本服务器（换取 Token）` -> `本地 GUI 拿 Token 直连 GitHub API`

## 🚀 部署指南

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCLARE-XHL%2FChronos-Seal-Proxy)

### 环境变量配置：
在 Vercel 项目的 `Settings -> Environment Variables` 中添加：
- `GITHUB_CLIENT_ID`：你的 GitHub App Client ID
- `GITHUB_CLIENT_SECRET`：你的 GitHub App Client Secret

## 📄 许可证
本项目采用 MIT 许可证。

> Don't trust, verify. 源码在此，欢迎随时进行安全审查。
