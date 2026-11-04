// dsh-session-conductor —— 会话管理增强插件（浏览器半边）。
// dsh-skip-quality（conv-log：fallback 行为 UI 文案内嵌 JSON，非文档注释，属规则误报）
//
// 侧边栏底部（设置上方）新增「会话管理」入口，点击展开浮层面板：
//   · 全部会话：列出每个会话（标题/目录/时间/状态），可归档、删除
//   · 已归档：列出被归档的会话，可恢复（取消归档）、删除
//   · 说明：用大白话解释内置菜单 重命名 / 分叉会话 / 归档会话 的意思
// 数据源为宿主路由 /api/session-conductor/list，操作后自动刷新。
// 纯内联样式 + 主题 CSS 变量（--dsw-*），不依赖任何哈希类名。

// —— 语言包外置（lib/i18n/*.json，语言包外置做法）——
// 浏览器端 ModuleLoader 的 require 不支持相对路径 JSON，字典由宿主侧读外置 JSON 经
// GET /api/session-conductor/i18n 暴露、客户端 fetch 拉取合并；本处仅提供共享容器，
// 各 NS 块的 zh/en 用 Object.assign 原地填充（引用不变 → locale.register 后内容自动生效）。
window.__SC_FALLBACK__ = {"zh":{"sessionConductor":{"settings.nav":"会话管理","settings.title":"会话管理","settings.desc":"模板注入（方案 / 收尾）设置：三种导入方式（本地设备上传 / 在线网址 / DSH 目录浏览），导入内容可再编辑。同为设置左侧栏独立页。","trigger.label":"会话管理","panel.title":"会话管理","panel.subtitle":"归档可恢复 · 支持删除 · 中断自动续跑","tab.all":"全部会话","tab.archived":"已归档","tab.active":"活跃","tab.help":"说明","badge.archived":"已归档","badge.running":"运行中","badge.live":"进行中","badge.auto":"自动","badge.interrupted":"已中断","help.repair.desc":"会话日志可能因历史版本的工具输出格式而损坏（history unavailable）。此功能扫描全部冷会话、用与 DSH 相同的校验规则检出问题并自动修复，可安全重复执行。","help.repairEio.desc":"底层存储（如 BTRFS csum 损坏 / iSCSI LUN I/O 错误）会导致会话日志某些 4KB 块读取抛 EIO，网关报「EIO: i/o error, read」。此功能块级探测坏块边界、截断到完好数据（COW 换新块），由 DSH 自动收尾 torn tail。可安全重复执行。","help.repairDual.desc":"会话目录同时存在 session.jsonl（明文）与 session.jsonl.zstd（压缩）时，DSH 官方 listArtifacts() 会抛 encodingMismatch 导致整个会话列表失败（侧边栏会话全消失）。此功能纯磁盘级扫描（旁路 persistence），把多余明文移入 .dual-format-backup/ 保留 zstd 官方格式，可安全重复执行。","confirm.releaseAll.title":"确定要释放全部空闲会话吗？","confirm.delete.title":"确定要永久删除会话「{title}」吗？","confirm.undo.title":"撤回最后一条消息？","help.undo.title":"撤回最后一条消息（本插件新增）","help.undo.desc":"把会话最后一条用户消息（连同它触发的整轮回复）从会话记录中移除，等效消息撤回。直接操作会话日志文件（session.jsonl.zstd），删除前二次确认、先预览再执行，原文件备份在 .undo-backup/ 可找回。运行中的会话不能撤回（等回合结束再试）。","help.delete.title":"删除会话（本插件新增）","help.delete.desc":"内置界面没有任何删除会话的入口。本插件补上了：拒绝删除运行中的会话，删除前二次确认，删除后日志一并清除、不可恢复。","help.autoRename.title":"自动重命名（本插件新增）","help.autoRename.desc":"给会话勾选「自动重命名」后，每个回合结束，插件会用 AI 分析最近会话内容；发现主题/方向已明显偏离当前标题时，自动生成新标题并改掉。标题会带上实时状态后缀：「（运行中）」= 正在执行回合、「（已中断）」= 崩溃/错误中断待续跑；回合结束自动更新。分析带 5 分钟最小间隔和新增消息数门槛，避免频繁调用浪费额度。","help.autoContinue.title":"自动续跑（本插件新增）","help.autoContinue.desc":"勾选「自动续跑」后，插件会读取会话记录：当最后一次回合属于「非人为中断」（进程崩溃、本轮运行失败——任意请求错误如限流/超时/服务端/鉴权/上下文超限等、系统原因中止）时，自动让 AI 继续完成它原本的任务。⚠️ 自动续跑默认关闭，需在每条会话的「⋯」菜单里逐条开启；开启后，若识别到本轮运行失败（error），会等待 30 秒再自动续跑，避免立即重试。⚠️ 该开关是临时设置：只保存在当前运行内存里，DSH 重启后回到默认关闭、不写入磁盘；需要长期开启请用配置项 defaultAutoContinue。用户手动点「停止」、暂停目标等不算非人为中断，不会自动续跑。防护：同会话冷却 15 分钟、每会话最多自动续 3 次、全局同时续跑不超过 2 个、活跃会话总数达到上限（默认 12）时暂停自动续跑——防止死循环和资源堆积。也可以随时手动点「继续」立即续跑任意被中断的会话。","help.release.title":"置为不活跃（本插件新增）","help.release.desc":"DSH 里会话一旦被打开就会一直挂在内存（活跃数只增不减）。本插件的「置为不活跃」/「释放全部空闲」能把空闲会话的 agent 拆下来、回到磁盘上的冷状态：会话记录完整保留，会话仍在列表里，重新打开或发消息会自动恢复挂载。运行中的会话不会被释放。","help.grouped.title":"全部会话按工作区分组","help.grouped.desc":"「全部会话」视图按会话工作目录（cwd）的最深祖先分组分节展示：分组标题带会话数、可点击折叠/展开，0 会话分组不显示，未匹配的归「未分组」。","help.newSession.title":"新建会话默认工作区","help.newSession.desc":"新建会话不再被屏蔽：未指定分组时默认落在 .dsh 上一层 workspace 文件夹工作区（不存在自动创建）。","help.value.title":"会话价值分析","help.value.desc":"会话太多时按价值分类：已完成（最后回复含 ✅ 任务完成/已解答 + ═ 分隔线）、未完成任务（⚠️ 未完成/❌ 失败标记或会话中断）、久未活跃（超过 3 天无活动）、活跃中——每项附最后回复摘要。API：POST /api/session-conductor/value-analysis。","deleteBatch.confirm.title":"确定要永久删除选中的 {n} 个会话吗？","deleteByRule.label.archivedOnly":"仅已归档会话","deleteByRule.label.inactiveDays":"超过 {n} 天未活跃（0=不限）","deleteByRule.label.cwdPrefix":"目录前缀（可选，限定分组）","deleteByRule.label.lowValue":"仅低价值会话（价值分析判定，灰尘/重复可删）","deleteByRule.label.inactiveDays.pre":"超过 ","deleteByRule.label.inactiveDays.post":" 天未活跃（0=不限）","filter.label":"筛选","time.label":"时间：{label}","time.all":"全部","time.today":"今天","time.week":"近 7 天","time.month":"近 30 天","tag.popTitle":"会话标签","tag.batchTitle":"批量打标签（{n}）","batch.selected":"已选 {n} 个会话","more.action":"更多","rule.menu":"按条件删除","help.button":"使用说明","help.back":"返回列表","session.copyId":"复制会话 ID","session.copied":"已复制","row.more":"更多操作"},"sessionGroup":{"title":"会话分组","desc":"按工作区分组显示会话；可「在分组下新建会话」（不带分组 = 上次会话工作区）。分组创建/管理用 DSH 官方 workspace 机制。"},"sessionConductorCompaction":{"title":"压缩模型","desc":"上下文自动压缩用的模型：选便宜模型（如 agnes）可省 pro 成本；默认跟随会话模型。"},"sessionConductorSettings":{"title":"会话管理","desc":"会话管理插件的集中设置页：额外注入 md（本地 md/在线网址/工作区目录内选，内容常驻会话上下文）。","mdTitle":"额外注入系统提示词","noteTitle":"其他设置","noteBody":"压缩模型 等仍在 设置 → 插件 → 插件配置 对应卡片；侧边栏底部「会话管理」按钮是会话操作面板（归档/删除/自动续跑）。","scopeHint":"改动即时保存；注入在下一回合生效（无需重启）。","tpl.importFail":"导入失败：","tpl.dirFail":"目录读取失败：","tpl.enforceDone":"强制门禁已切换","tpl.saveFail":"保存失败：","tpl.modeLocal":"本地文件（从设备选择上传）","tpl.modeUrl":"在线 md 网址","tpl.modeDir":"DSH 目录浏览","tpl.injecting":"注入中 ✓","tpl.injectOff":"开启注入","tpl.enforceOn":"强制门禁开 ✓","tpl.enforceOff":"强制门禁关","tpl.import":"导入","tpl.emptyHint":"（未导入内容。导入后显示在下方，可再次编辑）","tpl.saveEdit":"保存编辑内容","tpl.clear":"清空","tpl.current":"｜当前：{name}","tpl.title":"模板注入（方案 / 收尾）","tpl.desc":"两个固定模板槽位：方案模板（修改代码前先出提案）、收尾模板（任务完成汇报格式）。三种导入方式统一为一个入口：下拉选择导入方式，点「导入」后弹出对应悬浮窗（本地文件 = 从设备选择上传 / 在线网址 = 网址输入 / DSH 目录 = 目录浏览），转存正文；导入内容显示在下方编辑框（动态高度、自动换行），可再次编辑并保存。开启后注入系统提示词，AI 一开始就看见。单个 ≤256KB。","tpl.planTitle":"📋 方案模板","tpl.planDesc":"代码修改前按此模板出方案提案（含目标/文件/影响/风险/实施/验证）。","tpl.closingTitle":"✅ 收尾模板","tpl.closingDesc":"任务完成汇报格式（分隔线 + 完成标记 + 交付/验证/遗留）。","tpl.loading":"加载中…","tpl.pickerUrl":"导入在线 md 网址（{slot}）","tpl.pickerDir":"在 DSH 目录内选 md（{slot}）","tpl.pickerPath":"路径选择（{slot}）","tpl.urlPlaceholder":"https://…（在线 md 文件网址）","tpl.noPath":"（未选择路径）","tpl.upDir":"⬆ 上级目录","tpl.emptyDir":"（空目录）","tpl.dirHint":"点目录进入；点 .md 文件选中，再点「导入」转存（只读 DSH 主目录树内）。","tpl.importSelected":"导入选中文件","tpl.imported":"模板「{slot}」已导入","tpl.toggled":"模板「{slot}」已切换","tpl.updated":"模板「{slot}」内容已更新","tpl.removed":"模板「{slot}」已清空","tpl.planShort":"方案模板","tpl.closingShort":"收尾模板","saved":"已保存","saveFail":"保存失败","armTitle":"自动重命名模型","armDesc":"自动重命名（每条真人消息后 AI 分析会话主题精炼标题）使用的模型。默认跟随会话所用模型；可指定便宜/专用模型，选择立即保存、下次分析生效。","armFollow":"跟随会话模型（默认）","armProvider":"（选择 Provider）","armModel":"（选择模型）","armSet":"设为自动重命名模型","armCurFollow":"当前：跟随会话模型","armCurNone":"当前：未选择","renderFail":"设置页渲染失败："}},"en":{"sessionConductor":{"settings.nav":"Session Conductor","settings.title":"Session Conductor","settings.desc":"Template injection (plan / closing) settings: three import methods (pick from device / online URL / DSH directory browse), imported content stays editable. A Settings sidebar page.","trigger.label":"Sessions","panel.title":"Session Conductor","panel.subtitle":"Unarchive · Delete · Auto-resume interrupted","tab.all":"All sessions","tab.archived":"Archived","tab.active":"Active","tab.help":"Help","badge.archived":"Archived","badge.running":"Running","badge.live":"Active","badge.auto":"Auto","badge.interrupted":"Interrupted","help.repair.desc":"Session logs can be corrupted by an old tool output format (history unavailable). This scans all cold sessions, detects problems with DSH's own validation rules, and auto-repairs. Safe to re-run.","help.repairEio.desc":"Underlying storage corruption (e.g. BTRFS csum failure / iSCSI LUN I/O error) makes some 4KB blocks of a session log throw EIO on read; the gateway reports \"EIO: i/o error, read\". This scans block-level health, truncates to intact data (COW new block), and lets DSH auto-finish the torn tail. Safe to re-run.","help.repairDual.desc":"When a session dir holds both session.jsonl (plain) and session.jsonl.zstd (compressed), DSH's official listArtifacts() throws encodingMismatch and the entire session list fails (sessions vanish from the sidebar). This scans at disk level (bypassing persistence) and moves the extra plaintext into .dual-format-backup/ keeping the zstd official format. Safe to re-run.","confirm.releaseAll.title":"Release all idle sessions?","confirm.delete.title":"Permanently delete session \"{title}\"?","confirm.undo.title":"Undo the last message?","help.undo.title":"Undo last message (plugin feature)","help.undo.desc":"Removes the last user message (and its reply turn) from the session record, like a message recall. It edits session.jsonl.zstd directly, with preview + confirmation before applying, and backs up the original file to .undo-backup/.","help.delete.title":"Delete session (added by this plugin)","help.delete.desc":"The built-in UI has no way to delete a session. This plugin adds it: refuses to delete a running session, double-checks before deleting, removes the log for good.","help.autoRename.title":"Auto-rename (added by this plugin)","help.autoRename.desc":"Turn on \"Auto-rename\" for a session and after each finished turn the plugin asks an AI to compare recent session content against the current title; when the topic has clearly drifted it generates a new title and renames automatically. Titles carry a live state suffix: \"（运行中）\" = turn in progress, \"（已中断）\" = crashed/errored and waiting to resume; updated at turn boundaries. Rate-limited (5 min interval, needs a few new messages) to keep token costs low.","help.autoContinue.title":"Auto-resume (added by this plugin)","help.autoContinue.desc":"With \"Auto-resume\" checked, the plugin reads session records: when the last turn ended in a non-human interruption (process crash, a failed turn — any request error like rate limit/timeout/server/auth/context-length, or a system abort) it automatically asks the AI to continue the original task. ⚠️ Auto-resume is OFF by default : enable it per session from the \"⋯\" menu; once enabled, a detected failed turn (error) waits 30 seconds before auto-resume, to avoid immediate retry. ⚠️ This switch is TEMPORARY : it lives only in the running process memory and resets to the default (off) when DSH restarts — it is never written to disk; use the defaultAutoContinue config for a lasting default. Manual stops and goal pauses are NOT auto-resumed. Guardrails: 15 min cooldown per session, max 3 auto-resumes per session, max 2 concurrent resumes, and auto-resume pauses when the number of attached sessions reaches the cap (default 12) — no infinite loops, no resource buildup. You can always hit \"Resume\" manually to continue any interrupted session.","help.release.title":"Set inactive (added by this plugin)","help.release.desc":"In DSH a session stays in memory once opened (the attached count only grows). \"Set inactive\" / \"Release all idle\" detaches the agent of an idle session back to cold persisted state: the transcript is fully kept, the session stays listed, and reopening or messaging re-attaches it automatically. Running sessions are never released.","help.grouped.title":"All sessions grouped by workspace ","help.grouped.desc":"The \"All sessions\" view is sectioned by the deepest ancestor group of each session cwd: group headers show counts and collapse, 0-session groups are hidden, unmatched go to \"Ungrouped\".","help.newSession.title":"New session defaults to workspace ","help.newSession.desc":"New sessions are no longer blocked: without a workspaceId they land in the workspace folder one level above .dsh (created automatically if missing).","help.value.title":"Session value analysis ","help.value.desc":"Classify sessions by value: completed (final reply has ✅ done + ═ separator), unfinished (⚠️/❌ marks or interruption), stale (>3 days idle), active — each with a final-reply summary. API: POST /api/session-conductor/value-analysis.","deleteBatch.confirm.title":"Permanently delete the {n} selected sessions?","deleteByRule.label.archivedOnly":"Archived only","deleteByRule.label.inactiveDays":"Inactive for more than {n} days (0 = any)","deleteByRule.label.cwdPrefix":"cwd prefix (optional, group scope)","deleteByRule.label.lowValue":"Low-value only (value analysis; dust/duplicates)","deleteByRule.label.inactiveDays.pre":"Inactive for more than ","deleteByRule.label.inactiveDays.post":" days (0 = any)","filter.label":"Filter","time.label":"Time: {label}","time.all":"All","time.today":"Today","time.week":"Last 7 days","time.month":"Last 30 days","tag.popTitle":"Session tags","tag.batchTitle":"Tag {n} sessions","batch.selected":"{n} selected","more.action":"More","rule.menu":"Delete by rules","help.button":"Help","help.back":"Back to list","session.copyId":"Copy session ID","session.copied":"Copied","row.more":"More actions"},"sessionGroup":{"title":"Session Groups","desc":"Sessions are shown grouped by workspace; \"New session in group\" creates one (no workspaceId = last session's workspace). Group creation/management uses DSH's native workspace mechanism."},"sessionConductorCompaction":{"title":"Compaction Model","desc":"Model used for automatic context compaction: choose a cheap model (e.g. agnes) to save pro cost; default follows the session model."},"sessionConductorSettings":{"title":"Session Conductor","desc":"Central settings: extra injected md (local file or online URL, persistent in session context).","mdTitle":"Extra injected md (context)","noteTitle":"Other settings","noteBody":"Session grouping / migration / compaction model stay under Settings → Plugins → Plugin config cards; the sidebar-bottom \"Session Conductor\" button is the session operations panel.","scopeHint":"Changes save immediately; injection applies from the next turn (no restart).","tpl.importFail":"Import failed: ","tpl.dirFail":"Directory read failed: ","tpl.enforceDone":"Enforce gate toggled","tpl.saveFail":"Save failed: ","tpl.modeLocal":"Local file (pick from device)","tpl.modeUrl":"Online md URL","tpl.modeDir":"DSH directory browse","tpl.injecting":"Injecting ✓","tpl.injectOff":"Enable injection","tpl.enforceOn":"Enforce on ✓","tpl.enforceOff":"Enforce off","tpl.import":"Import","tpl.emptyHint":"(No content yet. Imported content shows below and stays editable)","tpl.saveEdit":"Save edited content","tpl.clear":"Clear","tpl.current":"｜Current: {name}","tpl.title":"Template injection (plan / closing)","tpl.desc":"Two fixed template slots: plan template (draft a proposal before changing code) and closing template (task completion report format). One unified entry for the three import methods: pick a method from the dropdown, click Import, then the matching picker opens (local file = pick from device / online URL = URL input / DSH dir = directory browser) and stores the content; imported content shows in the editable box below (auto-height, wraps) and can be re-edited and saved. When enabled, content is injected into the system prompt so the AI sees it from the start. ≤256KB each.","tpl.planTitle":"📋 Plan template","tpl.planDesc":"Draft a plan proposal per this template before changing code (goal/files/impact/risk/steps/verify).","tpl.closingTitle":"✅ Closing template","tpl.closingDesc":"Task completion report format (divider + done marker + delivered/verified/remaining).","tpl.loading":"Loading…","tpl.pickerUrl":"Import online md URL ({slot})","tpl.pickerDir":"Pick md in DSH directory ({slot})","tpl.pickerPath":"Path picker ({slot})","tpl.urlPlaceholder":"https://… (online md file URL)","tpl.noPath":"(no path selected)","tpl.upDir":"⬆ Parent dir","tpl.emptyDir":"(empty dir)","tpl.dirHint":"Click a directory to enter; click a .md file to select it, then click Import to store (read-only DSH home tree).","tpl.importSelected":"Import selected file","tpl.imported":"Template \"{slot}\" imported","tpl.toggled":"Template \"{slot}\" toggled","tpl.updated":"Template \"{slot}\" content updated","tpl.removed":"Template \"{slot}\" cleared","tpl.planShort":"Plan template","tpl.closingShort":"Closing template","saved":"Saved","saveFail":"Save failed","armTitle":"Auto-rename model","armDesc":"Model used by auto-rename (AI refines the session title after each real user message). Follows the session model by default; pick a cheaper/dedicated model, saved immediately, takes effect on next analysis.","armFollow":"Follow session model (default)","armProvider":"(choose provider)","armModel":"(choose model)","armSet":"Set auto-rename model","armCurFollow":"Current: follow session model","armCurNone":"Current: not selected","renderFail":"Settings render failed: "}}};
window.__SC_I18N__ = window.__SC_I18N__ || { zh: {}, en: {}, loaded: false, waiters: [] };
if (!window.__SC_I18N__.started) {
  window.__SC_I18N__.started = true;
  (window.__scFetch || fetch)("/api/session-conductor/i18n", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => {
      if (body && body.ok && body.zh && body.en) {
        window.__SC_I18N__.zh = body.zh;
        window.__SC_I18N__.en = body.en;
      }
      window.__SC_I18N__.loaded = true;
      window.__SC_I18N__.waiters.forEach((fn) => { try { fn(); } catch (e) { console.error("[sc-i18n] waiter:", e); } });
      window.__SC_I18N__.waiters = [];
    })
    .catch(() => {
      window.__SC_I18N__.loaded = true;
      window.__SC_I18N__.waiters.forEach((fn) => { try { fn(); } catch (e) { console.error("[sc-i18n] waiter:", e); } });
      window.__SC_I18N__.waiters = [];
    });
}
window.__scFillI18nDict = (ns, zhRef, enRef) => {
  // 启动兜底：先填导航 fallback（fetch 前标签立即中文），fetch 完成后再用完整字典覆盖
  Object.assign(zhRef, (window.__SC_FALLBACK__?.zh ?? {})[ns] ?? {});
  Object.assign(enRef, (window.__SC_FALLBACK__?.en ?? {})[ns] ?? {});
  const fill = () => {
    Object.assign(zhRef, window.__SC_I18N__.zh[ns] ?? {});
    Object.assign(enRef, window.__SC_I18N__.en[ns] ?? {});
  };
  if (window.__SC_I18N__.loaded) fill();
  else window.__SC_I18N__.waiters.push(fill);
};

// —— 全文本 i18n 统一取词：跨 NS + 当前语言 + fallback 兜底（fetch 完成前立即中文，fetch 后完整覆盖）——
// 各组件用它取文案（主面板/设置页/模板区块等），key 放在 lib/i18n/{zh,en}.json 对应 NS。
window.__SC_TR__ = (key, vars) => {
  let val;
  const i18n = window.__SC_I18N__ || {};
  const lang = window.__SC_LANG__ || "zh";
  const dicts = [i18n[lang] || {}, i18n.zh || {}];
  for (const d of dicts) {
    for (const ns in d) {
      if (d[ns] && d[ns][key] !== undefined) { val = d[ns][key]; break; }
    }
    if (val !== undefined) break;
  }
  if (val === undefined) {
    const fb = window.__SC_FALLBACK__ || {};
    const f = fb[lang] || fb.zh || {};
    for (const ns in f) { if (f[ns] && f[ns][key] !== undefined) { val = f[ns][key]; break; } }
  }
  if (val === undefined) return key;
  if (vars) {
    let s = String(val);
    for (const k in vars) s = s.split("{" + k + "}").join(String(vars[k] ?? ""));
    return s;
  }
  return String(val);
};

