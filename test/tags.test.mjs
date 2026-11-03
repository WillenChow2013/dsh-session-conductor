// 会话标签自测：直接加载 lib/client.js，取 window.__SC_TAGS__ 断言纯函数。
// 运行：node test/tags.test.mjs
// 为什么这样测：client.js 是预构建 bundle，没有可重建的源码；标签逻辑全在顶层 IIFE 里，
// 用一个最小浏览器桩把 bundle 执行一遍，就能在不打开界面的情况下覆盖全部判定分支。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = readFileSync(path.join(root, "lib/client.js"), "utf8");

// —— 最小浏览器桩 ——
const mem = new Map();
const storage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => void mem.set(k, String(v)),
  removeItem: (k) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};
const sandbox = {
  console,
  localStorage: storage,
  location: { href: "http://127.0.0.1/" },
  document: {
    body: { appendChild() {} },
    createElement: () => ({ style: {}, appendChild() {}, select() {}, remove() {}, set textContent(v) { this._t = v; }, get textContent() { return this._t ?? ""; } }),
  },
  navigator: {},
  setTimeout,
  clearTimeout,
  fetch: async () => ({ ok: false, status: 500, json: async () => ({ ok: false }), body: null }),
  __ModuleLoader__: { load: () => {} },
  alert: () => {},
  confirm: () => true,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: "client.js" });

const T = sandbox.window.__SC_TAGS__;
if (!T) throw new Error("window.__SC_TAGS__ 没有挂载 —— bundle 顶层或 IIFE 执行失败");

// vm 里造的对象原型不同，deepStrictEqual 会因原型不一致失败 —— 统一用 JSON 文本比较
const eq = (actual, expected, msg) => assert.equal(JSON.stringify(actual), JSON.stringify(expected), msg);
let pass = 0;
const check = (name, fn) => {
  try {
    fn();
    pass += 1;
  } catch (cause) {
    console.error(`✗ ${name}`);
    throw cause;
  }
};

// —— 归一化 ——
check("normalizeTag 去 # / 去空白 / 去分隔符", () => {
  assert.equal(T.normalizeTag("#开发"), "开发");
  assert.equal(T.normalizeTag("  教学 "), "教学");
  assert.equal(T.normalizeTag("a,b，c、d;e"), "abcde");
  assert.equal(T.normalizeTag(null), "");
  assert.equal(T.normalizeTag("一二三四五六七八九十十一十二十三").length, T.MAX_LEN);
});

// —— 存储解析 ——
check("parseStore 坏数据当空", () => {
  eq(T.parseStore(""), {});
  eq(T.parseStore("not json"), {});
  eq(T.parseStore("null"), {});
  eq(T.parseStore('{"v":1,"tags":null}'), {});
});

check("parseStore 归一化 + 去重 + 截断", () => {
  const got = T.parseStore(
    JSON.stringify({ v: 1, tags: { s1: ["#开发", "开发", "教学", "", "a", "b", "c", "d", "e"] } }),
  );
  eq(got.s1, ["开发", "教学", "a", "b", "c", "d"]);
  assert.equal(got.s1.length, T.MAX_PER_SESSION);
});

check("parseStore 兼容无 v 包裹的旧形状", () => {
  eq(T.parseStore(JSON.stringify({ s9: ["x"] })), { s9: ["x"] });
});

check("serialize/parse 往返一致", () => {
  const tags = { a: ["开发"], b: ["教学", "杂事"] };
  eq(T.parseStore(T.serializeStore(tags)), tags);
});

// —— 增删 ——
check("addTagTo 正常新增", () => {
  const r = T.addTagTo({}, "s1", "#开发");
  assert.equal(r.error, null);
  assert.equal(r.added, true);
  eq(r.tags, { s1: ["开发"] });
});

check("addTagTo 重复不重复加", () => {
  const base = { s1: ["开发"] };
  const r = T.addTagTo(base, "s1", "开发");
  assert.equal(r.error, null);
  assert.equal(r.added, false);
  assert.equal(r.tags, base);
});

check("addTagTo 空标签报 empty", () => {
  assert.equal(T.addTagTo({}, "s1", "   ").error, "empty");
});

check("addTagTo 单会话上限", () => {
  let tags = {};
  for (let i = 0; i < T.MAX_PER_SESSION; i += 1) {
    const r = T.addTagTo(tags, "s1", `t${i}`);
    tags = r.tags;
    assert.equal(r.error, null);
  }
  assert.equal(T.addTagTo(tags, "s1", "one-more").error, "too-many-per-session");
});

