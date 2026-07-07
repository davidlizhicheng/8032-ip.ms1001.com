# AI城市企业人物品牌网 / 超级品牌IP网

批量生成城市、企业、人物品牌档案与传播分析报告，支持新闻抓取、认领认证、关系图谱。

## 快速开始

```bash
cd ip-card-ai
cp .env.example .env
npm install
npm run db:setup
npm run dev    # http://127.0.0.1:3002
```

## 核心功能

### 四库一网
| 模块 | 路径 | 说明 |
|------|------|------|
| 城市品牌库 | `/city/[slug]` | 城市定位、产业、招商 |
| 企业品牌库 | `/company/[slug]` | 企业档案、竞品分析 |
| 人物IP库 | `/person/[slug]` | 企业家、专家、达人 |
| 品牌库 | `/brand/[slug]` | 品牌故事、定位 |
| 职业库 | `/profession/[slug]` | 职业群体介绍 |
| 分析报告 | `/report/[type]/[slug]` | 品牌传播评分报告 |
| 个人名片 | `/u/[slug]` | 用户自建名片 |
| 认领 | `/claim/[type]/[slug]` | 申请认领 |

### 管理后台
- `/admin/batch` — 批量生成中心（粘贴名称，每行一个）
- `/admin/jobs` — 生成任务列表
- `/admin/claims` — 认领/纠错审核（管理员查看用户申请）

### API
| 接口 | 说明 |
|------|------|
| `POST /api/admin/batch` | 批量生成城市/企业/人物 |
| `POST /api/entities/generate` | 单个实体生成 |
| `POST /api/news/fetch` | 抓取新闻报道 |
| `GET/POST /api/search/research` | 联网检索（新闻 + 网页） |
| `POST /api/claim` | 提交认领申请 |
| `POST /api/ai/parse-card-info` | AI 解析个人资料 |

## 示例页面（本地端口 3002）

- 首页：http://127.0.0.1:3002/
- 批量生成：http://127.0.0.1:3002/admin/batch
- 企业库：http://127.0.0.1:3002/library/company
- 生产域名：https://ip.ms1001.com

## 技术栈

Next.js 16 · TypeScript · Tailwind · Prisma · SQLite · OpenAI-compatible AI

## 合规

- 所有 AI 页面标注「未认证」
- 不编造私人联系方式
- 支持认领、纠错、下架
- 官员/未成年人特殊风控

## 数据检索（联网搜索）

生成城市/企业/人物档案前，系统会先**检索公开资料**，再交给 AI 整理（类似 CS101-Copilot 的「先查知识库、再回答」流程，但这里是联网检索 + 新闻 RSS）。

| 层级 | 来源 | 说明 |
|------|------|------|
| 优先 | Serper / Tavily API | 配置 `SERPER_API_KEY` 或 `TAVILY_API_KEY`，质量最高 |
| 百科 | 百度百科全文 | 自动抓取词条摘要+正文（最高优先级） |
| 兜底 | Bing 中国版 | 无需 API Key，国内可用，优先 gov.cn / 百科链接 |
| 新闻 | Google News RSS | 不可用时回退到公开检索链接 |

本地自检：

```bash
npx tsx scripts/test-research.ts 华为 company
npx tsx scripts/test-generate.ts 华为 company
```

## 环境变量

```env
DATABASE_URL="file:./dev.db"
AI_API_KEY=          # 未配置时使用 mock 数据
AI_BASE_URL=
AI_MODEL=gpt-4o-mini
```