// —— 会话标签（本 fork 新增，相对上游 1.3.13 的唯一改动面）——
// 存储：localStorage（浏览器本地；和自研「索引」插件同口径）。形状固定为
//   { v: 1, tags: { "<sessionId>": ["开发", "教学"] } }
// 将来若要挪到宿主侧（如 <DSH_HOME>/session-conductor/tags.json），这个形状可直接复用。
// 纯函数都挂在 window.__SC_TAGS__ 上：面板只负责取值与渲染，
// node 桩自测可以直接调用这些函数，不必渲染整个面板。
window.__SC_TAGS__ = (() => {
  const KEY = "dsh.plugin.session-conductor.tags.v1";
  const MAX_PER_SESSION = 6;
  const MAX_TAGS = 40;
  const MAX_LEN = 12;

  /** 归一化标签：去掉 # 前缀、空白与分隔符，截断到 MAX_LEN。 */
  function normalizeTag(raw) {
    return String(raw ?? "").replace(/^#+/, "").replace(/[\s,，、;；]+/g, "").slice(0, MAX_LEN);
  }

  /** 解析存储文本 → { sessionId: [tag] }；坏数据一律当空，绝不抛。 */
  function parseStore(text) {
    let obj = null;
    try { obj = JSON.parse(text ?? ""); } catch { return {}; }
    const src = obj && typeof obj === "object" && obj.tags && typeof obj.tags === "object" ? obj.tags : obj;
    const out = {};
    if (!src || typeof src !== "object") return out;
    for (const id of Object.keys(src)) {
      if (typeof id !== "string" || id === "") continue;
      const list = [];
      const arr = Array.isArray(src[id]) ? src[id] : [];
      for (const raw of arr) {
        const tag = normalizeTag(raw);
        if (tag === "" || list.includes(tag)) continue;
        list.push(tag);
        if (list.length >= MAX_PER_SESSION) break;
      }
      if (list.length > 0) out[id] = list;
    }
    return out;
  }

  function serializeStore(tags) {
    return JSON.stringify({ v: 1, tags: tags ?? {} });
  }

  /** 全局标签清单：[{ tag, n }]；按使用数降序，同数按名称。 */
  function knownTags(tags) {
    const count = new Map();
    for (const id of Object.keys(tags ?? {})) {
      for (const tag of tags[id] ?? []) count.set(tag, (count.get(tag) ?? 0) + 1);
    }
    return [...count.entries()]
      .map(([tag, n]) => ({ tag, n }))
      .sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag, "zh"));
  }

  /** 加标签 → { tags, error, added }；error=null 即成功，tags 未变时返回原引用。 */
  function addTagTo(tags, id, raw) {
    const tag = normalizeTag(raw);
    if (tag === "") return { tags, error: "empty" };
    const own = (tags ?? {})[id] ?? [];
    if (own.includes(tag)) return { tags, error: null, added: false };
    if (own.length >= MAX_PER_SESSION) return { tags, error: "too-many-per-session" };
    const all = knownTags(tags);
    if (!all.some((x) => x.tag === tag) && all.length >= MAX_TAGS) return { tags, error: "too-many-tags" };
    return { tags: { ...(tags ?? {}), [id]: [...own, tag] }, error: null, added: true };
  }

  /** 删标签；删空了连键一起删（存储里不留空数组）。 */
  function removeTagFrom(tags, id, tag) {
    const next = ((tags ?? {})[id] ?? []).filter((x) => x !== tag);
    const out = { ...(tags ?? {}) };
    if (next.length === 0) delete out[id]; else out[id] = next;
    return out;
  }

  /** 标签筛选：filter 为空 = 全放行；非空 = 命中其中任一标签（OR）。 */
  function matchesTagFilter(tags, id, filter) {
    if (!Array.isArray(filter) || filter.length === 0) return true;
    const own = (tags ?? {})[id] ?? [];
    return filter.some((tag) => own.includes(tag));
  }

  function load() {
    try { return parseStore(window.localStorage?.getItem(KEY)); } catch { return {}; }
  }

  function save(tags) {
    try { window.localStorage?.setItem(KEY, serializeStore(tags)); return true; } catch { return false; }
  }

  return {
    KEY, MAX_PER_SESSION, MAX_TAGS, MAX_LEN,
    normalizeTag, parseStore, serializeStore, knownTags, addTagTo, removeTagFrom, matchesTagFilter, load, save,
  };
})();

