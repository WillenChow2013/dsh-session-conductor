# README-FORK —— 本机 fork：给「会话管理」加会话级自定义标签

本目录是 **dsh-session-conductor 1.3.13 的本机 fork**，原包位置：

```
D:\dsh-home\profiles\desktop\node_modules\dsh-session-conductor   （registry 安装的原版，fork 时整目录复制过来）
```

- 上游：https://github.com/EIGHTfs/dsh-session-conductor （MIT，作者 EIGHTfs）
- 本 fork 的公开仓库：**https://github.com/WillenChow2013/dsh-session-conductor** （public，`main` 分支，带 `README-FORK.md` / `LICENSE` / 两个自测）

## 从 GitHub 装（换机器 / 别人用）

```powershell
cd D:\dsh-home\profiles\desktop
# package.json: "dsh-session-conductor": "github:WillenChow2013/dsh-session-conductor"
pnpm install --no-frozen-lockfile
```

走 `github:` 安装时包会落成 `node_modules` 里的真实目录（与 registry 安装同构），依赖解析通常不用额外处理；
若入口仍消失，跑一次 `node <包目录>/ensure-deps.mjs`（原因见下"为什么 link: 安装必须自带 node_modules"）。
**这条路径尚未在本机验证过**（本机用的是 `link:`），第一条不走通就退回 `link:` + `ensure-deps.mjs`。

## 为什么 fork

上游 1.3.13 有归档 / 批量删 / 按规则删 / 回收站 / 自动重命名 / 全文搜索 / 工作区分组……但**完全没有「标签 / 备注」概念**：
理一个几百条的会话列表时，只能按标题和工作区找，「这几条是开发」「那几条是教学」这种人为归类无处安放。
本 fork 只加**会话级自定义标签**这一个能力，其余行为保持原样。

## 改了什么

| 文件 | 改动 |
| --- | --- |
| `lib/client.js` | ① 顶部注入 `window.__SC_TAGS__` 纯函数模块（约 110 行）；② `SessionManagerPanel` 内加标签状态 + `TagEditor` 组件 + 打标/筛选/批量处理函数；③ 行内「＋标签」按钮、标签徽章、标签筛选条、批量操作行、空态文案 |
| `lib/i18n/zh.json`、`en.json` | 各加 21 个 `tag.*` 键（放在 `sessionConductor` 命名空间，锚点为 `deleteByRule.andHint` 之后） |
| `test/tags.test.mjs` | 新增自测（17 项断言），跑 `npm run test:tags` |
| `package.json` | `version` → `1.3.13-fork.tags.1`；`scripts.test:tags`；description 补一句 fork 说明 |

**注意：`lib/client.js` 是上游的预构建产物（172 KB / 2815 行），仓库里没有它的构建脚本。**
`lib/client-parts/**` 是源码形态但不是它的输入（行号、格式都对不上，`package.json` 的 `files` 里也没有构建入口），
所以本 fork 直接改 bundle，**不要**指望用脚本从 client-parts 重新生成 client.js。

## 标签怎么存

- 只存浏览器 `localStorage`，键：`dsh.plugin.session-conductor.tags.v1`
- 形状：`{ "v": 1, "tags": { "<sessionId>": ["开发", "教学"] } }`
- 限额（与自研「索引」插件 `dsh.plugin.wfe-index.tags.v1` 同口径）：单会话 ≤ 6 个、全局 ≤ 40 个、单个标签 ≤ 12 字符
- 不进宿主、不落 DSH_HOME：改标签只需刷新页面，不用重启 Electron（宿主路由改动才要重启）
- 升级路径：形状带 `v:1`，将来想搬进宿主 `tags.json` 可原样迁移

## 交互

| 位置 | 动作 |
| --- | --- |
| 会话行「＋标签」按钮 | 打开行内编辑器：输入标签回车添加，候选标签点一下即加，Esc 关闭 |
| 会话行标签徽章 `#开发` | 点一下 = 按该标签筛选 |
| 工具行下方筛选条 | 显示全部已知标签与计数，点击即筛选，「取消筛选」清空；**筛选与搜索、标签页、分组叠加生效** |
| 批量行 | 「全选筛选结果」/「批量打标签」/「归档勾选」/「清空勾选」 |
| 批量打标签 | 一次给勾选的会话加同一个标签，超限的跳过并报错 |
| 归档勾选 | 循环调单会话 `POST /api/session-conductor/archive`（宿主没有批量归档路由），全部发完刷新一次，失败的计数提示 |

## 怎么测

```powershell
cd D:\dsh-home\plugins\dsh-session-conductor
node --check lib/client.js
npm run test:fork          # = test:tags + test:render，期望两项都 ✅
```

