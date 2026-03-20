# 微信公众号 DeepSeek AI 机器人

一个运行在 Vercel 上的微信公众号 AI 对话机器人，接入 DeepSeek AI。

## 部署步骤

### 1. 创建 GitHub 仓库
1. 登录 [GitHub](https://github.com)
2. 点击右上角 "+" → "New repository"
3. 仓库名填 `wechat-ai-bot`
4. 选择 "Public"
5. 点击 "Create repository"

### 2. 上传代码
在仓库页面点击 "uploading an existing file"，把本文件夹里的文件全部上传：
- `package.json`
- `api/wechat.js`
- `vercel.json`
- `.env.example`

### 3. Vercel 部署
1. 登录 [Vercel](https://vercel.com) (用 GitHub 登录)
2. 点击 "Add New..." → "Project"
3. 找到并选择 `wechat-ai-bot` 仓库
4. 点击 "Deploy"

### 4. 配置环境变量（关键！）
部署完成后：
1. 进入 Vercel 项目 → "Settings" → "Environment Variables"
2. 添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `WECHAT_APP_ID` | `wx7087c95f1cb5d081` |
| `WECHAT_APP_SECRET` | `c8bbc80be6789b5b6fc49e36aa3ab3dc` |
| `WECHAT_TOKEN` | `自定义一个Token，比如 myai2024` |
| `DEEPSEEK_API_KEY` | `sk-2324d38815684817bc28238e47bdd3cc` |

3. 添加完成后，点击 "Deployments" → 重新部署一次

### 5. 获取 Vercel 域名
1. 部署成功后，进入项目 → "Settings" → "Domains"
2. 复制 `*.vercel.app` 格式的域名

### 6. 配置微信公众号
1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 进入「设置与开发」→「基本配置」
3. 修改「服务器配置」：
   - **URL**: `https://你的域名.vercel.app/api/wechat`
   - **Token**: 填你在第4步设置的 `WEHAT_TOKEN`
   - **EncodingAESKey**: 点击「随机生成」
4. 点击「提交」

### 7. 启用并测试
- 提交成功后，点击「启用」
- 手机打开公众号，发一条消息测试！

---

## 常见问题

**Q: 提示 URL 超时？**
A: Vercel 冷启动可能较慢，等几秒再试。或者在 Vercel 后台配置一下 "Always On"（付费功能）。

**Q: 返回"请求超时"？**
A: 检查环境变量是否配置正确，特别是 API Key。

**Q: 如何修改 Token？**
A: 在 Vercel 环境变量里修改 `WECHAT_TOKEN`，然后重新部署。

---

## 自定义你的 AI
在 `api/wechat.js` 中找到 `callDeepSeek` 函数，可以修改 system prompt 来定制 AI 的性格和回答风格。