window.__ModuleLoader__.load({
  id: "dsh-session-conductor",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    let react = require("react");
    let react_jsx_runtime = require("react/jsx-runtime");
    const jsx = react_jsx_runtime.jsx;
    const jsxs = react_jsx_runtime.jsxs;

    // ---------- 文案 ----------

    const NS = "sessionConductor";

    const zh = {};
    const en = {};
    __scFillI18nDict("sessionConductor", zh, en);

    // ---------- 工具 ----------

    // 统一 fetch 入口（url, opts, timeoutMs）。**默认不设超时**。
    // 曾经默认 30 秒「兜底」，结果两次把慢但正常的请求掐成失败：
    //   · 会话列表冷缓存要逐份解压上百份日志（实测 41~226 秒）→ 刚重启报「读取会话列表失败」；
    //   · 按条件筛选勾了「低价值」时要逐个会话读事件 → 报「操作失败：signal is aborted…」。
    // 结论：**判定只能按事件驱动**（请求完成 / 失败 / 数据到达），不能靠拍一个秒数上限；
    // 时间阈值一写死，慢就被误读成坏。真要限时，必须由调用方显式传 timeoutMs 并说清依据。
    window.__scFetch = function (url, opts, timeoutMs) {
      if (!(timeoutMs > 0)) return fetch(url, opts || {});
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const next = opts ? Object.assign({}, opts, { signal: controller.signal }) : { signal: controller.signal };
      return fetch(url, next).finally(() => clearTimeout(timer));
    };

    function basenameOf(p) {
      const rawPath = String(p ?? "");
      const cleaned = rawPath.replace(/[/\\]+$/, "");
      const part = cleaned.split(/[/\\]/).pop();
      return part || rawPath;
    }

    function timeAgo(ms, t) {
      if (!Number.isFinite(ms)) return "";
      const diff = Date.now() - ms;
      const minute = 60e3;
      const hour = 3600e3;
      const day = 86400e3;
      const month = 30 * day;
      const year = 365 * day;
      if (diff < minute) return t("meta.time.now");
      if (diff < hour) return t("meta.time.minutes", { n: Math.floor(diff / minute) });
      if (diff < day) return t("meta.time.hours", { n: Math.floor(diff / hour) });
      if (diff < month) return t("meta.time.days", { n: Math.floor(diff / day) });
      if (diff < year) return t("meta.time.months", { n: Math.floor(diff / month) });
      return t("meta.time.years", { n: Math.floor(diff / year) });
    }

    // ---------- UI 常量（主题串 + 尺寸数值）----------
    // 集中命名：同一主题串/尺寸在内联样式与样式表里重复出现，改一处即全站生效。
    const CSS_LABEL_SECONDARY = "var(--dsw-alias-label-secondary, #9a9aa0)";
    const CSS_LABEL_TERTIARY = "var(--dsw-alias-label-tertiary, #77777d)";
    const CSS_LABEL_PRIMARY = "var(--dsw-alias-label-primary, #eee)";
    const CSS_BG_BASE = "var(--dsw-alias-bg-base, #141518)";
    const CSS_BORDER_L2 = "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.3))";
    const CSS_DANGER = "var(--dsw-state-danger-primary, #d9534f)";
    const CSS_BORDER_HOVER = "1px solid var(--dsw-alias-interactive-bg-hover, #333338)";
    const CONTENT_TYPE_JSON = "application/json";
    const MSG_ACTION_FAILED = "action failed";
    const PADDING_BAR = "8px 12px 0";
    /** 浮层 z-index：压住宿主其它浮层，保证面板在最上。 */
    const OVERLAY_Z_INDEX = 9999;
    /** 触发器行高 / 紧凑行高。 */
    const LINE_HEIGHT_TRIGGER = 1.4;
    const LINE_HEIGHT_COMPACT = 1.35;
    /** 标题字重（半粗）/ 分组标题字重（加粗）/ 表单标签字重。 */
    const FONT_WEIGHT_SEMIBOLD = 600;
    const FONT_WEIGHT_BOLD = 700;
    const LABEL_FONT_WEIGHT = 600;
    /** 顶部状态行最小高度（勾选框与徽章对齐用）。 */
    const ROW_TOP_MIN_HEIGHT = 20;
    /** 胶囊圆角（计数徽章 / 状态徽章共用）：足够大即为胶囊形。 */
    const PILL_RADIUS = 999;
    /** 操作开关之间的间距。 */
    const OPS_TOGGLE_GAP = 14;
    /** 输入控件尺寸：最小宽 / 高 / 圆角。 */
    const CONTROL_MIN_WIDTH = 160;
    const CONTROL_HEIGHT = 28;
    const CONTROL_RADIUS = 6;
    /** 按条件删除表单里的小输入框：天数框宽 / cwd 前缀框最小宽 / 小控件高。 */
    const RULE_DAYS_INPUT_WIDTH = 56;
    const RULE_PREFIX_MIN_WIDTH = 140;
    const SMALL_CONTROL_HEIGHT = 26;
    /** 帮助区描述文字最小宽（与按钮同排时的换行阈值）。 */
    const HELP_DESC_MIN_WIDTH = 180;
    /** 设置页：标签最小宽 / 文本域高度区间 / 两个下拉框宽度。 */
    const LABEL_MIN_WIDTH = 90;
    const TEXTAREA_MIN_HEIGHT = 56;
    const TEXTAREA_MAX_HEIGHT = 340;
    const SELECT_WIDTH_PROVIDER = 170;
    const SELECT_WIDTH_MODEL = 210;
    /** 模板 textarea 行高 / 小字号（列表小字、表单提示共用）。 */
    const LINE_HEIGHT_TEXTAREA = 1.55;
    const LINE_HEIGHT_HELP = 1.65;
    const FONT_SIZE_SMALL = 12.5;
    /** i18n 键：模板槽位简称（plan / closing，多处复用）。 */
    const I18N_TPL_PLAN_SHORT = "tpl.planShort";
    const I18N_TPL_CLOSING_SHORT = "tpl.closingShort";
    /** HTTP 报错前缀：`HTTP 502` 这类状态码提示。 */
    const HTTP_STATUS_PREFIX = "HTTP ";

    // ---------- 样式（主题变量 + 兜底色） ----------
    const S = {
      trigger: (wide) => ({
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: wide ? "6px 10px" : "6px",
        margin: "0 6px 6px",
        borderRadius: 8,
        border: "1px solid transparent",
        background: "transparent",
        color: CSS_LABEL_SECONDARY,
        fontSize: 12,
        lineHeight: LINE_HEIGHT_TRIGGER,
        cursor: "pointer",
        whiteSpace: "nowrap",
        textAlign: "left",
        width: wide ? "auto" : 32,
        justifyContent: wide ? "flex-start" : "center",
      }),
      overlay: { position: "fixed", inset: 0, zIndex: OVERLAY_Z_INDEX },
      backdrop: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" },
      panel: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 400,
        maxWidth: "94vw",
        background: "var(--dsw-alias-bg-layer-2, #202024)",
        color: "var(--dsw-alias-label-primary, #ececf0)",
        boxShadow: "-10px 0 32px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
        fontSize: 13,
      },
      header: {
        padding: "14px 16px 10px",
        borderBottom: CSS_BORDER_HOVER,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
      },
      title: { margin: 0, fontSize: 15, fontWeight: FONT_WEIGHT_SEMIBOLD },
      subtitle: { margin: "3px 0 0", fontSize: 12, color: CSS_LABEL_SECONDARY },
      close: {
        background: "transparent",
        border: "none",
        color: CSS_LABEL_SECONDARY,
        fontSize: 16,
        lineHeight: 1,
        cursor: "pointer",
        padding: "2px 6px",
        borderRadius: 6,
      },
      tabs: { display: "flex", gap: 4, padding: "8px 12px 0", borderBottom: CSS_BORDER_HOVER },
      tab: (active) => ({
        background: active ? "var(--dsw-alias-interactive-bg-hover, #333338)" : "transparent",
        border: "none",
        color: active ? "var(--dsw-alias-label-primary, #ececf0)" : CSS_LABEL_SECONDARY,
        padding: "6px 12px",
        borderRadius: "8px 8px 0 0",
        fontSize: FONT_SIZE_SMALL,
        cursor: "pointer",
      }),
      body: { flex: 1, overflowY: "auto", padding: "8px 12px 16px" },
      row: {
        // 会话行改为纵向卡片——顶部状态（checkbox+徽章）/ 中间内容 / 下方操作集中
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 7,
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid var(--dsw-alias-interactive-bg-hover, #2e2e33)",
        marginTop: 6,
        cursor: "pointer",
      },
      // 顶部状态行：批量勾选 + 状态徽章
      rowTop: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
        minHeight: ROW_TOP_MIN_HEIGHT,
      },
      rowTopBadges: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        flexShrink: 0,
        marginLeft: "auto",
      },
      groupHeader: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px 4px",
        marginTop: 10,
        cursor: "pointer",
        userSelect: "none",
        borderBottom: "1px solid var(--dsw-alias-interactive-bg-hover, #2e2e33)",
      },
      groupCaret: { fontSize: 10, color: CSS_LABEL_SECONDARY, flexShrink: 0 },
      groupTitle: { fontWeight: FONT_WEIGHT_BOLD, fontSize: FONT_SIZE_SMALL, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
      groupCount: {
        flexShrink: 0,
        fontSize: 10.5,
        padding: "1px 8px",
        borderRadius: PILL_RADIUS,
        border: "1px solid var(--dsw-alias-interactive-bg-hover, #3a3a40)",
        color: CSS_LABEL_SECONDARY,
      },
      groupList: { paddingLeft: 2 },
      rowMain: { flex: 1, minWidth: 0 },
      rowTitle: {
        display: "flex",
        alignItems: "flex-start", // 标题最多 3 行时徽章顶部对齐不被挤压
        gap: 6,
        fontWeight: FONT_WEIGHT_SEMIBOLD,
        fontSize: 13,
        overflow: "hidden",
        lineHeight: LINE_HEIGHT_COMPACT,
      },
      rowMeta: { marginTop: 2, fontSize: 11.5, color: CSS_LABEL_SECONDARY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
      // 第三行小字 session id（等宽小字号，方便复制/排查）
      rowSid: { marginTop: 2, fontSize: 10.5, fontFamily: "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace", color: "var(--dsw-alias-label-tertiary, #6f6f76)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", userSelect: "text" },
      badge: (kind) => ({
        flexShrink: 0,
        fontSize: 10.5,
        padding: "1px 7px",
        borderRadius: PILL_RADIUS,
        border: "1px solid",
        ...(kind === "archived"
          ? { color: CSS_LABEL_SECONDARY, borderColor: "#55555c" }
          : kind === "running"
            ? { color: "var(--dsw-state-success-primary, #4caf7d)", borderColor: "currentColor" }
            : { color: CSS_LABEL_TERTIARY, borderColor: "currentColor" }),
      }),
      // —— 会话标签（本 fork 新增）——
      tagBar: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", margin: "0 0 8px" },
      tagBarLabel: { fontSize: 11.5, color: CSS_LABEL_SECONDARY, marginRight: 2 },
      tagChip: (active) => ({
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10.5,
        padding: "1px 7px",
        borderRadius: PILL_RADIUS,
        border: `1px solid ${active ? "var(--dsw-alias-brand-primary, #4c8dff)" : "#55555c"}`,
        color: active ? "var(--dsw-alias-brand-primary, #4c8dff)" : CSS_LABEL_SECONDARY,
        background: active ? "rgba(76,141,255,0.12)" : "transparent",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
      }),
      tagWrap: { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" },
      tagBadge: {
        fontSize: 10,
        padding: "0 6px",
        borderRadius: PILL_RADIUS,
        border: "1px solid #55555c",
        color: CSS_LABEL_TERTIARY,
        cursor: "pointer",
        whiteSpace: "nowrap",
      },
      tagEditor: {
        marginTop: 6,
        padding: "8px 9px",
        borderRadius: 8,
        border: "1px solid var(--dsw-alias-interactive-bg-hover, #3a3a40)",
        background: "var(--dsw-alias-bg-elevated, #242429)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      },
      tagEditorRow: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
      tagInput: {
        flex: "1 1 120px",
        minWidth: 100,
        background: "transparent",
        border: "1px solid var(--dsw-alias-interactive-bg-hover, #3a3a40)",
        borderRadius: 6,
        color: "var(--dsw-alias-label-primary, #e8e8ec)",
        padding: "3px 7px",
        fontSize: 11.5,
      },
      tagHint: { fontSize: 10.5, color: CSS_LABEL_TERTIARY },
      actions: { flexShrink: 0, display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" },
      actionsCol: { flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 },
      // 下方操作集中区（开关行 + 按钮行，纵向堆叠）
      rowOps: { display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 },
      opsToggles: { display: "flex", alignItems: "center", gap: OPS_TOGGLE_GAP },
      opsButtons: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-start" },
      autoToggle: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        color: CSS_LABEL_SECONDARY,
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
      },
      actionBtn: (danger) => ({
        background: "transparent",
        border: danger ? "1px solid var(--dsw-state-error-primary, #d9534f)" : "1px solid var(--dsw-alias-interactive-bg-hover, #3a3a40)",
        color: danger ? "var(--dsw-state-error-primary, #d9534f)" : "var(--dsw-alias-label-secondary, #d0d0d6)",
        borderRadius: 6,
        padding: "3px 9px",
        fontSize: 11.5,
        cursor: "pointer",
      }),
      hint: { margin: "10px 0 6px", fontSize: 12, color: CSS_LABEL_SECONDARY },
      helpBlock: {
        marginTop: 10,
        padding: "10px 12px",
        borderRadius: 8,
        background: "var(--dsw-alias-interactive-bg-hover, #2a2a30)",
        border: CSS_BORDER_HOVER,
      },
      helpTitle: { fontWeight: FONT_WEIGHT_SEMIBOLD, fontSize: 13, margin: "0 0 4px" },
      helpDesc: { margin: 0, fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT_HELP, color: "var(--dsw-alias-label-secondary, #c8c8ce)" },
      empty: { marginTop: 24, textAlign: "center", color: CSS_LABEL_TERTIARY, fontSize: FONT_SIZE_SMALL },
      error: { marginTop: 10, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--dsw-state-error-primary, #d9534f)", color: "var(--dsw-state-error-primary, #d9534f)", fontSize: 12 },
    };

    // ---------- 组件 ----------

    // 会话列表长效缓存（localStorage）：插件启动即预取 + 每次刷新落盘，面板重开/页面刷新秒显历史数据
    const LIST_CACHE_KEY = "dsh-session-conductor:list:v1";
    function readListCache() {
      // 2026-10-12 修复：无缓存 / 缓存损坏时必须回**空数组**，不能回 null。
      // 调用方 SessionManagerPanel 把返回值当数组用（sessions 初值），null 会让
      // 流式追加路径的 insertSorted(null, item) 抛
      // "Cannot read properties of null (reading 'filter')"，React 更新器抛错后
      // sidebar.footer.action 插槽整块崩溃 —— 表现为「会话管理」入口直接消失。
      try {
        const raw = localStorage.getItem(LIST_CACHE_KEY);
        // if (!raw) return null;
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        // return Array.isArray(parsed?.sessions) ? parsed.sessions : null;
        return Array.isArray(parsed?.sessions) ? parsed.sessions : [];
      } catch {
        // return null;
        return [];
      }
    }
    function writeListCache(sessions) {
      try {
        localStorage.setItem(LIST_CACHE_KEY, JSON.stringify({ at: Date.now(), sessions }));
      } catch {
        /* 存储不可用时静默降级 */
      }
    }

    // 「会话管理」入口图标（学 dsh-side-monitor 的 MonitorIcon：内联 SVG + currentColor 线描）
    /** 会话卡图标内的矩形（24x24 viewBox 坐标系）。 */
    const ICON_RECT_X = 3;
    const ICON_RECT_Y = 4;
    const ICON_RECT_WIDTH = 18;
    const ICON_RECT_HEIGHT = 14;
    const ICON_RECT_RADIUS = 2;

    function SessionIcon(props) {
      const s = props.size || 16;
      return react_jsx_runtime.jsx("svg", {
        width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
        strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
        children: [
          react_jsx_runtime.jsx("rect", { x: ICON_RECT_X, y: ICON_RECT_Y, width: ICON_RECT_WIDTH, height: ICON_RECT_HEIGHT, rx: ICON_RECT_RADIUS }),
          react_jsx_runtime.jsx("path", { d: "M8 20h8" }),
          react_jsx_runtime.jsx("path", { d: "M12 18v2" }),
        ],
      });
    }

    // ---------- 面板样式（对齐 doc/ref/deepseek_html_20261104_b3e81b.html 的极限紧凑版） ----------
    // hover 才显示操作、悬浮标签浮窗、下拉菜单都靠注入的 CSS 类；尺寸与主题色走 --dsw-* 变量，
    // 宿主没有对应变量时回落到设计稿的浅色值。
    const PANEL_CSS = `
.dsh-sc-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:stretch;justify-content:flex-end;--sc-bg:var(--dsw-alias-bg-layer-2,#fff);--sc-card:var(--dsw-alias-bg-base,#fff);--sc-border:var(--dsw-alias-border-l2,#e5e7eb);--sc-soft:var(--dsw-alias-border-l1,#f0f0f0);--sc-text:var(--dsw-alias-label-primary,#111);--sc-text2:var(--dsw-alias-label-secondary,#666);--sc-text3:var(--dsw-alias-label-tertiary,#888);--sc-hover:var(--dsw-alias-interactive-bg-hover,#f3f4f6);--sc-accent:#3b82f6;--sc-danger:#ef4444;font-family:system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif}
.dsh-sc-backdrop{position:absolute;inset:0;background:rgba(17,24,39,.42)}
.dsh-sc-window{position:relative;display:flex;flex-direction:column;width:640px;max-width:100%;height:100%;overflow:hidden;border-left:1px solid var(--sc-border);background:var(--sc-bg);color:var(--sc-text);box-shadow:-16px 0 40px rgba(17,24,39,.18);font-size:13px}
.dsh-sc-header{padding:20px 24px 0;border-bottom:1px solid var(--sc-soft)}
.dsh-sc-header-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.dsh-sc-title{margin:0;font-size:18px;font-weight:600;color:var(--sc-text)}
.dsh-sc-header-right{display:flex;align-items:center;gap:6px}
.dsh-sc-subtitle{font-size:12px;color:var(--sc-text2)}
.dsh-sc-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:none;border-radius:6px;background:transparent;color:var(--sc-text2);cursor:pointer;font-size:13px;line-height:1}
.dsh-sc-iconbtn:hover{background:var(--sc-hover);color:var(--sc-text)}
.dsh-sc-tabs{display:flex;gap:24px;margin-top:20px}
.dsh-sc-tab{position:relative;display:inline-flex;align-items:baseline;gap:5px;padding:0 0 10px;border:none;background:transparent;color:var(--sc-text2);font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;white-space:nowrap}
.dsh-sc-tab:hover{color:var(--sc-text)}
.dsh-sc-tab.active{color:var(--sc-text);font-weight:600}
.dsh-sc-tab.active:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;border-radius:1px;background:var(--sc-accent)}
.dsh-sc-count{font-size:11px;font-weight:400;color:var(--sc-text3)}
.dsh-sc-toolbar{display:flex;flex-direction:column;gap:12px;padding:16px 24px;border-bottom:1px solid var(--sc-soft)}
.dsh-sc-search-row{display:flex;align-items:center;gap:12px}
.dsh-sc-search{display:flex;flex:1;min-width:150px;align-items:center;gap:6px;padding:8px 12px;border:1px solid transparent;border-radius:6px;background:var(--sc-hover);transition:border-color .15s,box-shadow .15s}
.dsh-sc-search:focus-within{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
.dsh-sc-search svg{flex:none;color:var(--sc-text3)}
.dsh-sc-search input{flex:1;min-width:0;border:none;outline:none;background:transparent;color:var(--sc-text);font-size:13px;font-family:inherit}
.dsh-sc-btn{flex:none;padding:7px 14px;border:1px solid var(--sc-border);border-radius:6px;background:var(--sc-card);color:var(--sc-text2);font-size:13px;font-family:inherit;cursor:pointer;white-space:nowrap}
.dsh-sc-btn:hover{background:var(--sc-hover)}
.dsh-sc-btn.danger{color:var(--sc-danger);border-color:#fca5a5}
.dsh-sc-btn.danger:hover{background:rgba(239,68,68,.08)}
.dsh-sc-btn:disabled{opacity:.5;cursor:not-allowed}
.dsh-sc-btn.sm{padding:3px 9px;font-size:12px}
.dsh-sc-filter-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.dsh-sc-filter-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.dsh-sc-filter-label{flex:none;font-size:13px;color:var(--sc-text2)}
.dsh-sc-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:1px solid #dbeafe;border-radius:6px;background:#eff6ff;color:#2563eb;font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;user-select:none;white-space:nowrap}
.dsh-sc-chip.active{background:#dbeafe;border-color:#93c5fd;color:#1d4ed8}
.dsh-sc-chip .x{opacity:.6;font-size:12px;line-height:1}
.dsh-sc-chip:hover .x{opacity:1}
.dsh-sc-link{padding:2px 4px;border:none;background:transparent;color:var(--sc-accent);font-size:12px;font-family:inherit;cursor:pointer}
.dsh-sc-link:hover{text-decoration:underline}
.dsh-sc-filter-right{display:flex;flex:none;align-items:center;gap:8px}
.dsh-sc-menu-wrap{position:relative;display:inline-flex}
.dsh-sc-time-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid var(--sc-border);border-radius:6px;background:var(--sc-card);color:var(--sc-text2);font-size:12px;font-family:inherit;cursor:pointer;white-space:nowrap}
.dsh-sc-time-btn:hover{background:var(--sc-hover)}
.dsh-sc-menu{position:absolute;top:100%;right:0;z-index:120;display:flex;flex-direction:column;gap:2px;min-width:200px;margin-top:6px;padding:8px;border:1px solid var(--sc-border);border-radius:8px;background:var(--sc-card);box-shadow:0 8px 24px rgba(0,0,0,.14)}
.dsh-sc-menu-up{top:auto;bottom:calc(100% + 6px);margin-top:0;margin-bottom:6px;min-width:140px}
.dsh-sc-menu-item{padding:8px 12px;border:none;border-radius:4px;background:transparent;color:var(--sc-text);font-size:12px;font-family:inherit;text-align:left;cursor:pointer;white-space:nowrap}
.dsh-sc-menu-item:hover{background:var(--sc-hover)}
.dsh-sc-menu-item.selected{background:#eff6ff;color:var(--sc-accent);font-weight:600}
.dsh-sc-batchbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 24px;border-bottom:1px solid var(--sc-soft);background:var(--sc-hover);font-size:12px;color:var(--sc-text2)}
.dsh-sc-body{flex:1;overflow-y:auto;padding:16px 24px 24px}
.dsh-sc-body::-webkit-scrollbar{width:8px}
.dsh-sc-body::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:4px}
.dsh-sc-group-head{display:flex;align-items:center;gap:8px;padding:6px 0;margin-bottom:6px;cursor:pointer;user-select:none}
.dsh-sc-chevron{display:inline-block;flex:none;width:14px;color:#6b7280;font-size:14px;line-height:1;transition:transform .15s}
.dsh-sc-chevron.collapsed{transform:rotate(-90deg)}
.dsh-sc-group-title{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;color:var(--dsw-alias-label-secondary,#444)}
.dsh-sc-group-count{flex:none;padding:2px 8px;border-radius:12px;background:var(--sc-hover);color:var(--sc-text3);font-size:12px}
.dsh-sc-list{display:flex;flex-direction:column;gap:8px;padding-left:20px;margin:0 0 20px 7px;border-left:1px solid var(--sc-border)}
.dsh-sc-list.flat{margin:0;padding-left:0;border-left:none}
.dsh-sc-card{position:relative;display:flex;flex-direction:column;gap:6px;padding:10px 14px;border:1px solid var(--sc-border);border-radius:8px;background:var(--sc-card);cursor:pointer;transition:border-color .15s,box-shadow .15s}
.dsh-sc-card:hover{border-color:#d1d5db;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.dsh-sc-card.active{border-color:var(--sc-accent);background:#f8fafc}
.dsh-sc-card.active:before{content:"";position:absolute;left:-21px;top:10px;bottom:10px;width:3px;border-radius:2px;background:var(--sc-accent)}
.dsh-sc-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsh-sc-title-wrap{display:flex;flex:1;min-width:0;align-items:center;gap:8px}
.dsh-sc-check{flex:none;width:15px;height:15px;margin:0;accent-color:var(--sc-accent);cursor:pointer}
.dsh-sc-session-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;color:var(--sc-text)}
.dsh-sc-badges{display:flex;flex:none;align-items:center;gap:5px}
.dsh-sc-status{flex:none;padding:1px 6px;border:1px solid;border-radius:12px;font-size:11px;white-space:nowrap}
.dsh-sc-status.running{background:#ecfdf5;border-color:#d1fae5;color:#059669}
.dsh-sc-status.live{background:#ecfdf5;border-color:#d1fae5;color:#059669}
.dsh-sc-status.archived{background:var(--sc-hover);border-color:var(--sc-border);color:var(--sc-text2)}
.dsh-sc-status.interrupted{background:#fffbeb;border-color:#fde68a;color:#b45309}
.dsh-sc-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding-left:23px;font-size:12px;color:var(--sc-text3)}
.dsh-sc-meta .ws{color:var(--dsw-alias-label-secondary,#555);font-weight:500}
.dsh-sc-meta .dot{color:#d1d5db}
.dsh-sc-tag{padding:1px 6px;border-radius:12px;border:none;background:#f3e8ff;color:#7e22ce;font-size:11px;font-family:inherit;cursor:pointer;white-space:nowrap}
.dsh-sc-tag.on{box-shadow:0 0 0 1px #c4b5fd;background:#ede9fe;color:#6d28d9}
.dsh-sc-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;row-gap:6px;min-height:28px;padding-left:23px;margin-top:2px}
.dsh-sc-switches{display:flex;flex-wrap:wrap;flex:none;align-items:center;gap:16px;row-gap:4px}
.dsh-sc-switch{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--sc-text2);cursor:pointer;user-select:none;white-space:nowrap}
.dsh-sc-switch input{width:13px;height:13px;margin:0;accent-color:var(--sc-accent);cursor:pointer}
.dsh-sc-actions{position:relative;display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:6px;row-gap:4px;opacity:0;transform:translateX(10px);transition:opacity .15s,transform .15s}
.dsh-sc-card:hover .dsh-sc-actions,.dsh-sc-card.active .dsh-sc-actions{opacity:1;transform:none}
.dsh-sc-act{padding:3px 8px;border:1px solid var(--sc-border);border-radius:4px;background:var(--sc-card);color:var(--sc-text2);font-size:12px;font-family:inherit;cursor:pointer;white-space:nowrap}
.dsh-sc-act:hover{background:var(--sc-hover);border-color:#d1d5db}
.dsh-sc-act.danger{color:var(--sc-danger);border-color:#fecaca}
.dsh-sc-act.danger:hover{background:rgba(239,68,68,.08)}
.dsh-sc-act.icon{display:inline-flex;align-items:center;justify-content:center;padding:3px 6px;color:var(--sc-text3)}
.dsh-sc-act:disabled{opacity:.5;cursor:not-allowed}
.dsh-sc-anchor{position:relative;display:inline-flex}
.dsh-sc-popover{position:absolute;right:0;top:100%;z-index:200;width:260px;margin-top:8px;padding:12px;border:1px solid var(--sc-border);border-radius:8px;background:var(--sc-card);box-shadow:0 8px 24px rgba(0,0,0,.16);text-align:left;cursor:default}
.dsh-sc-popover.up{top:auto;bottom:100%;margin-top:0;margin-bottom:8px}
.dsh-sc-pop-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-size:12px;font-weight:600;color:var(--sc-text)}
.dsh-sc-input-wrap{display:flex;overflow:hidden;margin-bottom:8px;border:1px solid var(--sc-border);border-radius:6px;background:var(--sc-card)}
.dsh-sc-input-wrap:focus-within{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
.dsh-sc-input-wrap input{flex:1;min-width:0;padding:6px 10px;border:none;outline:none;background:transparent;color:var(--sc-text);font-size:12px;font-family:inherit}
.dsh-sc-input-wrap button{padding:0 12px;border:none;border-left:1px solid var(--sc-border);background:var(--sc-hover);color:var(--sc-accent);font-size:12px;font-family:inherit;cursor:pointer}
.dsh-sc-input-wrap button:hover{background:#eff6ff}
.dsh-sc-pop-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.dsh-sc-hint{margin:0;font-size:11px;line-height:1.5;color:var(--sc-text3)}
.dsh-sc-hint.err{color:var(--sc-danger)}
.dsh-sc-search-hits{margin-bottom:12px;border:1px solid var(--sc-border);border-radius:8px;overflow:hidden}
.dsh-sc-hits-head{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--sc-hover);font-size:12px;color:var(--sc-text)}
.dsh-sc-hit{padding:8px 10px;border-top:1px solid var(--sc-soft);cursor:pointer}
.dsh-sc-hit:hover{background:var(--sc-hover)}
.dsh-sc-hit-title{font-size:12.5px;font-weight:600;color:var(--sc-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-sc-hit-path{font-size:11.5px;color:var(--sc-text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-sc-hit-match{font-size:12px;line-height:1.5;color:var(--sc-text2)}
.dsh-sc-hit-role{display:inline-block;margin-right:6px;padding:0 5px;border-radius:4px;background:var(--sc-hover);color:var(--sc-text3);font-size:11px}
.dsh-sc-rule{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 24px;border-bottom:1px solid var(--sc-soft);font-size:12px;color:var(--sc-text2)}
.dsh-sc-rule label{display:flex;align-items:center;gap:4px;white-space:nowrap}
.dsh-sc-rule input[type=number],.dsh-sc-rule input[type=text]{height:26px;border:1px solid var(--sc-border);border-radius:6px;background:var(--sc-card);color:var(--sc-text);padding:0 6px;font-size:12px;font-family:inherit;outline:none}
.dsh-sc-empty{padding:40px 0;text-align:center;font-size:12.5px;color:var(--sc-text3)}
.dsh-sc-error{margin-top:10px;padding:8px 10px;border:1px solid #fca5a5;border-radius:8px;color:var(--sc-danger);font-size:12px}
@media (max-width:600px){.dsh-sc-window{width:100%}.dsh-sc-header,.dsh-sc-toolbar,.dsh-sc-body,.dsh-sc-batchbar,.dsh-sc-rule{padding-left:16px;padding-right:16px}}
`;
    function ensurePanelCss() {
      try {
        if (typeof document === "undefined" || !document.head) return;
        if (document.getElementById && document.getElementById("dsh-sc-panel-css")) return;
        const style = document.createElement("style");
        style.id = "dsh-sc-panel-css";
        style.textContent = PANEL_CSS;
        document.head.appendChild(style);
      } catch {
        /* 样式注入失败只影响观感 */
      }
    }
    // 回收站 / 说明页仍复用这几个内联样式键，改成新配色。
    Object.assign(S, {
      hint: { margin: "8px 0", fontSize: 12, color: CSS_LABEL_SECONDARY },
      helpBlock: { marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "var(--sc-hover, var(--dsw-alias-interactive-bg-hover, #f3f4f6))", border: "1px solid var(--sc-border, var(--dsw-alias-border-l2, #e5e7eb))" },
      helpTitle: { fontWeight: FONT_WEIGHT_SEMIBOLD, fontSize: 13, margin: "0 0 4px" },
      helpDesc: { margin: 0, fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT_HELP, color: CSS_LABEL_SECONDARY },
      empty: { padding: "40px 0", textAlign: "center", color: CSS_LABEL_TERTIARY, fontSize: FONT_SIZE_SMALL },
      error: { marginTop: 10, padding: "8px 10px", borderRadius: 8, border: "1px solid #fca5a5", color: "var(--dsw-state-error-primary, #ef4444)", fontSize: 12 },
    });

    // 会话标签浮窗：点「＋标签」在按钮上方弹出（absolute 定位于 .dsh-sc-anchor），
    // 输入 / 回车确认 / 候选点选，点浮窗外自动关闭。不用 window.prompt —— Electron 渲染进程里会抛错。
    function TagPopover({ t, ownTags, allTags, value, errorText, onChange, onSubmit, onRemove, onClose, batchCount, placement }) {
      const own = ownTags ?? [];
      const candidates = (allTags ?? [])
        .map((x) => x.tag)
        .filter((tag) => !own.includes(tag))
        .slice(0, 10);
      return react_jsx_runtime.jsxs("div", {
        className: "dsh-sc-popover" + (placement === "up" ? " up" : ""),
        onClick: (event) => event.stopPropagation(),
        children: [
          react_jsx_runtime.jsxs("div", {
            className: "dsh-sc-pop-title",
            children: [
              react_jsx_runtime.jsx("span", { children: batchCount > 0 ? t("tag.batchTitle", { n: batchCount }) : t("tag.popTitle") }),
              react_jsx_runtime.jsx("button", {
                type: "button",
                className: "dsh-sc-iconbtn",
                style: { width: 18, height: 18, fontSize: 12 },
                onClick: onClose,
                children: "✕",
              }),
            ],
          }),
          react_jsx_runtime.jsxs("div", {
            className: "dsh-sc-input-wrap",
            children: [
              react_jsx_runtime.jsx("input", {
                type: "text",
                autoFocus: true,
                value,
                placeholder: t("tag.placeholder"),
                onChange: (event) => onChange(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSubmit();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    onClose();
                  }
                },
              }),
              react_jsx_runtime.jsx("button", { type: "button", onClick: () => onSubmit(), children: t("tag.add") }),
            ],
          }),
          own.length > 0 &&
            react_jsx_runtime.jsx("div", {
              className: "dsh-sc-pop-tags",
              children: own.map((tag) =>
                react_jsx_runtime.jsxs(
                  "span",
                  {
                    className: "dsh-sc-tag on",
                    children: [
                      `#${tag}`,
                      react_jsx_runtime.jsx("span", {
                        style: { marginLeft: 5, cursor: "pointer", opacity: 0.75 },
                        onClick: () => onRemove(tag),
                        children: "×",
                      }),
                    ],
                  },
                  tag,
                ),
              ),
            }),
          candidates.length > 0 &&
            react_jsx_runtime.jsx("div", {
              className: "dsh-sc-pop-tags",
              style: { opacity: 0.8 },
              children: candidates.map((tag) =>
                react_jsx_runtime.jsx(
                  "span",
                  {
                    className: "dsh-sc-tag",
                    onClick: () => onSubmit(tag),
                    children: `#${tag}`,
                  },
                  tag,
                ),
              ),
            }),
          react_jsx_runtime.jsx("div", {
            className: errorText ? "dsh-sc-hint err" : "dsh-sc-hint",
            children: errorText || (batchCount > 0 ? t("tag.batchHint", { n: batchCount }) : t("tag.hint")),
          }),
        ],
      });
    }

    // 会话标签浮窗（TagPopover）不再需要旧的 TagEditor。
    function SessionManagerPanel({ wide, t, onOpenSession }) {
      const [open, setOpen] = react.useState(false);
      const [tab, setTab] = react.useState("all");
      const [sessions, setSessions] = react.useState(() => readListCache()); // 启动即从长效缓存加载
      const [groups, setGroups] = react.useState(null); // workspaces[]（group/list）；null = host 无分组 API
      const [collapsed, setCollapsed] = react.useState(() => new Set()); // 折叠的分组（含 "__ungrouped__"）
      const [error, setError] = react.useState(null);
      const [retryIn, setRetryIn] = react.useState(null); // 自动重试倒计时（秒）；null = 没有待重试的定时器
      const [busy, setBusy] = react.useState(null);
      // —— 搜索 + 批量/按条件删除 ——
      const [query, setQuery] = react.useState(""); // 列表过滤关键词
      const [selected, setSelected] = react.useState(() => new Set()); // 批量删除勾选
      const [fullResults, setFullResults] = react.useState(null); // 全文搜索结果（null=未搜索）
      const [fullSearching, setFullSearching] = react.useState(false);
      const [ruleOpen, setRuleOpen] = react.useState(false); // 筛选条件表单展开
      const [ruleArchivedOnly, setRuleArchivedOnly] = react.useState(true);
      const [ruleDays, setRuleDays] = react.useState(7);
      const [rulePrefix, setRulePrefix] = react.useState("");
      const [ruleLowValue, setRuleLowValue] = react.useState(false); // 低价值筛选（复用价值分析）
      // —— 回收站（删除只是打标记，这里管理被标记的会话）——
      const [trashItems, setTrashItems] = react.useState(null); // null = 尚未加载
      const [trashSel, setTrashSel] = react.useState(() => new Set());
      const [trashRetention, setTrashRetention] = react.useState(7); // 保留天数
      const [trashBatch, setTrashBatch] = react.useState(null); // 最近一个删除批次（撤销用）
      // —— 会话标签（本 fork 新增）：打标 / 按标签筛选 / 批量打标 / 按筛选结果批量归档 ——
      const [tags, setTags] = react.useState(() => window.__SC_TAGS__.load()); // { sessionId: [tag] }
      const [tagFilter, setTagFilter] = react.useState([]); // 勾选中的筛选标签（OR 语义）
      const [tagEditId, setTagEditId] = react.useState(null); // 标签编辑器挂在哪个会话上；"__batch__" = 批量
      const [tagDraft, setTagDraft] = react.useState(""); // 编辑器输入框内容
      const [tagError, setTagError] = react.useState(null); // 标签操作错误码（渲染时过 t()）
      const [tagPlacement, setTagPlacement] = react.useState("down"); // 浮窗朝向：默认向下，靠近底部时向上
      const [rowMenuId, setRowMenuId] = react.useState(null); // 卡片「更多」菜单挂在哪条会话上（低频操作收进去，避免按钮行溢出）
      // —— 对齐 doc/ref/deepseek_html_20261104_b3e81b.html：时间筛选 / 下拉 / 说明页 ——
      const [timeFilter, setTimeFilter] = react.useState("all"); // all | today | week | month
      const [timeOpen, setTimeOpen] = react.useState(false);
      const [moreOpen, setMoreOpen] = react.useState(false);
      const [helpOpen, setHelpOpen] = react.useState(false);
      // 注入面板样式（参考稿的紧凑版；宿主没有对应主题变量时回落到浅色值）
      react.useEffect(() => { ensurePanelCss(); }, []);
      // 点空白处收起标签浮窗 / 时间与「更多」下拉；测试环境的假 document 没有 addEventListener 时跳过。
      react.useEffect(() => {
        if (typeof document === "undefined" || typeof document.addEventListener !== "function") return undefined;
        const onDocDown = (event) => {
          const target = event && event.target;
          const inside = (sel) => !!(target && typeof target.closest === "function" && target.closest(sel));
          if (!inside(".dsh-sc-anchor")) {
            setTagEditId(null);
            setTagError(null);
            setTagDraft("");
          }
          if (!inside(".dsh-sc-menu-wrap")) {
            setTimeOpen(false);
            setMoreOpen(false);
            setRowMenuId(null);
          }
        };
        document.addEventListener("mousedown", onDocDown);
        return () => document.removeEventListener("mousedown", onDocDown);
      }, []);
      const allTags = react.useMemo(() => window.__SC_TAGS__.knownTags(tags), [tags]);

      // list 流式——NDJSON 每行一个会话，读到立即追加显示（每获取一个追加一个，
      // 不等全部）；按 updatedAt 倒序插入保持列表顺序；旧一次性 JSON（预览页离线垫片/
      // 缓存路径）走 setSessions 全量。
      const insertSorted = (cur, item) => {
        // 2026-10-12 修复：cur 兜底为数组。历史版本 readListCache() 无缓存时返回 null，
        // 使 sessions 初值为 null，流式追加走到这里就炸（见 foundation/list-cache.js 同款修复）。
        // const next = cur.filter((x) => x.id !== item.id);
        const next = (Array.isArray(cur) ? cur : []).filter((x) => x.id !== item.id);
        let i = 0;
        while (i < next.length && (next[i].updatedAt ?? 0) > (item.updatedAt ?? 0)) i += 1;
        next.splice(i, 0, item);
        return next;
      };
      // 列表拉取失败自动重试：DSH 刚重启时插件路由/宿主服务未必已就绪，首次请求会直接
      // 网络失败（Failed to fetch），冷缓存首次构建也很慢 —— 靠用户手动点「重试」既费事又
      // 容易误以为插件坏了。这里按退避自动重试，界面照常给出失败原因 + 下次重试倒计时，
      // 成功一次即清零。数组长度 = 最多自动重试几次。
      const LIST_RETRY_DELAYS = [3000, 8000, 20000, 45000];
      const listRetryRef = react.useRef(0);
      const listTimerRef = react.useRef(null);
      const refreshRef = react.useRef(null);
      // 卸载时清掉待重试的定时器，避免组件已销毁还在拉数据（也会让「已关闭面板」继续打后端）
      react.useEffect(() => () => {
        if (listTimerRef.current) clearTimeout(listTimerRef.current);
        listTimerRef.current = null;
      }, []);
      const refresh = react.useCallback(async () => {
        if (listTimerRef.current) { clearTimeout(listTimerRef.current); listTimerRef.current = null; }
        setRetryIn(null);
        try {
          // 流式列表**不设超时**（第三个参数 0）：冷缓存要逐份解压上百份日志，本机实测
          // 41~226 秒；套 30 秒上限会把「慢但正常」的请求掐成「读取会话列表失败」。
          const listPromise = window.__scFetch("/api/session-conductor/list", { headers: { Accept: "application/x-ndjson" } }, 0);
          const groupPromise = window.__scFetch("/api/session-conductor/group/list")
            .then((r) => (r.ok ? r.json() : { ok: false })).catch(() => ({ ok: false }));
          const listRes = await listPromise;
          if (!listRes.ok) throw new Error("list failed: HTTP " + listRes.status);
          let lastBatch = null;
          if (typeof listRes.body?.getReader === "function") {
            // 流式 NDJSON：逐行解析追加。
            // 但**不逐行 setState**：上百条会话逐条 setSessions 会触发上百次全列表重渲染
            // （O(n²)），真实数据下界面会卡到无响应。改为攒 150ms 一批、一次性合并。
            const reader = listRes.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            const batch = [];
            const pending = [];
            let flushTimer = null;
            const flush = () => {
              flushTimer = null;
              if (pending.length === 0) return;
              const items = pending.splice(0, pending.length);
              setSessions((cur) => {
                let next = Array.isArray(cur) ? cur : [];
                for (const item of items) next = insertSorted(next, item);
                return next;
              });
            };
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              let nl;
              while ((nl = buf.indexOf("\n")) >= 0) {
                const line = buf.slice(0, nl).trim();
                buf = buf.slice(nl + 1);
                if (!line) continue;
                let parsedLine;
                try { parsedLine = JSON.parse(line); } catch { continue; } // 半行/头行跳过
                if (parsedLine && parsedLine.id) {
                  batch.push(parsedLine);
                  pending.push(parsedLine);
                  if (flushTimer === null) flushTimer = setTimeout(flush, 150);
                }
              }
            }
            flush();
            lastBatch = batch;
          } else {
            const body = await listRes.json();
            if (!body.ok) throw new Error(body.error?.message ?? "list failed");
            setSessions(body.sessions ?? []);
            lastBatch = body.sessions ?? [];
          }
          if (lastBatch !== null) writeListCache(lastBatch); // 长效保存：刷新结果落 localStorage
          const groupRes = await groupPromise;
          setGroups(groupRes?.ok === true ? groupRes.workspaces ?? [] : null);
          setError(null);
          listRetryRef.current = 0; // 成功一次即清零，下次失败从最短退避重来
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
          const delay = LIST_RETRY_DELAYS[listRetryRef.current];
          if (delay !== void 0) {
            listRetryRef.current += 1;
            setRetryIn(Math.round(delay / 1000));
            listTimerRef.current = setTimeout(() => { refreshRef.current?.(); }, delay);
          }
        }
      }, []);
      refreshRef.current = refresh;

      // 启动即自动加载（插件挂载就预取一次，不依赖面板打开）；打开面板时再刷新一次保证最新
      // ① 先读**落盘索引**（毫秒级）把列表填出来 —— 索引只写不用的话，冷缓存时面板要等
      //    全量构建（实测 41~226 秒）才有内容，看起来就是「空的」。
      // ② 随后 refresh() 的流式全量刷新在后台覆盖（每条到了就追加），两者互不阻塞。
      react.useEffect(() => {
        let alive = true;
        (async () => {
          try {
            const res = await window.__scFetch("/api/session-conductor/list?fromIndex=true", { headers: { Accept: "application/json" } }, 0);
            const body = await res.json();
            if (!alive || !body?.ok) return;
            const items = Array.isArray(body.sessions) ? body.sessions : [];
            // 只在当前还是空列表时填充：不要用陈旧索引覆盖已经流式到达的新数据
            if (items.length > 0) setSessions((cur) => (Array.isArray(cur) && cur.length > 0 ? cur : items));
          } catch { /* 索引不可用就走全量刷新 */ }
        })();
        return () => { alive = false; };
      }, []);
      react.useEffect(() => {
        refresh();
      }, [refresh]);
      react.useEffect(() => {
        if (open) refresh();
      }, [open, refresh]);

      // 通用会话操作（archive/unarchive/delete）：乐观更新——点了立即改 UI，后端异步处理，
      // 失败回滚 + 提示；不阻塞其他会话的操作（不设全局 busy）。
      const act = async (sessionId, action) => {
        let prev = null;
        setSessions((cur) => {
          prev = cur.find((s) => s.id === sessionId) ?? null;
          if (action === "delete") return cur.filter((s) => s.id !== sessionId);
          if (action === "archive" || action === "unarchive") {
            return cur.map((s) => (s.id === sessionId ? { ...s, archived: action === "archive" } : s));
          }
          return cur;
        });
        try {
          const res = await window.__scFetch(`/api/session-conductor/${action}`, {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ sessionId }),
          });
          const body = await res.json();
          if (!body.ok) throw new Error(body.error?.message ?? MSG_ACTION_FAILED);
          await refresh();
        } catch (cause) {
          // 回滚乐观更新
          if (prev) {
            setSessions((cur) => {
              if (action === "delete") return cur.some((s) => s.id === sessionId) ? cur : [...cur, prev];
              return cur.map((s) => (s.id === sessionId ? prev : s));
            });
          }
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        }
      };

      const confirmDelete = (session) => {
        const label = session.title || session.cwd || session.id;
        const yes = window.confirm(`${t("confirm.delete.title", { title: label })}\n\n${t("confirm.delete.body")}`);
        if (yes) act(session.id, "delete");
      };

      //  撤回最后一条消息：dryRun 先预览 → 二次确认 → 执行 → 刷新
      const undoLast = async (session) => {
        setBusy(session.id);
        try {
          const res = await window.__scFetch("/api/session-conductor/undo-message", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ sessionId: session.id, dryRun: true }),
          });
          const body = await res.json();
          if (!body.ok) throw new Error(body.error?.message ?? "preview failed");
          const preview = body.preview || t("undo.preview.empty");
          const yes = window.confirm(`${t("confirm.undo.title")}\n\n${t("confirm.undo.body", { preview })}`);
          if (!yes) return;
          const res2 = await window.__scFetch("/api/session-conductor/undo-message", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ sessionId: session.id }),
          });
          const body2 = await res2.json();
          if (!body2.ok) throw new Error(body2.error?.message ?? "undo failed");
          window.alert(t("undo.done", { preview }));
          await refresh();
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        } finally {
          setBusy(null);
        }
      };

      // 自动重命名开关：乐观翻转（点了立即变），后端异步处理，失败回滚；不阻塞其他操作。
      const toggleAutoRename = async (sessionId, enabled) => {
        setSessions((cur) => cur.map((s) => (s.id === sessionId ? { ...s, autoRename: enabled } : s)));
        try {
          const res = await window.__scFetch("/api/session-conductor/auto-rename", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ sessionId, enabled }),
          });
          const body = await res.json();
          if (!body.ok) throw new Error(body.error?.message ?? MSG_ACTION_FAILED);
          // 开启时后端立即分析，若已改名（analyzed.after）→ 马上用新标题重显示，
          // 不等 refresh 全量冷扫描（可能数秒~数十秒）
          if (enabled && body.analyzed?.ok && typeof body.analyzed?.after === "string" && body.analyzed.after !== "") {
            setSessions((cur) => cur.map((s) => (s.id === sessionId ? { ...s, title: body.analyzed.after } : s)));
          }
          await refresh();
        } catch (cause) {
          setSessions((cur) => cur.map((s) => (s.id === sessionId ? { ...s, autoRename: !enabled } : s)));
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        }
      };

      const analyzeNow = async (sessionId) => {
        setBusy(sessionId);
        try {
          const res = await window.__scFetch("/api/session-conductor/analyze", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ sessionId }),
          });
          const body = await res.json();
          if (!body.ok) {
            const message = body.error?.message ?? MSG_ACTION_FAILED;
            window.alert(`${t("action.analyze")}: ${message}`);
          } else {
            window.alert(body.renamed ? `${t("action.analyze")}: ${body.reason} → ${body.title}` : `${t("action.analyze")}: ${body.reason}`);
          }
          await refresh();
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        } finally {
          setBusy(null);
        }
      };

      /** 扫描并修复损坏会话日志（先 dry-run 扫描，确认后真正修复）。 */
      const scanAndRepair = async () => {
        if (busy) return;
        setBusy("__repair__");
        try {
          const scanRes = await window.__scFetch("/api/session-conductor/repair-sessions", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ dryRun: true }),
          });
          const scan = await scanRes.json();
          if (!scan.ok) throw new Error(scan.error?.message ?? "scan failed");
          const corrupt = scan.report?.corrupt ?? 0;
          const msg = corrupt === 0
            ? t("repair.scanClean")
            : t("repair.confirm", { n: corrupt });
          if (corrupt > 0 && !window.confirm(msg)) { setBusy(null); return; }
          if (corrupt === 0) { window.alert(msg); setBusy(null); return; }
          const fixRes = await window.__scFetch("/api/session-conductor/repair-sessions", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ dryRun: false }),
          });
          const fix = await fixRes.json();
          if (!fix.ok) throw new Error(fix.error?.message ?? "repair failed");
          window.alert(t("repair.done", { n: fix.report?.fixed ?? 0 }));
          await refresh();
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        } finally {
          setBusy(null);
        }
      };

      /** 扫描并修复 EIO 坏块会话（先 dry-run 扫描，确认后真正修复）。
       *  需求来源：「failed to observe session xxx: EIO: i/o error, read」+
       *  「把这个功能写进会话管理插件…新增修复会话」。
       *  思路：与 scanAndRepair 同构（scan → confirm → fix），但走 /repair-eio 端点，
       *  该端点做块级 EIO 探测与截断修复（见 lib/eio-repair.js）。 */
      const scanAndRepairEio = async () => {
        if (busy) return;
        setBusy("__repair_eio__");
        try {
          const scanRes = await window.__scFetch("/api/session-conductor/repair-eio", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ dryRun: true }),
          });
          const scan = await scanRes.json();
          if (!scan.ok) throw new Error(scan.error?.message ?? "eio scan failed");
          const eioCount = (scan.eio ?? []).length;
          const msg = eioCount === 0
            ? t("repairEio.scanClean")
            : t("repairEio.confirm", { n: eioCount });
          if (eioCount === 0) { window.alert(msg); setBusy(null); return; }
          if (!window.confirm(msg)) { setBusy(null); return; }
          const fixRes = await window.__scFetch("/api/session-conductor/repair-eio", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ dryRun: false }),
          });
          const fix = await fixRes.json();
          if (!fix.ok) throw new Error(fix.error?.message ?? "eio repair failed");
          window.alert(t("repairEio.done", { n: fix.report?.fixed ?? 0 }));
          await refresh();
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        } finally {
          setBusy(null);
        }
      };

      /** 扫描并修复双格式会话（先 dry-run 扫描，确认后真正修复）。
       *  需求来源：会话目录同时存在 session.jsonl + session.jsonl.zstd 时官方
       *  listArtifacts() 抛 encodingMismatch → 会话列表全失败（侧边栏会话消失）。
       *  思路：与 scanAndRepairEio 同构（scan → confirm → fix），但走
       *  /repair-dual-format 端点（纯磁盘扫描，旁路 persistence，见 lib/repair.js）。 */
      const scanAndRepairDual = async () => {
        if (busy) return;
        setBusy("__repair_dual__");
        try {
          const scanRes = await window.__scFetch("/api/session-conductor/repair-dual-format", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ dryRun: true }),
          });
          const scan = await scanRes.json();
          if (!scan.ok) throw new Error(scan.error?.message ?? "dual-format scan failed");
          const dualCount = scan.report?.dual ?? 0;
          const msg = dualCount === 0
            ? t("repairDual.scanClean")
            : t("repairDual.confirm", { n: dualCount });
          if (dualCount === 0) { window.alert(msg); setBusy(null); return; }
          if (!window.confirm(msg)) { setBusy(null); return; }
          const fixRes = await window.__scFetch("/api/session-conductor/repair-dual-format", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ dryRun: false }),
          });
          const fix = await fixRes.json();
          if (!fix.ok) throw new Error(fix.error?.message ?? "dual-format repair failed");
          window.alert(t("repairDual.done", { n: fix.report?.fixed ?? 0 }));
          await refresh();
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        } finally {
          setBusy(null);
        }
      };

      // 自动续跑开关：乐观翻转（点了立即变），后端异步处理，失败回滚；不阻塞其他操作。
      const toggleAutoContinue = async (sessionId, enabled) => {
        setSessions((cur) => cur.map((s) => (s.id === sessionId ? { ...s, autoContinue: enabled } : s)));
        try {
          const res = await window.__scFetch("/api/session-conductor/auto-continue", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ sessionId, enabled }),
          });
          const body = await res.json();
          if (!body.ok) throw new Error(body.error?.message ?? MSG_ACTION_FAILED);
          await refresh();
        } catch (cause) {
          setSessions((cur) => cur.map((s) => (s.id === sessionId ? { ...s, autoContinue: !enabled } : s)));
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        }
      };

      const releaseNow = async (sessionId) => {
        setBusy(sessionId);
        try {
          const res = await window.__scFetch("/api/session-conductor/detach", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ sessionId }),
          });
          const body = await res.json();
          if (!body.ok) {
            window.alert(t("error.action", { message: body.error?.message ?? "release failed" }));
          }
          await refresh();
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        } finally {
          setBusy(null);
        }
      };

      const releaseAll = async () => {
        if (busy) return;
        const label = t("confirm.releaseAll.title");
        const yes = window.confirm(`${label}\n\n${t("confirm.releaseAll.body")}`);
        if (!yes) return;
        setBusy("__all__");
        try {
          const res = await window.__scFetch("/api/session-conductor/detach-all", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({}),
          });
          const body = await res.json();
          if (!body.ok) {
            window.alert(t("error.action", { message: body.error?.message ?? "release all failed" }));
          } else if (body.released?.length > 0) {
            window.alert(`${t("action.releaseAll")}: ${body.released.length}`);
          }
          await refresh();
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        } finally {
          setBusy(null);
        }
      };

      const continueNow = async (sessionId) => {
        setBusy(sessionId);
        try {
          const res = await window.__scFetch("/api/session-conductor/continue", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ sessionId }),
          });
          const body = await res.json();
          if (!body.ok) {
            window.alert(t("error.action", { message: body.error?.message ?? "continue failed" }));
          }
          await refresh();
          // 续跑进行中：轮询刷新几次以反映 continueRunning / running 状态
          const POLL_TIMES = 6;              // 续跑后轮询刷新次数
          const POLL_INTERVAL_MS = 3000;     // 轮询间隔
          for (let i = 0; i < POLL_TIMES; i++) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
            await refresh();
          }
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        } finally {
          setBusy(null);
        }
      };

      // —— 全文搜索（官方 FTS5 优先，不可用时降级内置扫描）——
      const SEARCH_LIMIT = 50; // 单次搜索最大返回条数
      const runFullSearch = async (keyword) => {
        const keywordText = String(keyword ?? query ?? "").trim();
        if (keywordText.length < 2) return;
        setFullSearching(true);
        setFullResults(null);
        try {
          let res = await window.__scFetch("/api/session-search/query", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ query: keywordText, limit: SEARCH_LIMIT }),
          });
          let body = res.ok ? await res.json() : null;
          let usedFallback = false;
          if (!body?.ok || !Array.isArray(body?.items)) {
            // 官方搜索不可用 → 降级到本插件内置扫描
            res = await window.__scFetch("/api/session-conductor/search", {
              method: "POST",
              headers: { "Content-Type": CONTENT_TYPE_JSON },
              body: JSON.stringify({ query: keywordText, scope: "all" }),
            });
            body = res.ok ? await res.json() : null;
            usedFallback = true;
          }
          if (!body?.ok) throw new Error(body?.error?.message ?? "search failed");
          // 两条搜索来源、两种返回形状：官方 FTS 给 items[]，本插件内置扫描给 hits[]。
          // 原先只认 items ⇒ 官方接口不存在（本机实测 /api/session-search/query 直接 404，
          // 必然走内置扫描）时命中恒为空 —— 搜到了也显示「没有找到」，命中区自然点不动。
          const rawHits = Array.isArray(body.items) ? body.items : (Array.isArray(body.hits) ? body.hits : []);
          const hits = rawHits.map((h) => ({
            // sessionId 是点开会话的唯一凭据：缺了就是「点了没反应」，这里兼容常见别名并滤掉空值
            sessionId: h.sessionId ?? h.session?.id ?? h.id ?? null,
            title: h.title ?? null,
            cwd: h.cwd ?? null,
            archived: h.archived === true,
            running: h.running === true,
            updatedAt: h.updatedAt ?? null,
            matches: Array.isArray(h.matches) ? h.matches : (h.match ? [h.match] : []),
          })).filter((h) => typeof h.sessionId === "string" && h.sessionId !== "");
          setFullResults({ query: keywordText, hits, usedFallback });
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        } finally {
          setFullSearching(false);
        }
      };

      // —— 批量删除选中 ——
      const deleteSelected = async () => {
        const ids = [...selected];
        if (ids.length === 0) return;
        const yes = window.confirm(`${t("deleteBatch.confirm.title", { n: ids.length })}\n\n${t("deleteBatch.confirm.body")}`);
        if (!yes) return;
        setBusy("__batch__");
        try {
          const res = await window.__scFetch("/api/session-conductor/delete-batch", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ sessionIds: ids }),
          });
          const body = await res.json();
          if (!body.ok) throw new Error(body.error?.message ?? "delete-batch failed");
          const skippedText = body.skipped?.length > 0 ? t("deleteBatch.skipped", { n: body.skipped.length }) : "";
          window.alert(t("deleteBatch.done", { deleted: body.deleted?.length ?? 0, skippedText }));
          setSelected(new Set());
          await refresh();
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        } finally {
          setBusy(null);
        }
      };

      // —— 勾选的公共入口 ——
      // 行内勾选框、筛选、清空都必须走这两个函数：状态只有 `selected` 一处。
      // 之前行内勾选自己写一段 setSelected、筛选另写一段，两处口径一旦不同就会出现
      // 「删除按钮的计数变了，但行内勾选框没勾上」这种鬼现象。
      const setRowSelected = (sessionId, checked) => {
        if (typeof sessionId !== "string" || sessionId === "") return;
        setSelected((prev) => {
          const next = new Set(prev);
          if (checked) next.add(sessionId); else next.delete(sessionId);
          return next;
        });
      };
      const replaceSelected = (ids) => {
        setSelected(new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === "string" && id !== "")));
      };

      // —— 会话标签（本 fork 新增）——
      // 每次变更整体写回 localStorage（见文件头 __SC_TAGS__）；写失败只影响持久化，界面照常生效。
      const applyTags = (next) => {
        setTags(next);
        window.__SC_TAGS__.save(next);
      };
      const tagErrorText = (code) =>
        code === "too-many-per-session"
          ? t("tag.errPerSession", { n: window.__SC_TAGS__.MAX_PER_SESSION })
          : code === "too-many-tags"
            ? t("tag.errTooMany", { n: window.__SC_TAGS__.MAX_TAGS })
            : code === "empty"
              ? t("tag.errEmpty")
              : "";
      const closeTagEditor = () => {
        setTagEditId(null);
        setTagDraft("");
        setTagError(null);
      };
      const openTagEditor = (sessionId, event) => {
        setTagDraft("");
        setTagError(null);
        // 浮窗默认向下弹（卡片多从列表顶部开始，上方空间常不够）；按钮下方空间不足时改向上。
        let placement = "down";
        try {
          const btn = event?.currentTarget;
          const scroller = btn && typeof btn.closest === "function" ? btn.closest(".dsh-sc-body") : null;
          if (btn && scroller && typeof btn.getBoundingClientRect === "function") {
            const br = btn.getBoundingClientRect();
            const pr = scroller.getBoundingClientRect();
            const spaceAbove = br.top - pr.top;
            const spaceBelow = pr.bottom - br.bottom;
            if (spaceBelow < 260 && spaceAbove > spaceBelow) placement = "up";
          }
        } catch { /* 拿不到布局就按默认 */ }
        setTagPlacement(placement);
        setTagEditId((cur) => (cur === sessionId ? null : sessionId));
      };
      // 给一批会话加同一个标签（单会话与批量共用）：任何一个失败都保留首个错误码显示。
      const addTagToSessions = (ids, raw) => {
        let next = tags;
        let firstError = null;
        let changed = false;
        for (const id of ids ?? []) {
          const res = window.__SC_TAGS__.addTagTo(next, id, raw);
          next = res.tags;
          if (res.error) firstError = firstError ?? res.error;
          if (res.added) changed = true;
        }
        if (changed) applyTags(next);
        setTagError(firstError);
        return changed;
      };
      const addTagToSession = (sessionId, raw) => {
        if (addTagToSessions([sessionId], raw ?? tagDraft)) setTagDraft("");
      };
      const addTagToSelected = (raw) => {
        if (selected.size === 0) return;
        if (addTagToSessions([...selected], raw ?? tagDraft)) setTagDraft("");
      };
      const removeTagFromSession = (sessionId, tag) => {
        applyTags(window.__SC_TAGS__.removeTagFrom(tags, sessionId, tag));
      };
      const toggleTagFilter = (tag) => {
        setTagFilter((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
      };
      // 全选「当前筛选结果」，跨分组一起选（批量打标签 / 批量归档都从这里拿 ids）
      const selectFiltered = () => {
        replaceSelected(filteredShown.map((row) => row.id));
      };
      // 批量归档：宿主没有批量归档路由，逐个 POST 单会话接口；全部发完只 refresh 一次，
      // 不在循环里调 act()——act 每成功一次就 refresh 一次，几十个会话会把列表拉爆。
      const archiveSelected = async () => {
        const ids = [...selected];
        if (ids.length === 0) return;
        if (!window.confirm(t("tag.confirmArchive", { n: ids.length }))) return;
        setBusy("tag-archive");
        let failed = 0;
        for (const id of ids) {
          try {
            const res = await window.__scFetch("/api/session-conductor/archive", {
              method: "POST",
              headers: { "Content-Type": CONTENT_TYPE_JSON },
              body: JSON.stringify({ sessionId: id }),
            });
            const body = await res.json();
            if (!body?.ok) throw new Error(body?.error?.message ?? MSG_ACTION_FAILED);
          } catch {
            failed += 1;
          }
        }
        setBusy(null);
        replaceSelected([]);
        await refresh();
        if (failed > 0) window.alert(t("tag.archivePartial", { n: failed }));
      };

      // —— 回收站操作 ——
      // 删除只是打标记，所以还原就是「删标记」，几乎零成本；真删只发生在到期与一键清空。
      const loadTrashItems = async () => {
        try {
          const res = await window.__scFetch("/api/session-conductor/trash", { headers: { accept: "application/json" } }, 0);
          const body = await res.json();
          if (!body?.ok) throw new Error(body?.error?.message ?? "trash load failed");
          const items = Array.isArray(body.items) ? body.items : [];
          setTrashItems(items);
          setTrashRetention(Number(body.retentionDays) || 7);
          setTrashBatch(body.latestBatch ?? null);
          setTrashSel((prev) => new Set([...prev].filter((id) => items.some((it) => it.sessionId === id))));
        } catch (cause) {
          window.alert(t("error.action", { message: cause instanceof Error ? cause.message : String(cause) }));
        }
      };
      const restoreTrash = async (ids) => {
        if (!Array.isArray(ids) || ids.length === 0) return;
        try {
          const res = await window.__scFetch("/api/session-conductor/trash/restore", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ sessionIds: ids }),
          }, 0);
          const body = await res.json();
          if (!body?.ok) throw new Error(body?.error?.message ?? "restore failed");
          setTrashSel(new Set());
          await loadTrashItems();
          await refresh();
        } catch (cause) {
          window.alert(t("error.action", { message: cause instanceof Error ? cause.message : String(cause) }));
        }
      };
      const restoreLastBatch = async () => {
        try {
          const res = await window.__scFetch("/api/session-conductor/trash/restore-last-batch", { method: "POST", headers: { "Content-Type": CONTENT_TYPE_JSON }, body: "{}" }, 0);
          const body = await res.json();
          if (!body?.ok) throw new Error(body?.error?.message ?? "restore batch failed");
          if ((body.restored ?? []).length === 0) window.alert(t("trash.nothingToUndo"));
          setTrashSel(new Set());
          await loadTrashItems();
          await refresh();
        } catch (cause) {
          window.alert(t("error.action", { message: cause instanceof Error ? cause.message : String(cause) }));
        }
      };
      const emptyTrashAll = async () => {
        const n = (trashItems ?? []).length;
        if (n === 0) return;
        if (!window.confirm(t("trash.emptyConfirm", { n }))) return;
        try {
          const res = await window.__scFetch("/api/session-conductor/trash/empty", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ confirm: true }),
          }, 0);
          const body = await res.json();
          if (!body?.ok) throw new Error(body?.error?.message ?? "empty failed");
          setTrashSel(new Set());
          await loadTrashItems();
        } catch (cause) {
          window.alert(t("error.action", { message: cause instanceof Error ? cause.message : String(cause) }));
        }
      };
      const saveTrashRetention = async () => {
        try {
          const res = await window.__scFetch("/api/session-conductor/trash/retention", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify({ days: Number(trashRetention) || 7 }),
          }, 0);
          const body = await res.json();
          if (!body?.ok) throw new Error(body?.error?.message ?? "retention failed");
          setTrashRetention(Number(body.retentionDays) || 7);
          await loadTrashItems();
        } catch (cause) {
          window.alert(t("error.action", { message: cause instanceof Error ? cause.message : String(cause) }));
        }
      };
      const toggleTrashSel = (sessionId, checked) => {
        setTrashSel((prev) => {
          const next = new Set(prev);
          if (checked) next.add(sessionId); else next.delete(sessionId);
          return next;
        });
      };

      // —— 筛选：按条件把会话**自动勾选**到列表里 ——
      // 批量删除只有一条路径：「勾选 → 删除选中」。条件（归档 / 价值 / 时间 / 目录）只负责把该勾的勾上。
      // ① 归档 / 时间 / 目录：面板手里每一行已经带着 archived / cwd / updatedAt，
      //    纯内存过滤 —— 点完即勾，**不发任何请求**。
      // ② 低价值：唯一需要读日志的条件，走**流式**分析 —— 服务端每算完一条推一行，
      //    前端**分析出一个勾一个**。服务端另有价值索引（按 updatedAt + TTL，默认 24 小时），
      //    命中索引的会话零 I/O 秒回，只有新会话/变过的会话才真读日志。
      // 全程不设时间上限：完成与否由**请求事件**判定（每行一个结果，读完即结束）。
      const [filterProgress, setFilterProgress] = react.useState(null); // {done,total}；null=没在分析
      const streamLowValue = async (baseIds) => {
        const base = new Set(baseIds);
        replaceSelected([]); // 低价值：从空开始，分析出一个勾一个
        setFilterProgress({ done: 0, total: base.size });
        const res = await window.__scFetch("/api/session-conductor/value-analysis?stream=1", {
          method: "POST",
          headers: { "Content-Type": CONTENT_TYPE_JSON, Accept: "application/x-ndjson" },
          body: JSON.stringify({ ids: baseIds }),
        }, 0);
        if (!res.ok) throw new Error("value analysis failed: HTTP " + res.status);
        if (typeof res.body?.getReader !== "function") throw new Error("value analysis: 宿主未提供流式响应");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let picked = 0;
        let seen = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            let row;
            try { row = JSON.parse(line); } catch { continue; }
            if (!row || typeof row.id !== "string") continue; // 头行（{ok,stream,total}）跳过
            seen += 1;
            setFilterProgress({ done: typeof row.done === "number" ? row.done : seen, total: typeof row.total === "number" ? row.total : base.size });
            if (row.value === "low" && base.has(row.id)) {
              picked += 1;
              setRowSelected(row.id, true); // 走公共勾选入口，行内勾选框与计数永远一致
            }
          }
        }
        return picked;
      };

      const applyFilter = async () => {
        const list = Array.isArray(sessions) ? sessions : [];
        const now = Date.now();
        const prefix = rulePrefix.trim().replace(/\/+$/, "");
        const days = Number(ruleDays) || 0;
        const baseIds = list.filter((s) => {
          if (ruleArchivedOnly && s.archived !== true) return false;
          if (days > 0) {
            const updated = typeof s.updatedAt === "number" ? s.updatedAt : NaN;
            if (!Number.isFinite(updated) || now - updated < days * 86400000) return false;
          }
          if (prefix !== "") {
            const cwd = String(s.cwd ?? "").replace(/\/+$/, "");
            if (cwd !== prefix && !cwd.startsWith(prefix + "/")) return false;
          }
          return true;
        }).map((s) => s.id);
        if (baseIds.length === 0) {
          // 勾选是「替换」语义：这次条件什么都没匹配到，必须把上一次的勾选清掉 ——
          // 否则界面还留着上次的勾选与「删除选中 (N)」，很容易照着上次的结果误删。
          replaceSelected([]);
          window.alert(t("deleteByRule.noMatch"));
          return;
        }
        // 切到「全部」让勾选结果当场可见 + 收起条件表单回到列表
        setTab("all");
        setRuleOpen(false);
        if (!ruleLowValue) { replaceSelected(baseIds); return; } // 纯本地，点完即勾
        setBusy("__rule__");
        try {
          const picked = await streamLowValue(baseIds);
          if (picked === 0) window.alert(t("deleteByRule.noMatch"));
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          window.alert(t("error.action", { message }));
        } finally {
          setBusy(null);
          setFilterProgress(null);
        }
      };

      /** 回收站面板：工具栏（保留期 / 撤销 / 还原选中 / 全选 / 一键清空）+ 条目列表 */
      const renderTrash = () => (0, react_jsx_runtime.jsxs)("div", {
        style: { padding: 0 },
        children: [
          (0, react_jsx_runtime.jsxs)("div", {
            style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8, fontSize: FONT_SIZE_SMALL },
            children: [
              (0, react_jsx_runtime.jsx)("span", { style: { color: CSS_LABEL_SECONDARY }, children: t("trash.retention.label") }),
              (0, react_jsx_runtime.jsx)("input", {
                type: "number", min: 1, max: 365, value: trashRetention,
                style: { width: 64, height: SMALL_CONTROL_HEIGHT, borderRadius: CONTROL_RADIUS, border: CSS_BORDER_L2, background: CSS_BG_BASE, color: CSS_LABEL_PRIMARY, padding: "0 6px", fontSize: FONT_SIZE_SMALL },
                onChange: (e) => setTrashRetention(e.target.value),
              }),
              (0, react_jsx_runtime.jsx)("span", { style: { color: CSS_LABEL_TERTIARY }, children: t("trash.retention.unit") }),
              (0, react_jsx_runtime.jsx)("button", { style: S.actionBtn(false), onClick: saveTrashRetention, children: t("trash.retention.save") }),
              (0, react_jsx_runtime.jsx)("button", {
                style: S.actionBtn(false),
                disabled: !trashBatch || (trashBatch.ids ?? []).length === 0,
                title: trashBatch ? t("trash.undo.title", { n: (trashBatch.ids ?? []).length }) : t("trash.nothingToUndo"),
                onClick: restoreLastBatch,
                children: t("trash.undo"),
              }),
              (0, react_jsx_runtime.jsx)("button", {
                style: S.actionBtn(false),
                disabled: trashSel.size === 0,
                onClick: () => restoreTrash([...trashSel]),
                children: t("trash.restoreSelected", { n: trashSel.size }),
              }),
              (0, react_jsx_runtime.jsx)("button", {
                style: S.actionBtn(false),
                disabled: (trashItems ?? []).length === 0,
                onClick: () => setTrashSel(new Set((trashItems ?? []).map((it) => it.sessionId))),
                children: t("trash.selectAll"),
              }),
              (0, react_jsx_runtime.jsx)("button", {
                style: { ...S.actionBtn(true), borderColor: CSS_DANGER, color: CSS_DANGER, marginLeft: "auto" },
                disabled: (trashItems ?? []).length === 0,
                onClick: emptyTrashAll,
                children: t("trash.empty"),
              }),
            ],
          }),
          (0, react_jsx_runtime.jsx)("div", { style: { fontSize: 11.5, color: CSS_LABEL_TERTIARY, marginBottom: 6 }, children: t("trash.hint") }),
          trashItems === null
            ? (0, react_jsx_runtime.jsx)("div", { style: S.empty, children: t("list.loading") })
            : trashItems.length === 0
              ? (0, react_jsx_runtime.jsx)("div", { style: S.empty, children: t("trash.emptyList") })
              : trashItems.map((item) => (0, react_jsx_runtime.jsxs)("div", {
                  style: { display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderTop: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.15))" },
                  children: [
                    (0, react_jsx_runtime.jsx)("input", {
                      type: "checkbox",
                      checked: trashSel.has(item.sessionId),
                      onChange: (e) => toggleTrashSel(item.sessionId, e.target.checked),
                    }),
                    (0, react_jsx_runtime.jsxs)("div", {
                      style: { flex: 1, minWidth: 0 },
                      children: [
                        (0, react_jsx_runtime.jsx)("div", {
                          style: { fontSize: FONT_SIZE_SMALL, color: CSS_LABEL_PRIMARY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
                          children: item.title || basenameOf(item.cwd) || item.sessionId,
                        }),
                        (0, react_jsx_runtime.jsx)("div", {
                          style: { fontSize: 11.5, color: CSS_LABEL_TERTIARY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
                          children: `${item.cwd || item.sessionId} ｜ ${t("trash.remaining", { n: item.remainingDays ?? 0 })}`,
                        }),
                      ],
                    }),
                    (0, react_jsx_runtime.jsx)("button", {
                      style: S.actionBtn(false),
                      onClick: () => restoreTrash([item.sessionId]),
                      children: t("trash.restore"),
                    }),
                  ],
                }, item.sessionId)),
        ],
      });

      const rows = sessions ?? [];
      // 列表过滤：标题 / cwd / id / 状态词（大小写不敏感）
      const ql = query.trim().toLowerCase();
      const matchesQuery = (row) => {
        if (!ql) return true;
        const hay = [
          row.title ?? "", row.cwd ?? "", row.id ?? "",
          row.archived ? "已归档 archived" : "",
          row.running ? "运行中 running" : "",
          row.interruption ? "已中断 interrupted" : "",
        ].join(" ").toLowerCase();
        return hay.includes(ql);
      };
      // tab=active 显示活跃会话（live 挂载中 或 running 运行中），归档的除外
      const shown = tab === "archived" ? rows.filter((row) => row.archived)
        : tab === "active" ? rows.filter((row) => !row.archived && (row.live === true || row.running === true))
        : rows;
      // 时间筛选：按「最近更新」过滤（今天 / 近 7 天 / 近 30 天）
      const timeCutoff = timeFilter === "today"
        ? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })()
        : timeFilter === "week" ? Date.now() - 7 * 86400000
          : timeFilter === "month" ? Date.now() - 30 * 86400000
            : 0;
      const matchesTime = (row) => timeCutoff === 0 || (typeof row.updatedAt === "number" && row.updatedAt >= timeCutoff);
      const filteredShown = shown
        .filter(matchesQuery)
        .filter(matchesTime)
        .filter((row) => window.__SC_TAGS__.matchesTagFilter(tags, row.id, tagFilter));

      /** 通用分桶（「全部会话」与「已归档」共用，避免两套分组实现各写一份）：
       *  keyOf(session) 返回桶键（空 → 落 rest「未分组」）；makeBucket(key) 造桶对象；
       *  只保留有会话的桶（0 会话分组不显示）。 */
      const bucketSessions = (list, keyOf, makeBucket) => {
        const buckets = [];
        const index = new Map();
        const rest = [];
        for (const s of list) {
          const key = keyOf(s);
          if (!key) { rest.push(s); continue; }
          if (!index.has(key)) {
            const b = makeBucket(key);
            index.set(key, b);
            buckets.push(b);
          }
          index.get(key).sessions.push(s);
        }
        return { buckets, rest };
      };

      /** 按工作区分组：会话归入「其 cwd 的最深祖先分组」——
       *  cwd === 分组 path，或 cwd 位于分组 path 目录之下（path 是 cwd 的祖先目录）；
       *  多个分组匹配时取 path 最深者（如 move-test 子目录会话归 move-test，其余归 workspace 根）。
       *  只保留有会话的分组（0 会话分组不显示）；无任何匹配的归入「未分组」。 */
      const groupByWorkspace = (list) => {
        if (!Array.isArray(groups)) return null; // host 无分组 API → 平铺
        const norm = (p) => String(p ?? "").trim().replace(/\\/g, "/").replace(/\/+$/, "");
        /** 会话归属的分组对象（最深祖先；无匹配返回 null）。 */
        const groupOfSession = (s) => {
          const cwd = norm(s.cwd);
          if (!cwd) return null;
          let best = null;
          let bestLen = -1;
          for (const w of groups) {
            const p = norm(w.path);
            if (p !== "" && (cwd === p || cwd.startsWith(p + "/")) && p.length > bestLen) {
              best = w;
              bestLen = p.length;
            }
          }
          return best;
        };
        return bucketSessions(
          list,
          (s) => norm(groupOfSession(s)?.path ?? ""),
          (path) => {
            const workspaceEntry = groups.find((x) => norm(x.path) === path) ?? {};
            return { workspaceId: workspaceEntry.workspaceId, title: workspaceEntry.title, path: workspaceEntry.path, sessions: [] };
          },
        );
      };

      /** 已归档视图分组：**复用上面同一套工作区分组**。
       *  历史实现按 `s.archiveWs` 分桶，但该字段实测**恒为空**（66 个已归档会话全部为空），
       *  于是所有会话都落进「未分组」，看起来就是「已归档里没有正确分组」。
       *  归档会话的 cwd 是有效的（数据层保留），故直接按 cwd 的工作区分组即可正确分节。
       *  host 无分组 API 时退化为平铺（与「全部会话」同口径）。 */
      const groupByArchiveWs = (list) => groupByWorkspace(list);

      const grouped = tab === "all" ? groupByWorkspace(filteredShown) : tab === "archived" ? groupByArchiveWs(filteredShown) : null;

      const toggleCollapse = (key) => {
        setCollapsed((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      };

      // 单条会话卡片：顶部（勾选 + 标题 + 状态徽章）/ 元信息（工作区 · 时间 · 标签）/ 底部（开关 + 操作）。
      // 操作区默认透明，hover 或当前活跃会话才显示（与设计稿一致）。
      const renderRow = (session) => {
        let label = session.title || basenameOf(session.cwd) || session.id;
        if (session.archived && session.archiveWs && label.startsWith(`[${session.archiveWs}] `)) {
          label = label.slice(session.archiveWs.length + 3); // 去掉 "[工作区名] "
        }
        const wsName = session.cwd ? basenameOf(session.cwd) : "";
        const processing = busy === session.id || session.continueRunning === true;
        const interruptionTitle = session.interruption
          ? t("interruption.tooltip", { message: session.interruption.message ?? session.interruption.kind })
          : undefined;
        const ownTags = tags[session.id] ?? [];
        const active = session.live === true && session.archived !== true;
        const badges = [];
        if (session.running === true) badges.push({ kind: "running", text: t("badge.running") });
        else if (session.live === true && session.archived !== true) badges.push({ kind: "live", text: t("badge.live") });
        if (session.archived === true) badges.push({ kind: "archived", text: t("badge.archived") });
        else if (session.interruption) badges.push({ kind: "interrupted", text: t("badge.interrupted"), title: interruptionTitle });

        // 复制会话 id：优先 Clipboard API，退回 execCommand；成功后 tooltip 闪一下「已复制」。
        const copyId = (event) => {
          event.stopPropagation();
          const node = event.currentTarget;
          const flash = () => {
            try {
              const prev = node.getAttribute("title") ?? "";
              node.setAttribute("title", t("session.copied"));
              setTimeout(() => { node.setAttribute("title", prev); }, 1200);
            } catch { /* 提示失败不影响复制 */ }
          };
          try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
              navigator.clipboard.writeText(session.id).then(flash, () => {});
            } else {
              const ta = document.createElement("textarea");
              ta.value = session.id;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand("copy");
              ta.remove();
              flash();
            }
          } catch { /* 复制失败不阻塞面板 */ }
        };

        return jsx("div", {
          key: session.id,
          className: "dsh-sc-card" + (active ? " active" : ""),
          onClick: () => {
            if (onOpenSession && !processing) {
              onOpenSession(session.id);
              setOpen(false);
            }
          },
          children: [
            jsxs("div", {
              className: "dsh-sc-card-head",
              children: [
                jsxs("div", {
                  className: "dsh-sc-title-wrap",
                  children: [
                    jsx("input", {
                      type: "checkbox",
                      className: "dsh-sc-check",
                      checked: selected.has(session.id),
                      title: t("deleteBatch.action", { n: 1 }),
                      onClick: (event) => event.stopPropagation(),
                      onChange: (event) => setRowSelected(session.id, event.target.checked),
                    }),
                    jsx("span", { className: "dsh-sc-session-title", title: label, children: label }),
                  ],
                }),
                badges.length > 0 &&
                  jsx("div", {
                    className: "dsh-sc-badges",
                    children: badges.map((b) =>
                      jsx("span", { className: "dsh-sc-status " + b.kind, title: b.title, children: b.text }, b.kind),
                    ),
                  }),
              ],
            }),
            jsxs("div", {
              className: "dsh-sc-meta",
              children: [
                wsName && jsx("span", { className: "ws", children: wsName }),
                wsName && jsx("span", { className: "dot", children: "·" }),
                jsx("span", { children: timeAgo(session.updatedAt, t) }),
                ownTags.length > 0 && jsx("span", { className: "dot", children: "·" }),
                ownTags.map((tag) =>
                  jsx("span", {
                    className: "dsh-sc-tag" + (tagFilter.includes(tag) ? " on" : ""),
                    title: t("tag.filterHint"),
                    onClick: (event) => { event.stopPropagation(); toggleTagFilter(tag); },
                    children: `#${tag}`,
                  }, tag),
                ),
              ],
            }),
            jsxs("div", {
              className: "dsh-sc-foot",
              onClick: (event) => event.stopPropagation(),
              children: [
                jsxs("div", {
                  className: "dsh-sc-switches",
                  children: [
                    jsxs("label", {
                      className: "dsh-sc-switch",
                      title: t("help.autoRename.title"),
                      children: [
                        jsx("input", {
                          type: "checkbox",
                          checked: session.autoRename === true,
                          disabled: processing,
                          onChange: (event) => toggleAutoRename(session.id, event.target.checked),
                        }),
                        jsx("span", { children: t("action.autoRename") }),
                      ],
                    }),
                    jsxs("label", {
                      className: "dsh-sc-switch",
                      title: t("help.autoContinue.title"),
                      children: [
                        jsx("input", {
                          type: "checkbox",
                          checked: session.autoContinue === true,
                          disabled: processing,
                          onChange: (event) => toggleAutoContinue(session.id, event.target.checked),
                        }),
                        jsx("span", { children: t("action.autoContinue") }),
                      ],
                    }),
                  ],
                }),
                jsxs("div", {
                  className: "dsh-sc-actions",
                  children: [
                    jsxs("span", {
                      className: "dsh-sc-anchor",
                      children: [
                        jsx("button", {
                          type: "button",
                          className: "dsh-sc-act",
                          title: t("tag.openTitle"),
                          onClick: (event) => { event.stopPropagation(); openTagEditor(session.id, event); },
                          children: t("tag.open"),
                        }),
                        tagEditId === session.id &&
                          jsx(TagPopover, {
                            t,
                            ownTags,
                            allTags,
                            value: tagDraft,
                            errorText: tagErrorText(tagError),
                            onChange: setTagDraft,
                            onSubmit: (raw) => addTagToSession(session.id, typeof raw === "string" ? raw : undefined),
                            onRemove: (tag) => removeTagFromSession(session.id, tag),
                            onClose: closeTagEditor,
                            batchCount: 0,
                            placement: tagPlacement,
                          }),
                      ],
                    }),
                    session.interruption !== null && session.interruption !== undefined && !session.running &&
                      jsx("button", {
                        type: "button",
                        className: "dsh-sc-act",
                        style: { color: "var(--dsw-state-warning-primary, #b45309)", borderColor: "#fde68a" },
                        disabled: processing,
                        onClick: () => continueNow(session.id),
                        children: session.continueRunning === true ? t("action.continueRunning") : t("action.continue"),
                      }),
                    !session.running && !session.continueRunning &&
                      jsx("button", {
                        type: "button",
                        className: "dsh-sc-act",
                        disabled: processing,
                        title: t("help.undo.title"),
                        onClick: () => undoLast(session),
                        children: processing ? t("action.busy") : t("action.undo"),
                      }),
                    jsx("button", {
                      type: "button",
                      className: "dsh-sc-act danger",
                      disabled: processing || session.running,
                      onClick: () => confirmDelete(session),
                      children: processing ? t("action.busy") : t("action.delete"),
                    }),
                    // 低频操作收进「⋯」：避免按钮行在窄面板里溢出（参考稿只有 720px 宽）
                    jsxs("div", {
                      className: "dsh-sc-menu-wrap",
                      children: [
                        jsx("button", {
                          type: "button",
                          className: "dsh-sc-act icon",
                          title: t("row.more"),
                          "aria-label": t("row.more"),
                          onClick: (event) => {
                            event.stopPropagation();
                            setRowMenuId((cur) => (cur === session.id ? null : session.id));
                          },
                          children: "⋯",
                        }),
                        rowMenuId === session.id &&
                          jsx("div", {
                            className: "dsh-sc-menu dsh-sc-menu-up",
                            children: [
                              session.autoRename === true &&
                                jsx("button", {
                                  type: "button",
                                  className: "dsh-sc-menu-item",
                                  disabled: processing,
                                  onClick: () => { setRowMenuId(null); analyzeNow(session.id); },
                                  children: processing ? t("action.busy") : t("action.analyze"),
                                }),
                              session.live === true && !session.running && session.continueRunning !== true &&
                                jsx("button", {
                                  type: "button",
                                  className: "dsh-sc-menu-item",
                                  disabled: processing,
                                  onClick: () => { setRowMenuId(null); releaseNow(session.id); },
                                  children: processing ? t("action.busy") : t("action.release"),
                                }),
                              jsx("button", {
                                type: "button",
                                className: "dsh-sc-menu-item",
                                disabled: processing,
                                onClick: () => { setRowMenuId(null); act(session.id, session.archived ? "unarchive" : "archive"); },
                                children: processing ? t("action.busy") : (session.archived ? t("action.restore") : t("action.archive")),
                              }),
                            ].filter(Boolean),
                          }),
                      ],
                    }),
                    jsx("button", {
                      type: "button",
                      className: "dsh-sc-act icon",
                      title: t("session.copyId"),
                      "aria-label": t("session.copyId"),
                      onClick: copyId,
                      children: jsx("svg", {
                        width: 13,
                        height: 13,
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 2,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        "aria-hidden": true,
                        children: [
                          jsx("rect", { x: 9, y: 9, width: 11, height: 11, rx: 2 }),
                          jsx("path", { d: "M5 15V5a2 2 0 0 1 2-2h10" }),
                        ],
                      }),
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
      };
      const renderHelp = () => (0, react_jsx_runtime.jsxs)("div", {
        children: [
          (0, react_jsx_runtime.jsx)("p", {
            style: S.hint,
            children: t("help.tip"),
          }),
          (0, react_jsx_runtime.jsxs)("div", {
            style: { ...S.helpBlock, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
            children: [
              (0, react_jsx_runtime.jsx)("p", {
                style: { ...S.helpDesc, margin: 0, flex: 1, minWidth: HELP_DESC_MIN_WIDTH },
                children: t("help.repair.desc"),
              }),
              (0, react_jsx_runtime.jsx)("button", {
                style: S.actionBtn(false),
                disabled: busy !== null,
                onClick: scanAndRepair,
                children: busy !== null ? t("action.busy") : t("action.repair"),
              }),
            ],
          }),
          (0, react_jsx_runtime.jsxs)("div", {
            style: { ...S.helpBlock, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
            children: [
              (0, react_jsx_runtime.jsx)("p", {
                style: { ...S.helpDesc, margin: 0, flex: 1, minWidth: HELP_DESC_MIN_WIDTH },
                children: t("help.repairEio.desc"),
              }),
              (0, react_jsx_runtime.jsx)("button", {
                style: S.actionBtn(false),
                disabled: busy !== null,
                onClick: scanAndRepairEio,
                children: busy !== null ? t("action.busy") : t("action.repairEio"),
              }),
            ],
          }),
          (0, react_jsx_runtime.jsxs)("div", {
            style: { ...S.helpBlock, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
            children: [
              (0, react_jsx_runtime.jsx)("p", {
                style: { ...S.helpDesc, margin: 0, flex: 1, minWidth: HELP_DESC_MIN_WIDTH },
                children: t("help.repairDual.desc"),
              }),
              (0, react_jsx_runtime.jsx)("button", {
                style: S.actionBtn(false),
                disabled: busy !== null,
                onClick: scanAndRepairDual,
                children: busy !== null ? t("action.busy") : t("action.repairDual"),
              }),
            ],
          }),
          (0, react_jsx_runtime.jsx)("p", {
            style: { ...S.hint, fontWeight: LABEL_FONT_WEIGHT },
            children: t("help.works"),
          }),
          (0, react_jsx_runtime.jsxs)("div", {
            style: S.helpBlock,
            children: [
              (0, react_jsx_runtime.jsx)("p", { style: S.helpTitle, children: t("help.autoRename.title") }),
              (0, react_jsx_runtime.jsx)("p", { style: S.helpDesc, children: t("help.autoRename.desc") }),
            ],
          }),
          (0, react_jsx_runtime.jsxs)("div", {
            style: S.helpBlock,
            children: [
              (0, react_jsx_runtime.jsx)("p", { style: S.helpTitle, children: t("help.autoContinue.title") }),
              (0, react_jsx_runtime.jsx)("p", { style: S.helpDesc, children: t("help.autoContinue.desc") }),
            ],
          }),
          (0, react_jsx_runtime.jsxs)("div", {
            style: S.helpBlock,
            children: [
              (0, react_jsx_runtime.jsx)("p", { style: S.helpTitle, children: t("help.release.title") }),
              (0, react_jsx_runtime.jsx)("p", { style: S.helpDesc, children: t("help.release.desc") }),
            ],
          }),
          (0, react_jsx_runtime.jsxs)("div", {
            style: S.helpBlock,
            children: [
              (0, react_jsx_runtime.jsx)("p", { style: S.helpTitle, children: t("help.delete.title") }),
              (0, react_jsx_runtime.jsx)("p", { style: S.helpDesc, children: t("help.delete.desc") }),
            ],
          }),
          (0, react_jsx_runtime.jsxs)("div", {
            style: S.helpBlock,
            children: [
              (0, react_jsx_runtime.jsx)("p", { style: S.helpTitle, children: t("help.grouped.title") }),
              (0, react_jsx_runtime.jsx)("p", { style: S.helpDesc, children: t("help.grouped.desc") }),
            ],
          }),
          (0, react_jsx_runtime.jsxs)("div", {
            style: S.helpBlock,
            children: [
              (0, react_jsx_runtime.jsx)("p", { style: S.helpTitle, children: t("help.newSession.title") }),
              (0, react_jsx_runtime.jsx)("p", { style: S.helpDesc, children: t("help.newSession.desc") }),
            ],
          }),
          (0, react_jsx_runtime.jsxs)("div", {
            style: S.helpBlock,
            children: [
              (0, react_jsx_runtime.jsx)("p", { style: S.helpTitle, children: t("help.value.title") }),
              (0, react_jsx_runtime.jsx)("p", { style: S.helpDesc, children: t("help.value.desc") }),
            ],
          }),
        ],
      });

      // 各 tab 的计数（tab 右侧小字）。
      const archivedCount = rows.filter((row) => row.archived).length;
      const activeCount = rows.filter((row) => !row.archived && (row.live === true || row.running === true)).length;
      const tabButton = (key, label, count, onPick) =>
        jsxs("button", {
          type: "button",
          className: "dsh-sc-tab" + (tab === key && !helpOpen ? " active" : ""),
          onClick: () => {
            setTab(key);
            setHelpOpen(false);
            if (onPick) onPick();
          },
          children: [
            label,
            count !== null && count !== undefined && jsx("span", { className: "dsh-sc-count", children: `(${count})` }),
          ],
        }, key);

      return jsxs(react.Fragment, {
        children: [
          jsx("button", {
            title: t("trigger.aria"),
            "aria-label": t("trigger.aria"),
            onClick: () => setOpen(true),
            style: S.trigger(wide),
            children: [
              jsx(SessionIcon, { size: 16 }),
              wide ? t("trigger.label") : null,
            ],
          }),
          open &&
            jsxs("div", {
              className: "dsh-sc-overlay",
              children: [
                jsx("div", { className: "dsh-sc-backdrop", onClick: () => setOpen(false) }),
                jsxs("div", {
                  className: "dsh-sc-window",
                  onClick: (event) => event.stopPropagation(),
                  children: [
                    // —— 头部：标题 + 副标题 / 说明 / 关闭 ——
                    jsxs("div", {
                      className: "dsh-sc-header",
                      children: [
                        jsxs("div", {
                          className: "dsh-sc-header-row",
                          children: [
                            jsx("h2", { className: "dsh-sc-title", children: t("panel.title") }),
                            jsxs("div", {
                              className: "dsh-sc-header-right",
                              children: [
                                jsx("span", { className: "dsh-sc-subtitle", children: t("panel.subtitle") }),
                                jsx("button", {
                                  type: "button",
                                  className: "dsh-sc-iconbtn",
                                  title: t("help.button"),
                                  "aria-label": t("help.button"),
                                  onClick: () => setHelpOpen((v) => !v),
                                  children: "?",
                                }),
                                jsx("button", {
                                  type: "button",
                                  className: "dsh-sc-iconbtn",
                                  title: "close",
                                  "aria-label": "close",
                                  onClick: () => setOpen(false),
                                  children: "✕",
                                }),
                              ],
                            }),
                          ],
                        }),
                        jsxs("div", {
                          className: "dsh-sc-tabs",
                          children: [
                            tabButton("all", t("tab.all"), null),
                            tabButton("archived", t("tab.archived"), archivedCount),
                            tabButton("active", t("tab.active"), activeCount),
                            tabButton("trash", t("tab.trash"), trashItems === null ? null : trashItems.length, loadTrashItems),
                          ],
                        }),
                      ],
                    }),
                    // —— 工具栏：搜索 / 全文搜索 / 删除选中 + 筛选行（标签 chips + 时间） ——
                    jsxs("div", {
                      className: "dsh-sc-toolbar",
                      children: [
                        jsxs("div", {
                          className: "dsh-sc-search-row",
                          children: [
                            jsxs("label", {
                              className: "dsh-sc-search",
                              children: [
                                jsx("svg", {
                                  width: 13,
                                  height: 13,
                                  viewBox: "0 0 24 24",
                                  fill: "none",
                                  stroke: "currentColor",
                                  strokeWidth: 2,
                                  strokeLinecap: "round",
                                  "aria-hidden": true,
                                  children: [
                                    jsx("circle", { cx: 11, cy: 11, r: 7 }),
                                    jsx("path", { d: "M20 20l-3.5-3.5" }),
                                  ],
                                }),
                                jsx("input", {
                                  type: "text",
                                  value: query,
                                  placeholder: t("search.placeholder"),
                                  onChange: (event) => { setQuery(event.target.value); setFullResults(null); },
                                  onKeyDown: (event) => {
                                    if (event.key === "Enter") runFullSearch(query);
                                  },
                                }),
                              ],
                            }),
                            jsx("button", {
                              type: "button",
                              className: "dsh-sc-btn",
                              disabled: fullSearching || busy !== null,
                              onClick: () => runFullSearch(query),
                              children: fullSearching ? t("search.fullBusy") : t("search.full"),
                            }),
                            jsx("button", {
                              type: "button",
                              className: "dsh-sc-btn danger",
                              disabled: selected.size === 0 || busy !== null,
                              onClick: () => deleteSelected(),
                              children: t("deleteBatch.action", { n: selected.size }),
                            }),
                          ],
                        }),
                        jsxs("div", {
                          className: "dsh-sc-filter-row",
                          children: [
                            jsxs("div", {
                              className: "dsh-sc-filter-left",
                              children: [
                                jsx("span", { className: "dsh-sc-filter-label", children: t("filter.label") }),
                                allTags.map(({ tag, n }) =>
                                  jsxs("span", {
                                    className: "dsh-sc-chip" + (tagFilter.includes(tag) ? " active" : ""),
                                    title: t("tag.filterHint"),
                                    onClick: () => toggleTagFilter(tag),
                                    children: [`#${tag} ${n}`, jsx("span", { className: "x", children: "×" })],
                                  }, tag),
                                ),
                                tagFilter.length > 0 &&
                                  jsx("button", {
                                    type: "button",
                                    className: "dsh-sc-link",
                                    onClick: () => setTagFilter([]),
                                    children: t("tag.clearFilter"),
                                  }),
                                tagFilter.length > 0 &&
                                  jsx("button", {
                                    type: "button",
                                    className: "dsh-sc-btn sm",
                                    style: { marginLeft: 2 },
                                    onClick: () => selectFiltered(),
                                    children: t("tag.selectFiltered", { n: filteredShown.length }),
                                  }),
                              ],
                            }),
                            jsxs("div", {
                              className: "dsh-sc-filter-right",
                              children: [
                                filterProgress !== null &&
                                  jsx("span", {
                                    style: { fontSize: 11.5, color: "var(--sc-text3, #888)", whiteSpace: "nowrap", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" },
                                    children: t("deleteByRule.analyzing", { done: filterProgress.done, total: filterProgress.total }),
                                  }),
                                // 时间筛选下拉
                                jsxs("div", {
                                  className: "dsh-sc-menu-wrap",
                                  children: [
                                    jsx("button", {
                                      type: "button",
                                      className: "dsh-sc-time-btn",
                                      onClick: (event) => {
                                        event.stopPropagation();
                                        setTimeOpen((v) => !v);
                                        setMoreOpen(false);
                                      },
                                      children: `${t("time.label", { label: t("time." + timeFilter) })} ▾`,
                                    }),
                                    timeOpen &&
                                      jsx("div", {
                                        className: "dsh-sc-menu",
                                        children: ["all", "today", "week", "month"].map((key) =>
                                          jsx("button", {
                                            type: "button",
                                            className: "dsh-sc-menu-item" + (timeFilter === key ? " selected" : ""),
                                            onClick: () => { setTimeFilter(key); setTimeOpen(false); },
                                            children: t("time." + key),
                                          }, key),
                                        ),
                                      }),
                                  ],
                                }),
                                // 「更多」：按条件删除 / 释放全部空闲（低频操作收进下拉，保持工具栏紧凑）
                                jsxs("div", {
                                  className: "dsh-sc-menu-wrap",
                                  children: [
                                    jsx("button", {
                                      type: "button",
                                      className: "dsh-sc-time-btn",
                                      title: t("more.action"),
                                      "aria-label": t("more.action"),
                                      onClick: (event) => {
                                        event.stopPropagation();
                                        setMoreOpen((v) => !v);
                                        setTimeOpen(false);
                                      },
                                      children: "⋯",
                                    }),
                                    moreOpen &&
                                      jsxs("div", {
                                        className: "dsh-sc-menu",
                                        children: [
                                          jsx("button", {
                                            type: "button",
                                            className: "dsh-sc-menu-item" + (ruleOpen ? " selected" : ""),
                                            onClick: () => { setRuleOpen((v) => !v); setMoreOpen(false); },
                                            children: t("rule.menu"),
                                          }),
                                          jsx("button", {
                                            type: "button",
                                            className: "dsh-sc-menu-item",
                                            disabled: busy !== null,
                                            onClick: () => { releaseAll(); setMoreOpen(false); },
                                            children: busy === "__all__" ? t("action.releaseAllBusy") : t("action.releaseAll"),
                                          }),
                                        ],
                                      }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                    // —— 批量区：出现条件 = 勾选了会话 ——
                    selected.size > 0 &&
                      jsxs("div", {
                        className: "dsh-sc-batchbar",
                        children: [
                          jsx("span", { children: t("batch.selected", { n: selected.size }) }),
                          jsxs("span", {
                            className: "dsh-sc-anchor",
                            children: [
                              jsx("button", {
                                type: "button",
                                className: "dsh-sc-btn sm",
                                onClick: () => { setTagDraft(""); setTagError(null); setTagEditId((cur) => (cur === "__batch__" ? null : "__batch__")); },
                                children: t("tag.batchOpen", { n: selected.size }),
                              }),
                              tagEditId === "__batch__" &&
                                jsx(TagPopover, {
                                  t,
                                  ownTags: [],
                                  allTags,
                                  value: tagDraft,
                                  errorText: tagErrorText(tagError),
                                  onChange: setTagDraft,
                                  onSubmit: (raw) => addTagToSelected(typeof raw === "string" ? raw : undefined),
                                  onRemove: () => {},
                                  onClose: closeTagEditor,
                                  batchCount: selected.size,
                                }),
                            ],
                          }),
                          jsx("button", {
                            type: "button",
                            className: "dsh-sc-btn sm",
                            disabled: busy !== null,
                            onClick: () => archiveSelected(),
                            children: busy === "tag-archive" ? t("tag.archiveBusy") : t("tag.archiveSelected", { n: selected.size }),
                          }),
                          jsx("button", {
                            type: "button",
                            className: "dsh-sc-btn sm",
                            onClick: () => replaceSelected([]),
                            children: t("tag.clearSelection"),
                          }),
                        ],
                      }),
                    // —— 按条件删除表单（从「更多」里展开） ——
                    ruleOpen &&
                      jsxs("div", {
                        className: "dsh-sc-rule",
                        children: [
                          jsxs("label", {
                            children: [
                              jsx("input", { type: "checkbox", checked: ruleArchivedOnly, onChange: (event) => setRuleArchivedOnly(event.target.checked) }),
                              t("deleteByRule.label.archivedOnly"),
                            ],
                          }),
                          jsxs("label", {
                            title: t("deleteByRule.label.lowValue"),
                            children: [
                              jsx("input", { type: "checkbox", checked: ruleLowValue, onChange: (event) => setRuleLowValue(event.target.checked) }),
                              t("deleteByRule.label.lowValue"),
                            ],
                          }),
                          jsxs("label", {
                            children: [
                              t("deleteByRule.label.inactiveDays.pre"),
                              jsx("input", {
                                type: "number",
                                min: 0,
                                max: 3650,
                                value: ruleDays,
                                style: { width: 56 },
                                onChange: (event) => setRuleDays(event.target.value),
                              }),
                              t("deleteByRule.label.inactiveDays.post"),
                            ],
                          }),
                          jsx("input", {
                            type: "text",
                            value: rulePrefix,
                            placeholder: t("deleteByRule.label.cwdPrefix"),
                            style: { flex: 1, minWidth: 140 },
                            onChange: (event) => setRulePrefix(event.target.value),
                          }),
                          jsx("button", {
                            type: "button",
                            className: "dsh-sc-btn sm",
                            disabled: busy !== null,
                            onClick: applyFilter,
                            children: busy === "__rule__" ? t("deleteByRule.filtering") : t("deleteByRule.previewBtn"),
                          }),
                          jsx("span", { style: { flexBasis: "100%", fontSize: 11.5, color: "var(--sc-text3, #888)" }, children: t("deleteByRule.andHint") }),
                        ],
                      }),
                    // —— 主体：说明 / 回收站 / 列表 ——
                    jsx("div", {
                      className: "dsh-sc-body",
                      children: helpOpen
                        ? jsxs(react.Fragment, {
                            children: [
                              jsx("button", {
                                type: "button",
                                className: "dsh-sc-link",
                                style: { marginBottom: 8 },
                                onClick: () => setHelpOpen(false),
                                children: t("help.back"),
                              }),
                              renderHelp(),
                            ],
                          })
                        : tab === "trash"
                          ? renderTrash()
                          : jsxs(react.Fragment, {
                              children: [
                                // —— 全文搜索结果区（官方 FTS5 优先，自研兜底） ——
                                fullResults !== null &&
                                  jsxs("div", {
                                    className: "dsh-sc-search-hits",
                                    children: [
                                      jsxs("div", {
                                        className: "dsh-sc-hits-head",
                                        children: [
                                          jsx("span", { children: `${t("search.hits", { n: fullResults.hits.length })}：${fullResults.query}` }),
                                          fullResults.usedFallback &&
                                            jsx("span", { style: { fontSize: 11.5, color: "var(--sc-text3, #888)" }, children: t("search.fallback") }),
                                          jsx("button", {
                                            type: "button",
                                            className: "dsh-sc-link",
                                            style: { marginLeft: "auto" },
                                            onClick: () => setFullResults(null),
                                            children: t("search.close"),
                                          }),
                                        ],
                                      }),
                                      fullResults.hits.length === 0
                                        ? jsx("div", { className: "dsh-sc-empty", style: { padding: "16px 0" }, children: t("search.noResult") })
                                        : fullResults.hits.map((hit) =>
                                            jsxs("div", {
                                              className: "dsh-sc-hit",
                                              onClick: () => {
                                                if (onOpenSession) {
                                                  onOpenSession(hit.sessionId);
                                                  setOpen(false);
                                                }
                                              },
                                              children: [
                                                jsx("div", {
                                                  className: "dsh-sc-hit-title",
                                                  children: [
                                                    hit.title || basenameOf(hit.cwd) || hit.sessionId,
                                                    hit.archived ? ` · ${t("badge.archived")}` : "",
                                                    hit.running ? ` · ${t("badge.running")}` : "",
                                                  ],
                                                }),
                                                jsx("div", { className: "dsh-sc-hit-path", children: hit.cwd || hit.sessionId }),
                                                (hit.matches ?? []).map((m, mi) =>
                                                  jsxs("div", {
                                                    className: "dsh-sc-hit-match",
                                                    children: [
                                                      jsx("span", {
                                                        className: "dsh-sc-hit-role",
                                                        children: m.role === "user" ? t("search.matchRole.user") : m.role === "assistant" ? t("search.matchRole.assistant") : (m.surface ?? m.type ?? ""),
                                                      }),
                                                      jsx("span", { children: m.snippet ?? m.preview ?? "" }),
                                                    ],
                                                  }, `${hit.sessionId}-m${mi}`),
                                                ),
                                              ],
                                            }, hit.sessionId),
                                          ),
                                    ],
                                  }),
                                error !== null &&
                                  jsxs("div", {
                                    className: "dsh-sc-error",
                                    children: [
                                      t("list.error", { message: error }),
                                      retryIn !== null && t("list.autoRetry", { n: retryIn }),
                                      " ",
                                      jsx("button", {
                                        type: "button",
                                        className: "dsh-sc-link",
                                        onClick: refresh,
                                        children: t("action.retry"),
                                      }),
                                    ],
                                  }),
                                sessions === null && error === null
                                  ? jsx("div", { className: "dsh-sc-empty", children: t("list.loading") })
                                  : filteredShown.length === 0
                                    ? jsx("div", {
                                        className: "dsh-sc-empty",
                                        children: tagFilter.length > 0 ? t("tag.emptyFiltered") : tab === "archived" ? t("list.archivedEmpty") : tab === "active" ? t("list.activeEmpty") : t("list.empty"),
                                      })
                                    : grouped === null
                                      ? jsx("div", { className: "dsh-sc-list flat", children: filteredShown.map(renderRow) })
                                      : jsxs(react.Fragment, {
                                          children: [
                                            grouped.buckets.map((g) =>
                                              jsxs("div", {
                                                children: [
                                                  jsxs("div", {
                                                    className: "dsh-sc-group-head",
                                                    onClick: () => toggleCollapse(g.workspaceId),
                                                    children: [
                                                      jsx("span", { className: "dsh-sc-chevron" + (collapsed.has(g.workspaceId) ? " collapsed" : ""), children: "▾" }),
                                                      jsx("span", { className: "dsh-sc-group-title", children: (tab === "archived" ? t("badge.archived") + " · " : "") + g.title }),
                                                      jsx("span", { className: "dsh-sc-group-count", children: g.sessions.length }),
                                                    ],
                                                  }),
                                                  !collapsed.has(g.workspaceId) &&
                                                    jsx("div", { className: "dsh-sc-list", children: g.sessions.map(renderRow) }),
                                                ],
                                              }, g.workspaceId),
                                            ),
                                            grouped.rest.length > 0 &&
                                              jsxs("div", {
                                                children: [
                                                  jsxs("div", {
                                                    className: "dsh-sc-group-head",
                                                    onClick: () => toggleCollapse("__ungrouped__"),
                                                    children: [
                                                      jsx("span", { className: "dsh-sc-chevron" + (collapsed.has("__ungrouped__") ? " collapsed" : ""), children: "▾" }),
                                                      jsx("span", { className: "dsh-sc-group-title", children: t("group.ungrouped") }),
                                                      jsx("span", { className: "dsh-sc-group-count", children: grouped.rest.length }),
                                                    ],
                                                  }),
                                                  !collapsed.has("__ungrouped__") &&
                                                    jsx("div", { className: "dsh-sc-list", children: grouped.rest.map(renderRow) }),
                                                ],
                                              }),
                                          ],
                                        }),
                              ],
                            }),
                    }),
                  ],
                }),
              ],
            }),
        ],
      });
    }

    // ---------- 插件入口 ----------
    const inject = ["slots", "locale"];

    // 设置页必须单入口 + React.createElement，禁止 jsx-runtime.jsx。
    // 外壳对 settings.section 渲染抛错会吞成空白，所以页面自己兜底。
    const h = react.createElement.bind(react);
    const settingsCss = [
      ".scs_page{display:flex;flex-direction:column;gap:16px;padding:4px 0 24px}",
      ".scs_hero{display:flex;flex-direction:column;gap:6px}",
      ".scs_title{font-size:20px;font-weight:650;color:var(--dsw-alias-label-primary)}",
      ".scs_desc{font-size:13px;line-height:1.6;color:var(--dsw-alias-label-tertiary);max-width:72ch;margin:0}",
      ".scs_hint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".scs_err{font-size:13px;color:var(--dsw-alias-label-error)}",
      ".scs_card{display:flex;flex-direction:column;gap:12px;padding:16px;border:.5px solid var(--dsw-alias-border-l4);border-radius:16px;background:var(--dsw-alias-bg-layer-3)}",
      ".scs_cardtitle{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary)}",
      ".scs_note{font-size:12px;line-height:1.7;color:var(--dsw-alias-label-secondary);padding:10px 12px;border:1px dashed var(--dsw-alias-border-l2);border-radius:10px}",
      ".scs_row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
      ".scs_btn{cursor:pointer;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);border-radius:8px;height:28px;padding:0 12px;font-size:12px}",
      ".scs_btn.scs_on{border-color:var(--dsw-state-success-primary,#34a853);color:var(--dsw-state-success-primary,#34a853)}",
      ".scs_btn.scs_off{border-color:var(--dsw-state-error-primary,#d9534f);color:var(--dsw-state-error-primary,#e5484d)}",
      ".scs_input{flex:1;min-width:180px;height:28px;border-radius:6px;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);padding:0 10px;font-size:13px}",
      ".scs_last{font-size:12px;color:var(--dsw-alias-label-tertiary);padding:6px 8px;border:1px dashed var(--dsw-alias-border-l2);border-radius:6px;white-space:pre-wrap;word-break:break-all;max-height:80px;overflow:auto}",
      ".scs_file{display:flex;align-items:center;gap:8px;font-size:12px}",
      ".scs_del{cursor:pointer;border:none;background:transparent;color:#e5484d;font-size:11px}",
      ".scs_select{height:28px;border-radius:6px;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-size:12px;padding:0 8px}",
      ".scs_ta{width:100%;min-height:72px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);padding:8px 10px;font-size:12px;resize:vertical}",
      // 悬浮窗（改：参考「选择目录」弹窗样式——mask 遮罩 + 居中 dialog + 面包屑 + 上级 + 列表 + 底部确认）
      ".scs_pickermask{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4)}",
      ".scs_pickerdialog{width:min(520px,88vw);max-height:70vh;display:flex;flex-direction:column;gap:8px;padding:14px;border:.5px solid var(--dsw-alias-border-l4);border-radius:14px;background:var(--dsw-alias-bg-layer-3);box-shadow:0 12px 40px rgba(0,0,0,.35)}",
      ".scs_pickerhead{display:flex;align-items:center;justify-content:space-between}",
      ".scs_pickertitle{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}",
      ".scs_pickerclose{font:inherit;font-size:13px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;padding:2px 6px}",
      ".scs_pickerpath{font-size:11px;color:var(--dsw-alias-label-secondary);word-break:break-all;padding:6px 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base)}",
      ".scs_pickerup{font-size:12px;color:var(--dsw-alias-brand-primary);cursor:pointer;padding:3px 2px}",
      ".scs_pickerlist{flex:1;min-height:120px;max-height:38vh;overflow-y:auto;display:flex;flex-direction:column;gap:2px}",
      ".scs_pickerrow{font-size:12px;color:var(--dsw-alias-label-primary);cursor:pointer;padding:5px 8px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".scs_pickerrow:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}",
      ".scs_pickerrow.scs_pickerselected{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent);color:var(--dsw-alias-brand-primary)}",
      ".scs_pickerhint{font-size:12px;color:var(--dsw-alias-label-tertiary);padding:8px}",
      ".scs_pickerfoot{display:flex;justify-content:flex-end}",
      ".scs_pickermdfile{font-weight:600}",
      ".scs_rule{display:flex;flex-direction:column;gap:8px;padding:10px;border:.5px dashed var(--dsw-alias-border-l2);border-radius:10px}",
    ].join("");

    function ensureSettingsCss() {
      if (typeof document === "undefined") return;
      if (document.querySelector('style[data-plugin-css="dsh-session-conductor"]')) return;
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-session-conductor";
      tag.dataset.pluginCss = "dsh-session-conductor";
      tag.textContent = settingsCss;
      document.head.appendChild(tag);
    }

    function trSettings(key) {
      // 跨 NS + en 统一取词（修复此前只读 zh 的 bug）
      return window.__SC_TR__(key);
    }

    // —— 模板注入：槽位卡片（独立组件，避免 MainTemplateSection 单函数过长）——
    function TemplateSlotCard(props) {
      const { slot, title, desc, m, busy, edits, importMode, fileRef, MODES, onToggle, onToggleEnforce, onOpenImport, onPickFile, onEdit, onSaveEdit, onRemove } = props;
      const hasContent = !!m.name || (m.bytes > 0);
      const text = edits[slot] !== undefined ? edits[slot] : (m.content ?? "");
      return h("div", { className: "scs_rule", key: slot },
        h("div", { className: "scs_row" },
          h("b", { style: { minWidth: LABEL_MIN_WIDTH } }, title),
          h("button", { type: "button", className: "scs_btn " + (m.enabled ? "scs_on" : "scs_off"), disabled: busy || !hasContent, onClick: () => onToggle(slot, !m.enabled) }, m.enabled ? __SC_TR__("tpl.injecting") : __SC_TR__("tpl.injectOff")),
          slot === "plan" ? h("button", { type: "button", className: "scs_btn", disabled: busy, onClick: () => onToggleEnforce(!(m.enforce === true)) }, (m.enforce === true ? __SC_TR__("tpl.enforceOn") : __SC_TR__("tpl.enforceOff"))) : null,
        ),
        // 导入行：下拉选方式 + 单个导入按钮
        h("div", { className: "scs_row", style: { marginTop: 8 } },
          h("select", {
            className: "scs_select", value: importMode[slot] || "local",
            onChange: (e) => props.onImportMode(slot, e.target.value),
          }, MODES.map((o) => h("option", { key: o.value, value: o.value }, o.label))),
          h("button", { type: "button", className: "scs_btn", disabled: busy, onClick: () => onOpenImport(slot) }, __SC_TR__("tpl.import")),
          h("input", { ref: fileRef, type: "file", accept: ".md,text/markdown", style: { display: "none" }, onChange: (e) => onPickFile(slot, e) }),
        ),
        // 内容显示 + 可再次编辑（动态高度、自动换行）
        h("textarea", {
          className: "scs_ta",
          style: { width: "100%", minHeight: TEXTAREA_MIN_HEIGHT, maxHeight: TEXTAREA_MAX_HEIGHT, resize: "vertical", whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word", lineHeight: LINE_HEIGHT_TEXTAREA, fontFamily: "inherit" },
          value: text,
          placeholder: hasContent ? "" : __SC_TR__("tpl.emptyHint"),
          onChange: (e) => onEdit(slot, e.target),
        }),
        h("div", { className: "scs_row", style: { marginTop: 6 } },
          h("button", { type: "button", className: "scs_btn", disabled: busy || edits[slot] === undefined || !(edits[slot] || "").trim(), onClick: () => onSaveEdit(slot) }, __SC_TR__("tpl.saveEdit")),
          h("button", { type: "button", className: "scs_del", disabled: busy || !hasContent, onClick: () => onRemove(slot) }, __SC_TR__("tpl.clear")),
        ),
        h("div", { className: "scs_hint" }, desc + (m.name ? __SC_TR__("tpl.current", { name: m.name }) + (m.url ? "（" + m.url + "）" : "") + (m.updatedAt ? " · " + new Date(m.updatedAt).toLocaleString() : "") : "")),
      );
    }

    // —— 模板注入：统一悬浮窗（url 网址输入 / dir 目录浏览）——
    function TemplatePickerModal(props) {
      const { picker, busy, onClose, onBrowseDir, onPickMd, onImport } = props;
      return h("div", { className: "scs_pickermask", onClick: (e) => { if (e.target === e.currentTarget) onClose(); } },
        h("div", { className: "scs_pickerdialog" },
          h("div", { className: "scs_pickerhead" },
            h("span", { className: "scs_pickertitle" }, picker.mode === "url" ? __SC_TR__("tpl.pickerUrl", { slot: picker.slot === "plan" ? __SC_TR__(I18N_TPL_PLAN_SHORT) : __SC_TR__(I18N_TPL_CLOSING_SHORT) }) : (picker.mode === "dir" ? __SC_TR__("tpl.pickerDir", { slot: picker.slot === "plan" ? __SC_TR__(I18N_TPL_PLAN_SHORT) : __SC_TR__(I18N_TPL_CLOSING_SHORT) }) : __SC_TR__("tpl.pickerPath", { slot: picker.slot === "plan" ? __SC_TR__(I18N_TPL_PLAN_SHORT) : __SC_TR__(I18N_TPL_CLOSING_SHORT) }))),
            h("button", { type: "button", className: "scs_pickerclose", onClick: () => onClose() }, "✕"),
          ),
          picker.mode === "url"
            ? h("div", { className: "scs_row", style: { paddingTop: 4 } },
                h("input", { className: "scs_input", style: { flex: 1 }, value: picker.url || "", placeholder: __SC_TR__("tpl.urlPlaceholder"), onChange: (e) => props.onUrlChange(e.target.value) }),
                h("button", { type: "button", className: "scs_btn", disabled: busy || !(picker.url || "").trim(), onClick: () => onImport(picker.slot, "url", (picker.url || "").trim()) }, __SC_TR__("tpl.import")),
              )
            : h("div", {},
                h("div", { className: "scs_pickerpath" }, picker.path || __SC_TR__("tpl.noPath")),
                h("div", { className: "scs_pickerup", onClick: () => { if (picker.parent) onBrowseDir(picker.parent); } }, __SC_TR__("tpl.upDir")),
                h("div", { className: "scs_pickerlist" },
                  picker.entries.length === 0 ? h("div", { className: "scs_pickerhint" }, __SC_TR__("tpl.emptyDir")) : null,
                  picker.entries.map((e) => h("div", {
                    key: e.path,
                    className: "scs_pickerrow" + (e.isMd ? " scs_pickermdfile" : "") + (picker.path === e.path ? " scs_pickerselected" : ""),
                    onClick: () => { if (e.isDir) onBrowseDir(e.path); else if (e.isMd) onPickMd(e.path); },
                  }, (e.isDir ? "📁 " : (e.isMd ? "📄 " : "· ")) + e.name + (e.isDir ? "/" : ""))),
                ),
                h("div", { className: "scs_pickerhint" }, __SC_TR__("tpl.dirHint")),
                h("div", { className: "scs_pickerfoot" },
                  h("button", { type: "button", className: "scs_btn", disabled: busy || !(picker.path || "").trim(), onClick: () => onImport(picker.slot, "dir", (picker.path || "").trim()) }, __SC_TR__("tpl.importSelected")),
                ),
              ),
        ),
      );
    }

    const TEMPLATE_MODES = [
      { value: "local", label: __SC_TR__("tpl.modeLocal") },
      { value: "url", label: __SC_TR__("tpl.modeUrl") },
      { value: "dir", label: __SC_TR__("tpl.modeDir") },
    ];

    function useTemplateFetch(st) {
      const refresh = react.useCallback(() => {
        window.__scFetch("/api/session-conductor/templates", { credentials: "same-origin" })
          .then(async (res) => {
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.ok) throw new Error((body.error && body.error.message) || (HTTP_STATUS_PREFIX + res.status));
            st.setSlots(body.slots || {});
          })
          .catch((cause) => st.setMsg({ err: (cause && cause.message) || String(cause) }));
      }, [st]);
      react.useEffect(() => { refresh(); }, [refresh]);
      const post = (payload) => window.__scFetch("/api/session-conductor/templates", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": CONTENT_TYPE_JSON },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) throw new Error((body.error && body.error.message) || (HTTP_STATUS_PREFIX + res.status));
        st.setSlots(body.slots || {});
        return body;
      });
      return { refresh, post };
    }

    // —— 模板导入动作（本地设备上传 / 在线网址 / DSH 目录浏览）——
    function useTemplateImports(st, post) {
      const slotLabel = (slot) => (slot === "plan" ? __SC_TR__(I18N_TPL_PLAN_SHORT) : __SC_TR__(I18N_TPL_CLOSING_SHORT));
      const onPickFile = (slot, event) => {
        const f = event.target.files && event.target.files[0];
        if (!f) return;
        event.target.value = "";
        st.setBusy(true); st.setMsg(null);
        f.text()
          .then((content) => post({ slot, name: f.name, content }))
          .then((body) => { st.setMsg({ ok: (body.message) || __SC_TR__("tpl.imported", { slot: slotLabel(slot) }) }); st.setEdits((s) => ({ ...s, [slot]: content })); })
          .catch((cause) => st.setMsg({ err: __SC_TR__("tpl.importFail") + ((cause && cause.message) || String(cause)) }))
          .finally(() => st.setBusy(false));
      };
      const openImport = (slot) => {
        const mode = st.importMode[slot] || "local";
        st.setMsg(null);
        if (mode === "local") {
          if (st.fileRefs[slot].current) st.fileRefs[slot].current.click();
          return;
        }
        if (mode === "url") {
          st.setPicker({ slot, mode: "url", url: "", path: "", parent: null, entries: [] });
          return;
        }
        window.__scFetch("/api/session-conductor/templates/dir", { credentials: "same-origin" })
          .then(async (res) => {
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.ok) throw new Error((body.error && body.error.message) || (HTTP_STATUS_PREFIX + res.status));
            st.setPicker({ slot, mode, path: body.path, parent: body.parent, entries: body.entries || [] });
          })
          .catch((cause) => st.setMsg({ err: __SC_TR__("tpl.dirFail") + ((cause && cause.message) || String(cause)) }));
      };
      const browseDir = (path) => {
        window.__scFetch("/api/session-conductor/templates/dir?path=" + encodeURIComponent(path), { credentials: "same-origin" })
          .then(async (res) => {
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.ok) throw new Error((body.error && body.error.message) || (HTTP_STATUS_PREFIX + res.status));
            st.setPicker({ slot: st.picker.slot, mode: st.picker.mode, path: body.path, parent: body.parent, entries: body.entries || [] });
          })
          .catch((cause) => st.setMsg({ err: __SC_TR__("tpl.dirFail") + ((cause && cause.message) || String(cause)) }));
      };
      const importTemplate = (slot, mode, value) => {
        st.setBusy(true); st.setMsg(null);
        post(mode === "url" ? { slot, url: value } : { slot, action: "pickPath", path: value })
          .then((body) => { st.setMsg({ ok: (body.message) || __SC_TR__("tpl.imported", { slot: slotLabel(slot) }) }); st.setPicker(null); })
          .catch((cause) => st.setMsg({ err: __SC_TR__("tpl.importFail") + ((cause && cause.message) || String(cause)) }))
          .finally(() => st.setBusy(false));
      };
      return { onPickFile, openImport, browseDir, importTemplate, slotLabel };
    }

    // —— 模板槽位变更动作（开关 / 强制门禁 / 编辑保存 / 清空）——
    function useTemplateMutations(st, post, slotLabel) {
      const toggle = (slot, enabled) => {
        st.setBusy(true); st.setMsg(null);
        post({ slot, enabled })
          .then((body) => st.setMsg({ ok: (body.message) || __SC_TR__("tpl.toggled", { slot: slotLabel(slot) }) }))
          .catch((cause) => st.setMsg({ err: (cause && cause.message) || String(cause) }))
          .finally(() => st.setBusy(false));
      };
      const toggleEnforce = (enforce) => {
        st.setBusy(true); st.setMsg(null);
        post({ slot: "plan", enforce })
          .then((body) => st.setMsg({ ok: (body.message) || __SC_TR__("tpl.enforceDone") }))
          .catch((cause) => st.setMsg({ err: (cause && cause.message) || String(cause) }))
          .finally(() => st.setBusy(false));
      };
      const onEdit = (slot, el) => {
        const v = el.value;
        st.setEdits((s) => ({ ...s, [slot]: v }));
        el.style.height = "auto";
        el.style.height = (el.scrollHeight + 2) + "px";
      };
      const saveEdit = (slot) => {
        const content = (st.edits[slot] ?? "").trim();
        if (!content) return;
        st.setBusy(true); st.setMsg(null);
        post({ slot, content })
          .then((body) => { st.setMsg({ ok: (body.message) || __SC_TR__("tpl.updated", { slot: slotLabel(slot) }) }); st.setEdits((s) => ({ ...s, [slot]: undefined })); })
          .catch((cause) => st.setMsg({ err: __SC_TR__("tpl.saveFail") + ((cause && cause.message) || String(cause)) }))
          .finally(() => st.setBusy(false));
      };
      const onRemove = (slot) => {
        st.setBusy(true); st.setMsg(null);
        post({ slot, action: "remove" })
          .then((body) => { st.setMsg({ ok: (body.message) || __SC_TR__("tpl.removed", { slot: slotLabel(slot) }) }); st.setEdits((s) => ({ ...s, [slot]: undefined })); })
          .catch((cause) => st.setMsg({ err: (cause && cause.message) || String(cause) }))
          .finally(() => st.setBusy(false));
      };
      return { toggle, toggleEnforce, onEdit, saveEdit, onRemove };
    }

    function MainTemplateSection() {
      const [slots, setSlots] = react.useState(null);
      const [busy, setBusy] = react.useState(false);
      const [msg, setMsg] = react.useState(null);
      const [edits, setEdits] = react.useState({});
      const [importMode, setImportMode] = react.useState({ plan: "local", closing: "local" });
      const [picker, setPicker] = react.useState(null);
      const fileRefs = { plan: react.useRef(null), closing: react.useRef(null) };
      const st = { slots, setSlots, busy, setBusy, msg, setMsg, edits, setEdits, importMode, setImportMode, picker, setPicker, fileRefs };
      const { post } = useTemplateFetch(st);
      const imports = useTemplateImports(st, post);
      const muts = useTemplateMutations(st, post, imports.slotLabel);
      return h("div", { className: "scs_card" },
        h("div", { className: "scs_cardtitle" }, __SC_TR__("tpl.title")),
        h("div", { className: "scs_hint" }, __SC_TR__("tpl.desc")),
        (slots ? [
          h(TemplateSlotCard, {
            key: "plan", slot: "plan", title: __SC_TR__("tpl.planTitle"), desc: __SC_TR__("tpl.planDesc"),
            m: slots.plan || { enabled: false, enforce: false, name: "", url: "", bytes: 0, updatedAt: 0, content: "" },
            busy, edits, importMode, fileRef: fileRefs.plan, MODES: TEMPLATE_MODES,
            onToggle: muts.toggle, onToggleEnforce: muts.toggleEnforce, onOpenImport: imports.openImport, onPickFile: imports.onPickFile, onEdit: muts.onEdit, onSaveEdit: muts.saveEdit, onRemove: muts.onRemove,
            onImportMode: (s, v) => setImportMode((prev) => ({ ...prev, [s]: v })),
          }),
          h(TemplateSlotCard, {
            key: "closing", slot: "closing", title: __SC_TR__("tpl.closingTitle"), desc: __SC_TR__("tpl.closingDesc"),
            m: slots.closing || { enabled: false, enforce: false, name: "", url: "", bytes: 0, updatedAt: 0, content: "" },
            busy, edits, importMode, fileRef: fileRefs.closing, MODES: TEMPLATE_MODES,
            onToggle: muts.toggle, onToggleEnforce: muts.toggleEnforce, onOpenImport: imports.openImport, onPickFile: imports.onPickFile, onEdit: muts.onEdit, onSaveEdit: muts.saveEdit, onRemove: muts.onRemove,
            onImportMode: (s, v) => setImportMode((prev) => ({ ...prev, [s]: v })),
          }),
        ] : h("div", { className: "scs_hint" }, __SC_TR__("tpl.loading"))),
        msg ? h("div", { className: msg.err ? "scs_err" : "scs_hint" }, msg.err || msg.ok) : null,
        picker ? h(TemplatePickerModal, {
          picker, busy,
          onClose: () => setPicker(null),
          onBrowseDir: imports.browseDir,
          onPickMd: (p) => setPicker((prev) => ({ ...prev, path: p })),
          onUrlChange: (v) => setPicker((prev) => ({ ...prev, url: v })),
          onImport: imports.importTemplate,
        }) : null,
      );
    }



    // ── 自动重命名模型选择：DSH 同款解析选择器（provider 分组 + 模型下拉）──
    // 数据来自官方 modelCatalog（GET /api/session-conductor/auto-rename-model 透传），
    // 选择持久化到插件 domain，自动重命名 resolveRoute 三级优先级最优先。
    function AutoRenameModelSection() {
      const [sel, setSel] = react.useState(null);          // {provider, model} | null（null=跟随会话模型）
      const [catalog, setCatalog] = react.useState(null);  // 官方 modelCatalog
      const [provider, setProvider] = react.useState("");  // 编辑态 provider
      const [model, setModel] = react.useState("");        // 编辑态 model
      const [busy, setBusy] = react.useState(false);
      const [msg, setMsg] = react.useState(null);

      react.useEffect(() => {
        let alive = true;
        window.__scFetch("/api/session-conductor/auto-rename-model", { headers: { accept: "application/json" } })
          .then((r) => r.json())
          .then((data) => {
            if (!alive || !data?.ok) return;
            setSel(data.selection ?? null);
            setCatalog(data.catalog ?? null);
            if (data.selection) {
              setProvider(data.selection.provider);
              setModel(data.selection.model);
            }
          })
          .catch(() => { /* 目录获取失败：仍允许手动选择（下方兜底输入框） */ });
        return () => { alive = false; };
      }, []);

      const save = async (next) => {
        setBusy(true);
        setMsg(null);
        try {
          const r = await window.__scFetch("/api/session-conductor/auto-rename-model", {
            method: "POST",
            headers: { "Content-Type": CONTENT_TYPE_JSON },
            body: JSON.stringify(next),
          });
          const payload = await r.json();
          if (payload?.ok) {
            setSel(payload.selection ?? null);
            setMsg({ ok: payload.message || __SC_TR__("saved") });
          } else {
            setMsg({ err: payload?.error?.message || __SC_TR__("saveFail") });
          }
        } catch (e) {
          setMsg({ err: String(e?.message ?? e) });
        }
        setBusy(false);
      };

      const groups = catalog?.groups ?? [];
      const providers = groups.map((g) => ({ id: g.id, name: g.name, models: g.models ?? [] }));
      const curProvider = providers.find((p) => p.id === provider) ?? null;
      const models = curProvider?.models ?? [];
      const follow = sel === null;

      return h("div", { className: "scs_card" },
        h("div", { className: "scs_cardtitle" }, __SC_TR__("armTitle")),
        h("div", { className: "scs_hint" }, __SC_TR__("armDesc")),
        h("div", { className: "scs_row", style: { gap: 8, alignItems: "center" } },
          h("label", { style: { display: "flex", alignItems: "center", gap: 4 } },
            h("input", { type: "radio", name: "sc-arm-follow", checked: follow, onChange: () => save({ follow: true }) }),
            __SC_TR__("armFollow"),
          ),
        ),
        h("div", { className: "scs_row", style: { gap: 8, alignItems: "center", flexWrap: "wrap" } },
          h("select", { className: "scs_input", style: { width: SELECT_WIDTH_PROVIDER }, value: provider, disabled: busy, onChange: (e) => { setProvider(e.target.value); setModel(""); } },
            h("option", { value: "" }, __SC_TR__("armProvider")),
            providers.map((p) => h("option", { key: p.id, value: p.id }, p.name)),
          ),
          h("select", { className: "scs_input", style: { width: SELECT_WIDTH_MODEL }, value: model, disabled: busy || !provider, onChange: (e) => setModel(e.target.value) },
            h("option", { value: "" }, __SC_TR__("armModel")),
            models.map((m) => h("option", { key: m.id, value: m.id }, m.name || m.id)),
          ),
          h("button", { type: "button", className: "scs_btn", disabled: busy || !provider || !model, onClick: () => save({ provider, model }) }, __SC_TR__("armSet")),
        ),
        h("div", { className: "scs_hint" }, follow
          ? __SC_TR__("armCurFollow")
          : (sel ? `当前：${sel.provider}/${sel.model}` : __SC_TR__("armCurNone"))),
        msg ? h("div", { className: msg.err ? "scs_err" : "scs_hint" }, msg.err || msg.ok) : null,
      );
    }

    class SettingsErrorBoundary extends react.Component {
      constructor(props) {
        super(props);
        this.state = { err: "" };
      }
      static getDerivedStateFromError(err) {
        return { err: (err && err.message) || String(err) };
      }
      render() {
        if (this.state.err) {
          return h("div", { className: "scs_page" },
            h("div", { className: "scs_title" }, __SC_TR__("settings.title")),
            h("div", { className: "scs_err" }, __SC_TR__("renderFail") + this.state.err),
          );
        }
        return this.props.children;
      }
    }

    function ConductorSettingsPage() {
      ensureSettingsCss();
      return h(SettingsErrorBoundary, null,
        h("div", { className: "scs_page" },
          h("div", { className: "scs_hero" },
            h("div", { className: "scs_title" }, trSettings("settings.title")),
            h("p", { className: "scs_desc" }, trSettings("settings.desc")),
            h("div", { className: "scs_hint" }, trSettings("settings.scopeHint")),
          ),
          h(AutoRenameModelSection, null),
          h(MainTemplateSection, null),
          h("div", { className: "scs_note" }, trSettings("settings.note")),
        ),
      );
    }

    function apply(ctx) {
      // 插槽排序（slots 顺序权重，小在前）：设置左侧栏「会话管理」页 vs 侧边栏底部入口
      const SETTINGS_SECTION_ORDER = 40;
      const SIDEBAR_ACTION_ORDER = 90;
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "session-conductor: dictionaries");
      const slots = ctx.get("slots");
      if (slots !== undefined) {
        slots.inject("settings.section", () => slots.register(
          { name: "settings.section", id: "session-conductor", order: SETTINGS_SECTION_ORDER, label: () => trSettings("settings.nav") },
          () => h(ConductorSettingsPage, null),
        ));
      }
      ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
        name: "sidebar.footer.action",
        id: "session-conductor",
        order: SIDEBAR_ACTION_ORDER,
        locale: NS,
        inject: () => ({
          onOpenSession: (sessionId) => {
            // 打开会话的入口，按「宿主真实存在的」优先级逐个试：
            //   · ctx.get("uiWorkspace").openSession(id) —— 宿主自己的会话导航服务
            //     （ui-conversation 内部就是 `const nav = ctx.get('uiWorkspace')` 再 nav.openSession(id)；
            //       实测宿主包里根本没有 workspaceNavigation / openSession 这类名字，早期写法是猜的）
            //   · ctx.uiWorkspace.openSession(id) —— 同一服务，仅在本插件声明过依赖时才作为属性可见
            //   · ctx.get("sessions").open(id)    —— 老版本兜底
            // 必须用 ctx.get(...)：cordis 里未在 inject 声明的服务**没有** ctx.<name> 属性，
            // 但 ctx.get(name) 仍能取到 —— 只写 ctx.uiWorkspace 会永远 undefined，点了没反应。
            try {
              const nav = ctx.get?.("uiWorkspace");
              if (typeof nav?.openSession === "function") return nav.openSession(sessionId);
              if (typeof ctx.uiWorkspace?.openSession === "function") return ctx.uiWorkspace.openSession(sessionId);
              const legacy = ctx.get?.("sessions");
              if (typeof legacy?.open === "function") return legacy.open(sessionId);
              // eslint-disable-next-line no-console
              console.warn("[session-conductor] 打不开会话：宿主未暴露 uiWorkspace.openSession / sessions.open", sessionId);
            } catch (error) {
              // 打开失败不阻塞面板，但不再静默
              // eslint-disable-next-line no-console
              console.warn("[session-conductor] 打开会话失败:", error);
            }
          },
        }),
      }, SessionManagerPanel));
    }

    exports.apply = apply;
    exports.inject = inject;


/**
 * dsh-session-conductor — 「会话分组」精简卡（裁剪后版本）
 *
 * 分组管理（创建/重命名/删除/移动会话）已移除，回归 DSH 官方 workspace 机制。
 * 本卡只保留：
 *   · 分组列表（GET /api/session-conductor/group/list，只读展示）
 *   · 每行「在分组下新建会话」（POST /api/session-conductor/group/new-session {workspaceId}）
 *   · 「新建会话（上一次使用的工作区）」（new-session 不带 workspaceId = 最近活跃会话 cwd 归属分组）
 */

    return module.exports;
  },
});
window.__ModuleLoader__.load({
  id: "dsh-session-conductor-group",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let react = require("react");
    let react_jsx_runtime = require("react/jsx-runtime");

    const NS = "sessionGroup";
    const zh = {};
    const en = {};
    __scFillI18nDict("sessionGroup", zh, en);

    const css = `
      .sg2_card { display:flex; flex-direction:column; gap:10px; }
      .sg2_row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .sg2_btn { cursor:pointer; border:1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.35)); background:var(--dsw-specific-tip, transparent); color:var(--dsw-alias-label-secondary, inherit); border-radius:8px; height:28px; padding:0 12px; font-size:12px; line-height:26px; display:inline-flex; align-items:center; gap:4px; white-space:nowrap; }
      .sg2_btn:hover { background:var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.15)); }
      .sg2_btn:disabled { opacity:.45; cursor:default; }
      .sg2_hint { color:var(--dsw-alias-label-tertiary, #888); font-size:11px; line-height:16px; }
      .sg2_listTitle { font-size:12px; color:var(--dsw-alias-label-secondary, inherit); margin-top:4px; }
      .sg2_item { display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:8px; font-size:12px; border:1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.2)); }
      .sg2_item .sg2_name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .sg2_item .sg2_meta { color:var(--dsw-alias-label-tertiary, #888); font-size:11px; flex:none; }
      .sg2_msg { font-size:12px; line-height:18px; }
      .sg2_msg.err { color:var(--dsw-state-error-primary, #d9534f); }
      .sg2_msg.ok { color:var(--dsw-state-success-primary, #4caf50); }
    `;
    const styleId = "dsh-session-group-css";
    if (typeof document !== "undefined" && !document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = css;
      document.head.appendChild(s);
    }

    function SessionGroupCard({ t }) {
      const [workspaces, setWorkspaces] = react.useState(null);
      const [busy, setBusy] = react.useState(false);
      const [msg, setMsg] = react.useState(null);
      const load = () => {
        window.__scFetch("/api/session-conductor/group/list").then((r) => r.json()).then((b) => {
          if (b.ok) setWorkspaces(b.workspaces ?? []);
        }).catch(() => setWorkspaces([]));
      };
      react.useEffect(() => { load(); }, []);
      const createIn = async (workspaceId) => {
        if (busy) return;
        setBusy(true); setMsg(null);
        try {
          const r = await window.__scFetch("/api/session-conductor/group/new-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(workspaceId ? { workspaceId } : {}),
          });
          const b = await r.json();
          if (!b.ok) throw new Error(b.error || ("HTTP " + r.status));
          setMsg({ kind: "ok", text: t("ok") });
          load();
        } catch (e) {
          setMsg({ kind: "err", text: t("fail", { message: (e && e.message) || String(e) }) });
        } finally { setBusy(false); }
      };
      return react_jsx_runtime.jsxs("div", { className: "sg2_card", children: [
        react_jsx_runtime.jsx("div", { className: "sg2_hint", children: t("desc") }),
        react_jsx_runtime.jsxs("div", { className: "sg2_row", children: [
          react_jsx_runtime.jsx("button", { className: "sg2_btn", disabled: busy, onClick: () => createIn(""), children: busy ? t("busy") : t("newDefault") }),
          react_jsx_runtime.jsx("button", { className: "sg2_btn", disabled: busy, onClick: load, children: t("refresh") }),
        ] }),
        react_jsx_runtime.jsx("div", { className: "sg2_listTitle", children: t("listTitle") }),
        !workspaces
          ? react_jsx_runtime.jsx("div", { className: "sg2_hint", children: t("listEmpty") })
          : workspaces.map((w) => react_jsx_runtime.jsxs("div", { className: "sg2_item", key: w.workspaceId, children: [
              react_jsx_runtime.jsx("span", { className: "sg2_name", children: w.title || w.path }),
              react_jsx_runtime.jsx("span", { className: "sg2_meta", children: __SC_TR__("sessionCount", { n: w.sessionIds?.length ?? 0 }) }),
              react_jsx_runtime.jsx("button", { className: "sg2_btn", disabled: busy, onClick: () => createIn(w.workspaceId), children: busy ? t("busy") : t("newIn") }),
            ] })),
        msg && react_jsx_runtime.jsx("div", { className: "sg2_msg " + (msg.kind === "err" ? "err" : "ok"), children: msg.text }),
      ] });
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-session-group: dictionaries");
      ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
        name: "settings.plugin.item",
        key: "session-conductor-group",
        locale: NS,
      }, function WrappedCard(props) {
        const t = ctx.locale.bind(NS);
        return react_jsx_runtime.jsxs("div", { children: [
          react_jsx_runtime.jsx("div", { children: t("title") }),
          react_jsx_runtime.jsx(SessionGroupCard, { t }),
        ] });
      }));
    }

    const inject = ["slots", "locale"];
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});

/**
 * dsh-session-conductor — 「第一条正在处理」队列条目（client 附加模块， 改写）
 *
 * DSH 原生排队逻辑：第一条消息（claimed）立即执行、从 host inbox 移除，因此
 * 原生排队 dock 只显示「后续排队消息」，执行中的第一条不可见。
 * 本模块在原生 dock 区域**上方**渲染一条与原生 QueueDock 同风格的条目：
 * 「⚙️ {第一条消息摘要}」——第一条也显示在排队列表里，回合结束（执行完）自动消失。
 * 排队消息列表仍由原生 dock 负责（不重复渲染）。不改 DSH 原生源码。
 */

window.__ModuleLoader__.load({
  id: "dsh-session-conductor-processing",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let react = require("react");
    let react_jsx_runtime = require("react/jsx-runtime");

    const NS = "sessionConductorProcessing";
    const zh = {};
    const en = {};
    __scFillI18nDict("sessionConductorProcessing", zh, en);

    /** 预览文本上限（字符）：提示条只展示开头一段，避免撑高。 */
    const PREVIEW_MAX_CHARS = 120;
    /** 插槽顺序：排在原生排队 dock（order 20）之前，本条显示在排队列表上方。 */
    const DOCK_ORDER = 19;

    // 样式对齐原生 QueueDock（同容器宽度/圆角/row 高度/字体），保证与原生排队列表视觉连体
    const css = `
      .sm-processing-dock { box-sizing: border-box; width: calc(100% - var(--dsh-composer-side-clearance, 0px) - var(--dsh-composer-side-clearance, 0px) - var(--dsh-composer-dock-inset, 0px) - var(--dsh-composer-dock-inset, 0px)); max-width: calc(var(--dsh-composer-card-max-width, 748px) - var(--dsh-composer-dock-inset, 0px) - var(--dsh-composer-dock-inset, 0px)); margin: 0 auto calc(0px - var(--dsh-composer-stack-gap, 0px) - 3px); padding: 0 var(--dsh-composer-dock-inset, 0px); flex: none; }
      .sm-processing-panel { background: var(--dsw-specific-tip, rgba(128,128,128,.06)); border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.3)); border-bottom: none; border-radius: 12px 12px 0 0; width: 100%; padding: 2px 0; position: relative; }
      .sm-processing-row { box-sizing: border-box; display: flex; align-items: center; gap: 10px; width: 100%; height: 36px; padding: 4px 12px; border-radius: 8px; color: var(--dsw-alias-label-primary-dimmed, #c9c9ce); font-family: Inter, var(--dsw-font-family); font-size: 13px; }
      .sm-processing-spin { display: inline-block; width: 12px; height: 12px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: sm-processing-rotate .8s linear infinite; flex: none; }
      .sm-processing-text { min-width: 0; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
      @keyframes sm-processing-rotate { to { transform: rotate(360deg); } }
    `;
    const styleId = "sm-processing-css";
    if (typeof document !== "undefined" && !document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = css;
      document.head.appendChild(s);
    }

    /** 从会话节点里提取当前回合（正在执行）的用户消息文本。 */
    /** 这些节点类型意味着「已经轮到 AI / 工具」，再往前就不该算「正在执行的用户消息」。 */
    const PROCESSING_STOP_KINDS = new Set(["assistant", "assistant-step", "tool-result", "command"]);

    /** 取一个用户节点的纯文本：优先 text 字段，其次 content 里的 text 块。 */
    function userNodeText(node) {
      if (typeof node?.text === "string") return node.text;
      if (!Array.isArray(node?.content)) return "";
      return node.content.filter((block) => block?.type === "text").map((block) => block.text).join(" ");
    }

    /** 从末尾往前找「当前正在执行的那条用户消息」的文本。 */
    function activeUserText(nodes) {
      if (!Array.isArray(nodes)) return "";
      for (let i = nodes.length - 1; i >= 0; i -= 1) {
        const node = nodes[i];
        if (!node) continue;
        if (PROCESSING_STOP_KINDS.has(node.kind)) break;
        if (node.kind !== "user") continue;
        const text = userNodeText(node);
        if (text) return text;
      }
      return "";
    }

    function ProcessingBar({ useSession, t }) {
      const running = useSession((s) => s.running);
      const nodes = useSession((s) => s.nodes);
      const active = react.useMemo(() => activeUserText(nodes), [running, nodes]);
      // 仅当「第一条消息执行中」时显示（执行完自动消失）；排队消息由原生 dock 展示
      if (!running || !active) return null;
      const preview = active.replace(/\s+/g, " ").trim().slice(0, PREVIEW_MAX_CHARS);
      const label = t("processing") + "：" + preview;
      return react_jsx_runtime.jsx("div", {
        className: "sm-processing-dock",
        children: react_jsx_runtime.jsx("div", {
          className: "sm-processing-panel",
          children: react_jsx_runtime.jsx("div", {
            className: "sm-processing-row",
            title: preview,
            children: [react_jsx_runtime.jsx("span", { className: "sm-processing-spin" }), react_jsx_runtime.jsx("span", { className: "sm-processing-text", children: label })],
          }),
        }),
      });
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "sm-processing: dictionaries");
      ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
        name: "conversation.input.dock",
        id: "sm-processing",
        order: DOCK_ORDER, // 在原生排队 dock（order 20）之前：第一条条目显示在排队列表上方
        locale: NS,
      }, ProcessingBar));
    }

    const inject = ["slots", "locale"];
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});

/**
 * dsh-session-conductor — 压缩模型选择设置卡片
 * 设置 → 插件配置 → 「压缩模型」：会话模型旁单独选压缩用模型（省 pro 成本）。
 * 可选：跟随会话模型（默认）/ 指定便宜模型（agnes 等）。写入 /api/session-conductor/compaction-model。
 */
window.__ModuleLoader__.load({
  id: "dsh-session-conductor-compaction-model",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");
    let react_jsx_runtime = require("react/jsx-runtime");

    const NS = "sessionConductorCompaction";
    const zh = {};
    const en = {};
    __scFillI18nDict("sessionConductorCompaction", zh, en);

    /** 自定义模式下 provider / model 输入框宽度（px）。 */
    const PROVIDER_INPUT_WIDTH = 110;
    const MODEL_INPUT_WIDTH = 160;

    const css = `
      .cm_card { border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.2)); border-radius:10px; padding:12px; margin-top:8px; background:var(--dsw-alias-bg-base,#141518); }
      .cm_hint { color:var(--dsw-alias-label-tertiary,#888); font-size:12px; margin:2px 0 10px; line-height:1.5; }
      .cm_row { display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-wrap:wrap; }
      .cm_input { height:28px; border-radius:6px; border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3)); background:var(--dsw-alias-bg-base,#141518); color:var(--dsw-alias-label-primary,#eee); padding:0 10px; font-size:12.5px; }
      .cm_btn { height:28px; border-radius:6px; border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3)); background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.15)); color:var(--dsw-alias-label-primary,#eee); cursor:pointer; padding:0 14px; font-size:12.5px; }
      .cm_btn:hover { background:rgba(128,128,128,.25); }
      .cm_msg { font-size:12px; margin-top:6px; }
    `;
    const styleId = "sm-compaction-css";
    if (typeof document !== "undefined" && !document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = css;
      document.head.appendChild(s);
    }

    function CompactionModelCard({ t }) {
      const [mode, setMode] = react.useState("follow"); // follow | custom
      const [provider, setProvider] = react.useState("llm-pi-ai");
      const [model, setModel] = react.useState("agnes-2.5-flash");
      const [msg, setMsg] = react.useState(null);
      const [busy, setBusy] = react.useState(false);

      react.useEffect(() => {
        (async () => {
          try {
            const r = await window.__scFetch("/api/session-conductor/compaction-model", { headers: { accept: "application/json" } });
            const payload = await r.json();
            if (payload?.ok && payload.compactionModel) {
              setMode("custom");
              setProvider(payload.compactionModel.provider || "");
              setModel(payload.compactionModel.model || "");
            } else if (payload?.ok) setMode("follow");
          } catch { /* 初始加载失败忽略 */ }
        })();
      }, []);

      const save = async () => {
        setBusy(true); setMsg(null);
        try {
          const body = mode === "follow"
            ? { follow: true }
            : { provider, model };
          const r = await window.__scFetch("/api/session-conductor/compaction-model", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const payload = await r.json();
          setMsg(payload?.ok ? t("saved") : (payload?.error?.message || t("error")));
        } catch { setMsg(t("error")); }
        setBusy(false);
      };

      return react_jsx_runtime.jsxs("div", { className: "cm_card", children: [
        react_jsx_runtime.jsx("div", { className: "cm_hint", children: t("desc") }),
        react_jsx_runtime.jsxs("div", { className: "cm_row", children: [
          react_jsx_runtime.jsx("label", { children: react_jsx_runtime.jsx("input", { type: "radio", name: "cm-mode", checked: mode === "follow", onChange: () => setMode("follow") }) }),
          react_jsx_runtime.jsx("span", { children: t("follow") }),
          react_jsx_runtime.jsx("label", { children: react_jsx_runtime.jsx("input", { type: "radio", name: "cm-mode", checked: mode === "custom", onChange: () => setMode("custom") }) }),
          react_jsx_runtime.jsx("span", { children: t("custom") }),
        ]}),
        mode === "custom" && react_jsx_runtime.jsxs("div", { className: "cm_row", children: [
          react_jsx_runtime.jsx("span", { children: t("provider") }),
          react_jsx_runtime.jsx("input", { className: "cm_input", value: provider, onChange: (e) => setProvider(e.target.value), style: { width: PROVIDER_INPUT_WIDTH } }),
          react_jsx_runtime.jsx("span", { children: t("model") }),
          react_jsx_runtime.jsx("input", { className: "cm_input", value: model, onChange: (e) => setModel(e.target.value), style: { width: MODEL_INPUT_WIDTH } }),
        ]}),
        mode === "follow" && react_jsx_runtime.jsx("div", { className: "cm_hint", children: t("followNote") }),
        react_jsx_runtime.jsxs("div", { className: "cm_row", children: [
          react_jsx_runtime.jsx("button", { className: "cm_btn", disabled: busy, onClick: save, children: t("save") }),
          msg && react_jsx_runtime.jsx("span", { className: "cm_msg", children: msg }),
        ]}),
      ]});
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-session-conductor-compaction-model: dictionaries");
      ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
        name: "settings.plugin.item",
        key: "session-conductor-compaction",
        locale: NS,
      }, function WrappedCard(props) {
        const t = ctx.locale.bind(NS);
        return react_jsx_runtime.jsxs("div", { children: [
          react_jsx_runtime.jsx("div", { children: t("title") }),
          react_jsx_runtime.jsx(CompactionModelCard, { t }),
        ] });
      }));
    }

    const inject = ["slots", "locale"];
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
/**
 * dsh-session-conductor — 「会话管理」设置侧边栏页（ 新增）
 *
 * 注册 settings.section 侧边栏导航（设置左栏出现「会话管理」条目），
 * 点开是完整聚合页——会话管理说明 + 模板注入。
 * UI 组件 scs_* = 页面级。
 */

window.__ModuleLoader__.load({
  id: "dsh-session-conductor-settings",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let react = require("react");
    let react_jsx_runtime = require("react/jsx-runtime");

    const NS = "sessionConductorSettings";
    const zh = {};
    const en = {};
    __scFillI18nDict("sessionConductorSettings", zh, en);

    const css = `
      .scs_page { display:flex; flex-direction:column; gap:16px; }
      .scs_hero { display:flex; flex-direction:column; gap:6px; }
      .scs_title { font-size:20px; font-weight:650; color:var(--dsw-alias-label-primary); }
      .scs_desc { font-size:13px; line-height:1.6; color:var(--dsw-alias-label-tertiary); max-width:72ch; }
      .scs_hint { font-size:11px; line-height:16px; color:var(--dsw-alias-label-tertiary); }
      .scs_card { display:flex; flex-direction:column; gap:12px; padding:16px; border:.5px solid var(--dsw-alias-border-l4); border-radius:16px; background:var(--dsw-alias-bg-layer-3); }
      .scs_cardtitle { font-size:15px; font-weight:600; color:var(--dsw-alias-label-primary); }
      .scs_note { font-size:12px; line-height:1.7; color:var(--dsw-alias-label-secondary); padding:10px 12px; border:1px dashed var(--dsw-alias-border-l2); border-radius:10px; }
    `;
    const styleId = "scs-css";
    if (typeof document !== "undefined" && !document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = css;
      document.head.appendChild(s);
    }



    // ── 设置侧边栏页（settings.section，仿 skill-scoreboard）───────────────
    function ScsPage({ t }) {
      return react_jsx_runtime.jsxs("div", { className: "scs_page", children: [
        react_jsx_runtime.jsxs("div", { className: "scs_hero", children: [
          react_jsx_runtime.jsx("div", { className: "scs_title", children: t("title") }),
          react_jsx_runtime.jsx("div", { className: "scs_desc", children: t("desc") }),
          react_jsx_runtime.jsx("div", { className: "scs_hint", children: t("scopeHint") }),
        ] }),
        react_jsx_runtime.jsxs("div", { className: "scs_note", children: [
          react_jsx_runtime.jsx("b", { children: t("noteTitle") + "：" }),
          t("noteBody"),
        ] }),
      ] });
    }

    function apply(ctx) {
      // 设置页只在主入口 dsh-session-conductor 注册。这里再挂 settings.section
      // 会用 jsx-runtime 把页面打成空白。
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "session-conductor-settings: dictionaries");
    }

    const inject = ["slots", "locale"];
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