- `test/tags.test.mjs`（`npm run test:tags`，17 项）：`node:vm` + 最小浏览器桩执行整个 `lib/client.js`，断言 `window.__SC_TAGS__` 的纯函数（归一化 / 存储解析 / 上限 / OR 筛选 / 统计 / 持久化）与中英 i18n 键齐全。
- `test/panel-render.test.mjs`（`npm run test:render`，7 项）：**把面板真渲染出来**——自写极简 React（useState/useEffect/useMemo/useCallback/useRef + 展开函数组件）+ 假 `__scFetch`（NDJSON 流 / 索引 / 工作区分组），然后按元素树断言：侧栏按钮能打开面板、会话行有「＋标签」、`#开发` 徽章可点、点徽章进入筛选并出现「取消筛选 / 全选筛选结果」、「＋标签」打开行内编辑器、输入并添加后徽章出现且写进 localStorage、全选后出现「批量打标签 / 归档勾选」、无结果时显示标签专属空态。

  为什么要有它：GUI 有鉴权（外部浏览器 401，见 `台账/DSH接口事实.md` §8），纯函数单测又证明不了「按钮在不在、点了有没有反应」。这个测试在 Node 里把 UI 真跑一遍，改完 bundle 立刻能验。

浏览器侧人工验证（刷新页面后）：
1. 打开侧栏「会话管理」，任意会话行点「＋标签」→ 输入 `开发` 回车 → 行下出现 `#开发`
2. 再点徽章 → 列表只剩带 `开发` 的会话，筛选条高亮
3. 勾两条 → 「批量打标签」→ 输入 `教学` → 两条都多一个 `#教学`
4. 「全选筛选结果」→「归档勾选」→ 切「已归档」确认在里面，可还原
5. 刷新页面 → 标签还在（localStorage）

## 怎么接进 profile / 怎么回退

接进（本机已接好，重装时照做）：

```powershell
cd D:\dsh-home\plugins\dsh-session-conductor
node ensure-deps.mjs      # 必需：重建 6 个依赖 junction（幂等，输出 6 行 ok）
cd D:\dsh-home\profiles\desktop
# package.json: "dsh-session-conductor": "link:D:/dsh-home/plugins/dsh-session-conductor"
pnpm install --no-frozen-lockfile
```

### 为什么 `link:` 安装必须自带 `node_modules`

本包的 `package.json` 没有声明 `dependencies`——它靠"被装在 profile 的 node_modules 里"来借用宿主那批包。
`link:` 装出来只是 profile 里一个 **junction**，而 Node 解析 ESM 依赖时用**真实路径**（`D:\dsh-home\plugins\...`），
往上找不到 `@deepseek-ai/schemastery` / `zod` / `dsh-llm` / `dsh-session` / `dsh-session-title` / `dsh-storage-domain`
就整体加载失败，**表现为侧栏「会话管理」入口静默消失、控制台一个 JS 报错都没有**（踩过一次，见 `ensure-deps.mjs` 头注释）。
`ensure-deps.mjs` 把这 6 个包 junction 到 profile（`@deepseek-ai/schemastery`、`zod`）或 app 解包目录（其余 4 个，用
`DSH_APP_NODE_MODULES` 覆盖），应用升级后重跑一次即可。

回退（回到 registry 原版）：

```powershell
cd D:\dsh-home\profiles\desktop
# package.json: "dsh-session-conductor": "1.3.13"
pnpm install --no-frozen-lockfile --force
```

本 fork 只改了这三个文件 + 一个测试文件，回退不需要动 DSH 本身；删掉 `D:\dsh-home\plugins\dsh-session-conductor` 也不会影响别的东西。

## 上游升级怎么合并

diff 全部落在 `lib/client.js`（单文件）+ 两个 i18n JSON + 一个新测试文件。上游发新版时：

1. 把新版 `lib/` 覆盖到本 fork（先备份本 fork 的 `lib/client.js`）
2. 把本 fork 备份里的 `window.__SC_TAGS__` 段整段粘回新 client.js（在 `window.__ModuleLoader__.load({ id: "dsh-session-conductor"` 之前）
3. 用文本锚点（不是行号）重新插：`S.badge` 之后插样式、`trashBatch` 状态之后插状态、`SessionIcon` 之后插 `TagEditor`、`replaceSelected` 之后插处理函数、`filteredShown` 上加 `.filter(matchesTagFilter)`、`rowMeta` 之后插徽章、`opsButtons` 首位插「＋标签」、`rowOps` 末尾插编辑器、工具行后插筛选条与批量行、空态三元加 `tagFilter` 分支
4. 把新版缺的 `tag.*` i18n 键补回 `sessionConductor` 命名空间
5. `npm run test:tags` + 浏览器五项人工验证

搜索标记：`window.__SC_TAGS__`、`tagChip`、`TagEditor`、`tag.archiveSelected`。
