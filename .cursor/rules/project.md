这是一个 AI 个人品牌网页名片生成系统。

技术栈：
- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite（开发）/ PostgreSQL（生产）
- 腾讯云 COS 存储图片
- AI 接口使用 OpenAI-compatible API

代码要求：
- 所有 AI 输出必须用 Zod 校验
- 前端页面必须移动端优先
- 公开名片页面路径为 /u/[slug]
- 名片编辑页路径为 /dashboard/cards/[id]
- 图片上传后返回 URL
- 视频链接先做封面预览，不能嵌入时跳转外部链接
- 页面风格参考微信电子名片、小程序名片、企业家个人品牌页