check("addTagTo 全局上限", () => {
  const tags = {};
  for (let i = 0; i < T.MAX_TAGS; i += 1) T.addTagTo(tags, `s${i}`, `t${i}`);
  // 每个会话各一个标签，用完全局额度后再出现新标签名就该拒绝
  let acc = {};
  for (let i = 0; i < T.MAX_TAGS; i += 1) acc = T.addTagTo(acc, `s${i}`, `t${i}`).tags;
  assert.equal(T.addTagTo(acc, "sX", "brand-new").error, "too-many-tags");
  // 但复用已有标签名仍然允许
  assert.equal(T.addTagTo(acc, "sX", "t0").error, null);
});

check("removeTagFrom 删空即删键", () => {
  eq(T.removeTagFrom({ s1: ["开发"] }, "s1", "开发"), {});
  eq(T.removeTagFrom({ s1: ["开发", "教学"] }, "s1", "开发"), { s1: ["教学"] });
  eq(T.removeTagFrom({}, "nope", "x"), {});
});

// —— 筛选 ——
check("matchesTagFilter 空筛选全放行", () => {
  assert.equal(T.matchesTagFilter({}, "s1", []), true);
  assert.equal(T.matchesTagFilter({}, "s1", null), true);
});

check("matchesTagFilter OR 语义", () => {
  const tags = { s1: ["开发"], s2: ["教学"], s3: [] };
  assert.equal(T.matchesTagFilter(tags, "s1", ["开发"]), true);
  assert.equal(T.matchesTagFilter(tags, "s1", ["教学", "开发"]), true);
  assert.equal(T.matchesTagFilter(tags, "s1", ["杂事"]), false);
  assert.equal(T.matchesTagFilter(tags, "s3", ["开发"]), false);
  assert.equal(T.matchesTagFilter(tags, "unknown", ["开发"]), false);
});

// —— 统计 ——
check("knownTags 按用量降序", () => {
  const got = T.knownTags({ a: ["开发"], b: ["开发"], c: ["教学"] });
  eq(got, [
    { tag: "开发", n: 2 },
    { tag: "教学", n: 1 },
  ]);
});

// —— 持久化 ——
check("save/load 往返", () => {
  storage.clear();
  eq(T.load(), {});
  assert.equal(T.save({ s1: ["开发"] }), true);
  eq(T.load(), { s1: ["开发"] });
  assert.equal(storage.getItem(T.KEY), '{"v":1,"tags":{"s1":["开发"]}}');
  assert.ok(T.KEY.includes("session-conductor"));
});

// —— i18n ——
check("中英 i18n 的 tag.* 键齐全且对齐", () => {
  const zh = JSON.parse(readFileSync(path.join(root, "lib/i18n/zh.json"), "utf8")).sessionConductor;
  const en = JSON.parse(readFileSync(path.join(root, "lib/i18n/en.json"), "utf8")).sessionConductor;
  const used = [
    "tag.open", "tag.openTitle", "tag.placeholder", "tag.add", "tag.cancel", "tag.hint",
    "tag.batchHint", "tag.filterLabel", "tag.filterHint", "tag.clearFilter", "tag.emptyFiltered",
    "tag.selectFiltered", "tag.batchOpen", "tag.archiveSelected", "tag.archiveBusy",
    "tag.clearSelection", "tag.confirmArchive", "tag.archivePartial",
    "tag.errPerSession", "tag.errTooMany", "tag.errEmpty",
  ];
  for (const key of used) {
    assert.equal(typeof zh[key], "string", `zh 缺 ${key}`);
    assert.equal(typeof en[key], "string", `en 缺 ${key}`);
  }
});

// 面板里出现过的 t("…") 键是否都在字典里（防手写键名打错导致界面显示原始 key）
check("client.js 里用到的 tag.* 键都存在", () => {
  const zh = JSON.parse(readFileSync(path.join(root, "lib/i18n/zh.json"), "utf8")).sessionConductor;
  const keys = new Set([...src.matchAll(/t\("(tag\.[A-Za-z]+)"/g)].map((m) => m[1]));
  keys.add("tag.openTitle"); // 走 title: t(...) 形式，正则只扫到 t("…")，显式补上
  for (const key of keys) assert.equal(typeof zh[key], "string", `client.js 用了但 zh 缺 ${key}`);
});

console.log(`✅ 会话标签自测通过：${pass} 项`);
