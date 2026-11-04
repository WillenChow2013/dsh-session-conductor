// 会话回收站：删除 = 打标记 + 把会话目录搬进隔离区；到期或手动清空才真正删盘。
//
// 【为什么这么设计】删除是不可逆操作，而会话日志动辄几十 MB。把「删除」降级为
// 「在索引里打一个标记 + 把目录挪个位置」，就同时得到三件事：
//   ① 还原是秒级且零风险（文件从没删过，只是搬回去）；
//   ② 误删可撤销（按批次整批还原）；
//   ③ 真正删盘集中在两个可控时机 —— 到期（保留天数可配，默认 7 天）或一键清空。
//
// 【为什么必须搬走（而不只是打标记）】宿主的工作区搜索（<DSH_HOME>/session-query.sqlite）
//   是**扫盘**建索引的：它只认 <DSH_HOME>/sessions 下的会话日志，并且每次搜索都会对账，
//   把「已经不在 sessions 里」的会话的索引行删掉（见 dsh-session-query-sqlite 的 _reconcile）。
//   所以，只要日志还留在 sessions 里，核心搜索就一直能搜到回收站里的会话 ——
//   这就是「删了还能在工作区搜到」的根因。把目录搬出 sessions 根目录后，
//   核心索引下次对账自动清理，文件本身仍在本地，还原时搬回原位即可。
//
// 【落盘】<DSH_HOME>/storages/dsh-session-conductor/index.json 的 trash section，原子写。
//   条目：{ [sessionId]: { deletedAt, batchId, title, cwd, updatedAt, archived,
//                          stashed, stashDir, originDir } }
//   不存在/损坏都按「空回收站」处理，绝不影响列表与删除本身。
// 【隔离区】<DSH_HOME>/storages/dsh-session-conductor/trash-files/<sessionId>/

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import { cfg } from "../core/config.js";
import { getSection, setSection, saveStoreNow } from "../core/index-store.js";
import { findSessionLogById, sessionsRootOf } from "../sessions/events.js";

const TRASH_VERSION = 1;
const DEFAULT_RETENTION_DAYS = 7;
const MAX_RETENTION_DAYS = 365;
const DAY_MS = 24 * 3600 * 1000;

let trashCache = null;

// ---------- 隔离区（把被删会话的目录搬出 sessions 根目录）----------

/** 隔离区目录名（与 index.json 同级的 trash-files/）。 */
const STASH_DIR_NAME = "trash-files";

/** 隔离区根目录：<DSH_HOME>/storages/dsh-session-conductor/trash-files。 */
export function trashFilesRoot() {
  return join(dirname(sessionsRootOf()), "storages", "dsh-session-conductor", STASH_DIR_NAME);
}

/** 会话 id → 隔离区目录名（只保留安全字符）。 */
function safeDirName(sessionId) {
  return String(sessionId).replace(/[^A-Za-z0-9._-]/g, "_");
}

/**
 * 隔离区旁挂的元数据文件：`trash-files/meta/<id>.json`。
 * 记 originDir 是为了「索引里的条目字段丢了（被别的进程覆盖写）也还能搬回去」——
 * 还原是数据安全的关键路径，不能只依赖单一副本的记录。
 */
function stashMetaPath(sessionId) {
  return join(trashFilesRoot(), "meta", `${safeDirName(sessionId)}.json`);
}

function writeStashMeta(sessionId, meta) {
  try {
    const file = stashMetaPath(sessionId);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ sessionId, ...meta, stashedAt: Date.now() }, null, 2), "utf8");
  } catch {
    // 元数据只是兜底：写不了不影响搬运本身
  }
}

