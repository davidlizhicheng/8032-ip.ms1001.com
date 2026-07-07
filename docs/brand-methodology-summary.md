# Brand Methodology Integration

This project now treats the 10 Word documents in `D:\Coding\Personal\01-core-systems\brand` as the canonical brand-building corpus.

## Source Documents

- `B-1、课前学习资料：降龙十八掌-18个关键步骤打造行业知名品牌(方法篇)(1).docx`
- `B-2、课前学习资料：降龙十八掌-18个关键步骤打造行业知名品牌(工具篇).docx`
- `B-3、课前学习资料：降龙十八掌-18个关键步骤打造行业知名品牌(陪跑篇)(1).docx`
- `1-45、硬核品牌 决胜终端---汉庭酒店品牌18个关键步骤硬核案例案例研究报告.docx.docx`
- `1-60、硬核品牌 决胜终端---胖东来硬核品牌的18个关键步骤硬核案例.docx`
- `1-90、硬核品牌 决胜终端---沃尔玛优质客户服务案例研究报告.docx`
- `1-94、硬核品牌 决胜终端---雅兰硬核品牌的18个关键步骤硬核案例.docx`
- `1-99、硬核品牌 决胜终端---元气森林硬核品牌的18个关键步骤硬核案例.docx`
- `1-103、硬核品牌 决胜终端---张雪机车硬核品牌的18个关键步骤硬核案例.docx`
- `1-121、品牌复盘 决胜终端——小米公司品牌创新与改进咨询报告.docx`

Raw extracted text and JSON snapshots are stored under `docs/brand-doc-extracts/`.

## Canonical Flow

The app should follow B-1 and B-3 as the canonical 18-step process:

1. 行业趋势
2. 品类定位
3. 顾客界定
4. 价值主张
5. 品牌命名
6. 品牌口号
7. 品牌故事
8. 视觉锤
9. 信任状
10. 产品结构
11. 价格体系
12. 渠道组合
13. 终端形象
14. 内容传播
15. 公关事件
16. 私域运营
17. 数据复盘
18. 持续迭代

B-2 is a tool supplement, not a replacement for the canonical sequence. Its product/channel/communication/terminal/monitoring tools should enrich the relevant steps.

## Required Generation Discipline

- Person entities must complete candidate lookup and identity confirmation before generation.
- Wikipedia must be accessed through official Wikipedia/Wikidata APIs only, never scraped from Wikipedia HTML.
- Mainland China deployment must tolerate source failures: use cache, Baidu candidates, Wikidata, Wikipedia REST/Action API, local registries, and manual confirmation as independent fallbacks.
- If sources are insufficient, the output should ask for manual supplementation instead of fabricating facts.
- Case-style report sections should combine method model, factual practice, case comparison, and actionable summary.

## Runtime Checks

Use these checks after changes:

```powershell
npm run build
npm run test:lookup
node scripts\test-knowledge-health.mjs 马云
```

When the dev server is running, verify:

```text
GET  /api/knowledge/health
POST /api/person/lookup
POST /api/entities/generate without confirmedCandidateId should return 409 needs_confirmation for person entities.
```