function readStashMeta(sessionId) {
  try {
    const parsed = JSON.parse(readFileSync(stashMetaPath(sessionId), "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function removeStashMeta(sessionId) {
  try {
    const file = stashMetaPath(sessionId);
    if (existsSync(file)) rmSync(file, { force: true });
    const dir = dirname(file);
    if (existsSync(dir) && readdirSync(dir).length === 0) rmSync(dir, { recursive: true, force: true });
  } catch {
    // 删不掉就留着：不影响还原语义
  }
}

/** 重命名移动；跨盘（EXDEV）回退为「复制 + 删除」。 */
function moveDirectory(from, to) {
  try {
    renameSync(from, to);
  } catch (error) {
    if (error?.code !== "EXDEV") throw error;
    cpSync(from, to, { recursive: true });
    rmSync(from, { recursive: true, force: true });
  }
}

/** 把 from 的内容并进 to（目标已存在时的兜底），然后删掉 from。 */
function mergeDirectory(from, to) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const src = join(from, name);
    const dest = join(to, name);
    if (existsSync(dest)) continue; // 同名已在原位：保留原位那份
    moveDirectory(src, dest);
  }
  rmSync(from, { recursive: true, force: true });
}

/**
 * 把单个回收站会话的目录搬进隔离区（幂等）。
 * 文件本来就不在盘上时也算成功：没有可搜的东西，不算失败。
 * @returns {boolean} 是否已隔离
 */
export function stashSessionFiles(ctx, sessionId) {
  const trash = loadTrash(ctx);
  const entry = trash.entries[sessionId];
  if (!entry) return false;
  if (entry.stashed === true) return true;
  let src = null;
  try {
    const logPath = findSessionLogById(sessionId, sessionsRootOf());
    if (logPath) src = dirname(logPath);
  } catch {
    src = null;
  }
  if (!src) {
    // 目录已经不在 sessions 里（可能是历史版本真删过）：没东西可搬，不记为失败
    entry.stashed = false;
    delete entry.stashError;
    return true;
  }
  const dest = join(trashFilesRoot(), safeDirName(sessionId));
  try {
    if (existsSync(dest)) {
      mergeDirectory(src, dest); // 搬了一半 / 重复删除：并进隔离区
    } else {
      mkdirSync(dirname(dest), { recursive: true });
      moveDirectory(src, dest);
    }
    // 顺手清掉搬空的 project 目录（会话都搬走了就不留空壳）
    try {
      const projectDir = dirname(src);
      if (readdirSync(projectDir).length === 0) rmSync(projectDir, { recursive: true, force: true });
    } catch {
      // 目录非空或不可读：保留即可
    }
    entry.stashed = true;
    entry.stashDir = dest;
    entry.originDir = src;
    delete entry.stashError;
    writeStashMeta(sessionId, { originDir: src, stashDir: dest });
    return true;
  } catch (error) {
    entry.stashed = false;
    entry.stashError = String(error?.message ?? error);
    return false;
  }
}

/**
 * 把回收站条目的会话目录搬进隔离区（批量、幂等）。
 * 删除时会调一次；**启动时也要调一次** —— 历史版本只打标记不动文件，
 * 升级后第一次启动必须把存量条目补齐，否则它们照样被核心搜索搜到。
 * 运行中的会话跳过（文件可能正在写），下次启动再搬。
 * @param {object} ctx
 * @param {Array<string>} [sessionIds] 指定条目；省略 = 回收站里全部条目
 * @returns {{stashed:string[], skipped:string[], failed:Array<{sessionId:string,reason:string}>}}
 */
export function ensureTrashStash(ctx, sessionIds) {
  const ids = Array.isArray(sessionIds) ? sessionIds : Object.keys(loadTrash(ctx).entries);
  const stashed = [];
  const skipped = [];
  const failed = [];
  const sessions = ctx?.get?.("sessions");
  for (const id of ids) {
    const entry = loadTrash(ctx).entries[id];
    if (!entry) continue;
    if (entry.stashed === true && typeof entry.stashDir === "string" && existsSync(entry.stashDir)) {
      skipped.push(id);
      continue;
    }
    if (sessions?.get?.(id)) {
      skipped.push(id); // 运行中：等下次启动
      continue;
    }
    if (stashSessionFiles(ctx, id)) stashed.push(id);
    else failed.push({ sessionId: id, reason: entry.stashError ?? "unknown" });
  }
  if (stashed.length > 0) saveTrashNow(ctx);
  return { stashed, skipped, failed };
}

/** 把隔离区里的会话目录搬回原位（还原）。搬不回来就保留条目，绝不凭空丢会话。 */
function unstashSessionFiles(entry, sessionId) {
  const canonical = join(trashFilesRoot(), safeDirName(sessionId));
  let stashDir = typeof entry.stashDir === "string" && entry.stashDir !== "" ? entry.stashDir : "";
  let isStashed = entry.stashed === true;
  // 条目字段被覆盖写丢掉时，只要隔离区里还有这个会话的目录，就照常搬回去
  if (!isStashed && existsSync(canonical)) {
    isStashed = true;
    stashDir = canonical;
  }
  if (!isStashed) return { ok: true };
  if (stashDir === "" || !existsSync(stashDir)) {
    // 隔离区里已经没有它（被手工删/搬走）：按「文件不在」处理，条目照常还原
    delete entry.stashed;
    delete entry.stashDir;
    delete entry.originDir;
    removeStashMeta(sessionId);
    return { ok: true };
  }
  // originDir 优先取条目字段，其次取隔离区旁挂的元数据（条目字段可能被覆盖写丢掉）
  let target = typeof entry.originDir === "string" ? entry.originDir : "";
  if (target === "") target = readStashMeta(sessionId)?.originDir ?? "";
  if (target === "") return { ok: false, reason: "unknown-origin" };
  try {
    if (existsSync(target)) mergeDirectory(stashDir, target);
    else {
      mkdirSync(dirname(target), { recursive: true });
      moveDirectory(stashDir, target);
    }
    delete entry.stashed;
    delete entry.stashDir;
    delete entry.originDir;
    removeStashMeta(sessionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: String(error?.message ?? error) };
  }
}

/** 真删（清空/到期）时把隔离区里的目录一并删掉。 */
export function discardStashFor(ctx, sessionId) {
  const entry = loadTrash(ctx).entries?.[sessionId];
  const dirs = new Set([entry?.stashDir, join(trashFilesRoot(), safeDirName(sessionId))]);
  for (const dir of dirs) {
    if (typeof dir !== "string" || dir === "") continue;
    try {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    } catch {
      // 删不掉就留着：不影响「从回收站消失」这件事
    }
  }
  removeStashMeta(sessionId);
}

/** 读回收站（进程内只读一次；索引不可用按空处理）。
 *  落盘统一走 <DSH_HOME>/storages/dsh-session-conductor/index.json 的 trash section。 */
export function loadTrash(ctx) {
  if (trashCache !== null) return trashCache;
  trashCache = { version: TRASH_VERSION, entries: {} };
  try {
    const section = getSection(ctx, "trash");
    if (section?.entries && typeof section.entries === "object") {
      trashCache = { version: TRASH_VERSION, entries: section.entries };
      if (Number.isFinite(section.retentionDays)) trashCache.retentionDays = section.retentionDays;
    }
  } catch {
    // 索引不可用：按空回收站继续
  }
  return trashCache;
}

/** 立即落盘（交给统一索引存储做原子写）。失败只丢内存态，不抛。 */
export function saveTrashNow(ctx) {
  if (trashCache === null) return;
  try {
    setSection(ctx, "trash", {
      entries: trashCache.entries,
      ...(Number.isFinite(trashCache.retentionDays) ? { retentionDays: trashCache.retentionDays } : {}),
    });
    saveStoreNow(ctx);
  } catch {
    // 写盘失败：下次再试，不影响「已标记」的内存态
  }
}

/**
 * 保留天数：**优先取回收站文件里存的值**（面板上改的就是它），
 * 没设置过才回落到配置 trashRetentionDays / 默认 7 天。范围 1~365。
 */
export function retentionDays(ctx) {
  const stored = ctx ? Number(loadTrash(ctx).retentionDays) : NaN;
  if (Number.isFinite(stored) && stored >= 1) return Math.min(MAX_RETENTION_DAYS, Math.round(stored));
  const days = Number(cfg?.trashRetentionDays);
  if (!Number.isFinite(days) || days < 1) return DEFAULT_RETENTION_DAYS;
  return Math.min(MAX_RETENTION_DAYS, Math.round(days));
}

/** 设置保留天数（写回收站文件，立即生效）。 */
export function setRetentionDays(ctx, days) {
  const value = Math.min(MAX_RETENTION_DAYS, Math.max(1, Math.round(Number(days) || DEFAULT_RETENTION_DAYS)));
  const trash = loadTrash(ctx);
  trash.retentionDays = value;
  saveTrashNow(ctx);
  return value;
}

/** 当前被标记删除的会话 id 集合（列表/搜索据此隐藏）。 */
export function trashedIds(ctx) {
  return new Set(Object.keys(loadTrash(ctx).entries));
}

/** 单个会话是否在回收站里。 */
export function isTrashed(ctx, sessionId) {
  return typeof sessionId === "string" && sessionId !== "" && sessionId in loadTrash(ctx).entries;
}

/**
 * 回收站列表（按删除时间倒序），附带到期时间与剩余天数。
 * @returns {Array<{sessionId,title,cwd,updatedAt,archived,deletedAt,batchId,expiresAt,remainingDays}>}
 */
export function listTrash(ctx) {
  const ttl = retentionDays(ctx) * DAY_MS;
  const now = Date.now();
  return Object.entries(loadTrash(ctx).entries)
    .map(([sessionId, entry]) => {
      const deletedAt = typeof entry?.deletedAt === "number" ? entry.deletedAt : 0;
      const expiresAt = deletedAt + ttl;
      return {
        sessionId,
        title: entry?.title ?? null,
        cwd: entry?.cwd ?? null,
        updatedAt: entry?.updatedAt ?? null,
        archived: entry?.archived === true,
        deletedAt,
        batchId: entry?.batchId ?? "",
        expiresAt,
        remainingDays: Math.max(0, Math.ceil((expiresAt - now) / DAY_MS)),
      };
    })
    .sort((a, b) => b.deletedAt - a.deletedAt);
}

/** 生成一个批次号（一次删除操作 = 一个批次，撤销按批次整批还原）。 */
export function newBatchId() {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * 标记删除（本函数只写索引标记，不碰文件；文件搬进隔离区由 ensureTrashStash 负责）。
 * @param {object} ctx
 * @param {Array<string>} sessionIds
 * @param {object} [metaById] 会话快照（title/cwd/updatedAt/archived），用于回收站列表展示
 * @param {string} [batchId] 指定批次（批量删除传同一个）
 * @returns {{batchId:string, marked:string[]}}
 */
export function markDeleted(ctx, sessionIds, metaById = {}, batchId = newBatchId()) {
  const trash = loadTrash(ctx);
  const marked = [];
  const now = Date.now();
  for (const id of Array.isArray(sessionIds) ? sessionIds : []) {
    if (typeof id !== "string" || id === "") continue;
    const meta = metaById?.[id] ?? {};
    trash.entries[id] = {
      deletedAt: now,
      batchId,
      title: meta.title ?? null,
      cwd: meta.cwd ?? null,
      updatedAt: typeof meta.updatedAt === "number" ? meta.updatedAt : null,
      archived: meta.archived === true,
    };
    marked.push(id);
  }
  if (marked.length > 0) saveTrashNow(ctx);
  return { batchId, marked };
}

/**
 * 还原指定会话：先把隔离区里的目录搬回 sessions 原位，再删标记。
 * 搬不回来的条目**留在回收站**（附在 failed 里），不能让会话凭空消失。
 * @returns {{restored:string[], missing:string[], failed:Array<{sessionId:string,reason:string}>}}
 */
export function restoreSessions(ctx, sessionIds) {
  const trash = loadTrash(ctx);
  const restored = [];
  const missing = [];
  const failed = [];
  for (const id of Array.isArray(sessionIds) ? sessionIds : []) {
    if (typeof id !== "string" || id === "") continue;
    const entry = trash.entries[id];
    if (!entry) {
      missing.push(id);
      continue;
    }
    const back = unstashSessionFiles(entry, id);
    if (!back.ok) {
      failed.push({ sessionId: id, reason: back.reason ?? "unstash-failed" });
      continue;
    }
    delete trash.entries[id];
    restored.push(id);
  }
  if (restored.length > 0) saveTrashNow(ctx);
  return { restored, missing, failed };
}

/** 最近一个批次（撤销用）。空回收站返回 null。 */
export function latestBatch(ctx) {
  const entries = Object.entries(loadTrash(ctx).entries);
  if (entries.length === 0) return null;
  let best = null;
  for (const [sessionId, entry] of entries) {
    const at = typeof entry?.deletedAt === "number" ? entry.deletedAt : 0;
    if (best === null || at > best.deletedAt) {
      best = { sessionId, deletedAt: at, batchId: entry?.batchId ?? "" };
    }
  }
  if (best === null) return null;
  const ids = entries.filter(([, e]) => (e?.batchId ?? "") === best.batchId).map(([id]) => id);
  return { batchId: best.batchId, deletedAt: best.deletedAt, ids };
}

/** 已到期（超过保留天数）的会话 id。 */
export function expiredIds(ctx, now = Date.now()) {
  const ttl = retentionDays(ctx) * DAY_MS;
  return Object.entries(loadTrash(ctx).entries)
    .filter(([, entry]) => {
      const at = typeof entry?.deletedAt === "number" ? entry.deletedAt : 0;
      return at > 0 && now - at >= ttl;
    })
    .map(([id]) => id);
}

/** 从回收站移除条目（真删完成后调用；不落盘，由调用方统一保存）。 */
export function forgetTrashed(ctx, sessionIds) {
  const trash = loadTrash(ctx);
  let removed = 0;
  for (const id of Array.isArray(sessionIds) ? sessionIds : []) {
    if (id in trash.entries) { delete trash.entries[id]; removed += 1; }
  }
  return removed;
}

/** 测试钩子：清空内存态。 */
export function resetTrashForTest() {
  trashCache = null;
}
