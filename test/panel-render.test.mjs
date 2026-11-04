// 面板渲染自测：用极简 React（真展开函数组件、真跑 hooks）把 SessionManagerPanel 渲染成元素树，
// 断言标签 UI 在位、可点击、状态真的变化。
// 运行：node test/panel-render.test.mjs
//
// 为什么需要它：纯函数单测证明不了「按钮在不在、点了有没有反应」。DSH GUI 有鉴权（外部浏览器 401，
// 见 台账/DSH接口事实.md §8），所以这里用假 React + 假 __scFetch 在 Node 里把整块面板渲染出来。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = readFileSync(path.join(root, "lib/client.js"), "utf8");
const zhDict = JSON.parse(readFileSync(path.join(root, "lib/i18n/zh.json"), "utf8")).sessionConductor;

// —— 取词：与面板里 t(key, vars) 同形 ——
const t = (key, vars) => {
  const raw = typeof zhDict[key] === "string" ? zhDict[key] : key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, name) => (vars[name] === void 0 ? m : String(vars[name]))) : raw;
};

// —— 极简 React：每个组件实例一套 hook 槽位，脏标记驱动重渲染 ——
const sameDeps = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (!Object.is(a[i], b[i])) return false;
  return true;
};
class Component {
  constructor(propsValue) { this.props = propsValue; this.state = {}; }
  setState() {}
  render() { return null; }
}
const createHost = () => {
  const stores = new Map();
  let current = null;
  let effects = [];
  let dirty = false;
  const api = {
    Component,
    PureComponent: Component,
    Fragment: Symbol("Fragment"),
    createElement: (type, props, ...kids) => ({ type, props: { ...(props ?? {}), children: kids.length ? kids : props?.children } }),
    useState(init) {
      const store = current;
      const i = store.cursor++;
      if (!(i in store.slots)) store.slots[i] = typeof init === "function" ? init() : init;
      const set = (value) => {
        const next = typeof value === "function" ? value(store.slots[i]) : value;
        if (!Object.is(next, store.slots[i])) {
          store.slots[i] = next;
          dirty = true;
        }
      };
      return [store.slots[i], set];
    },
    useRef(init) {
      const store = current;
      const i = store.cursor++;
      if (!(i in store.slots)) store.slots[i] = { current: init };
      return store.slots[i];
    },
    useMemo(fn, deps) {
      const store = current;
      const i = store.cursor++;
      const prev = store.slots[i];
      if (prev && sameDeps(prev.deps, deps)) return prev.value;
      const value = fn();
      store.slots[i] = { value, deps };
      return value;
    },
    useCallback(fn, deps) {
      return api.useMemo(() => fn, deps);
    },
    useEffect(fn, deps) {
      const store = current;
      const i = store.cursor++;
      const prev = store.slots[i];
      if (prev && sameDeps(prev.deps, deps)) return;
      store.slots[i] = { deps };
      effects.push(fn);
    },
  };
  api.useLayoutEffect = api.useEffect;
  return {
    api,
    beginPass() {
      dirty = false;
      effects = [];
      for (const store of stores.values()) store.cursor = 0;
    },
    enter(key) {
      let store = stores.get(key);
      if (!store) { store = { slots: [], cursor: 0 }; stores.set(key, store); }
      store.cursor = 0;
      const previous = current;
      current = store;
      return previous;
    },
    exit(previous) { current = previous; },
    takeEffects() { return effects.splice(0, effects.length); },
    resetStores() { stores.clear(); }, // 模拟「刷新页面重挂面板」：面板只在挂载时读 localStorage
    isDirty: () => dirty,
  };
};
const host = createHost();

// —— jsx 运行时桩：先产元素树，再由 expand 展开函数组件 ——
const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
const jsxRuntime = { jsx, jsxs: jsx, Fragment: Symbol("Fragment") };

// —— 浏览器桩 ——
const mem = new Map();
const storage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => void mem.set(k, String(v)),
  removeItem: (k) => void mem.delete(k),
  clear: () => mem.clear(),
};
const session = {
  id: "session-tag-demo",
  title: "标签演示会话",
  cwd: "E:\\dev\\AI进化",
  updatedAt: Date.now(),
  archived: false,
  running: false,
  live: true,
  autoRename: false,
  autoContinue: false,
  continueRunning: false,
  interruption: null,
  archiveWs: null,
};
const TAGS_KEY = "dsh.plugin.session-conductor.tags.v1";
storage.setItem(TAGS_KEY, JSON.stringify({ v: 1, tags: { [session.id]: ["开发"] } }));

const el = () => ({ style: {}, dataset: {}, appendChild() {}, removeChild() {}, setAttribute() {}, remove() {}, select() {}, textContent: "" });
let captured = null; // 主模块的 module.exports
const sandbox = {
  console,
  localStorage: storage,
  location: { href: "http://127.0.0.1/" },
  navigator: {},
  document: {
    body: el(),
    head: el(),
    createElement: el,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
  },
  setTimeout: () => 0, // 定时器不真跑：本测试只关心同步渲染结果，避免挂住
  clearTimeout: () => {},
  fetch: async () => ({ ok: false, status: 500, json: async () => ({ ok: false }) }),
  __ModuleLoader__: {
    load: ({ id, factory }) => {
      const exports = factory((name) => {
        if (name === "react") return host.api;
        if (name === "react/jsx-runtime") return jsxRuntime;
        throw new Error(`unexpected require: ${name}`);
      });
      if (id === "dsh-session-conductor") captured = exports;
    },
  },
  alert: () => {},
  confirm: () => true,
  TextDecoder,
  TextEncoder,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: "client.js" });

// —— 假接口 ——
const ndjsonLine = JSON.stringify(session) + "\n";
sandbox.window.__scFetch = async (url) => {
  if (typeof url !== "string") return { ok: true, status: 200, json: async () => ({ ok: true }) };
  if (url.includes("/list?fromIndex=true")) {
    return { ok: true, status: 200, json: async () => ({ ok: true, sessions: [session] }) };
  }
  if (url.includes("/list")) {
    let sent = false;
    return {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => {
            if (sent) return { done: true, value: undefined };
            sent = true;
            return { done: false, value: new TextEncoder().encode(ndjsonLine) };
          },
        }),
      },
    };
  }
  if (url.includes("/group/list")) {
    // 「全部会话」按 cwd 的工作区分组；没有匹配工作区时行不进任何桶，所以给一个真工作区
    return { ok: true, status: 200, json: async () => ({ ok: true, workspaces: [{ workspaceId: "ws-ai", title: "AI进化", path: "E:/dev/AI进化" }] }) };
  }
  return { ok: true, status: 200, json: async () => ({ ok: true }) };
};

// —— 取出侧栏入口组件（它内部在 open 时渲染面板） ——
if (!captured?.apply) throw new Error("主模块没有导出 apply —— bundle 结构变了？");
let FooterButton = null;
const noop = new Proxy(() => {}, { get: (target, key) => (key === "then" ? undefined : noop) });
captured.apply(new Proxy({
  slots: {
    inject: (_name, fn) => fn(),
    register: (_def, component) => {
      if (typeof component === "function") FooterButton = component;
      return { def: _def, component };
    },
  },
  get: () => undefined,
}, { get: (target, key) => (key in target ? target[key] : noop) }));
if (typeof FooterButton !== "function") throw new Error("apply 没有注册侧栏入口组件");

// —— 元素树工具 ——
const isEl = (n) => n !== null && typeof n === "object" && "type" in n && "props" in n;
const walk = (node, fn) => {
  if (Array.isArray(node)) { for (const child of node) walk(child, fn); return; }
  if (!isEl(node)) return;
  fn(node);
  const kids = node.props?.children;
  if (kids !== undefined) walk(kids, fn);
};
const textOf = (node) => {
  const out = [];
  const rec = (n) => {
    if (n === null || n === undefined || n === false || n === true) return;
    if (typeof n === "string" || typeof n === "number") { out.push(String(n)); return; }
    if (Array.isArray(n)) { for (const child of n) rec(child); return; }
    if (isEl(n)) rec(n.props?.children);
  };
  rec(node);
  return out.join("");
};
// 取「最具体」的匹配：同文本里最短的那个（避免祖先容器先命中）
const findByText = (tree, want, type) => {
  let best = null;
  let bestLen = Infinity;
  walk(tree, (e) => {
    if (type && e.type !== type) return;
    const text = textOf(e);
    if (text !== want || text.length >= bestLen) return;
    best = e;
    bestLen = text.length;
  });
  return best;
};
// 文本「包含」匹配（筛选 chip 末尾带 ×，合成文本是 "#开发 1×"，所以用包含匹配找它）
const findByTextContaining = (tree, want, type) => {
  let best = null;
  let bestLen = Infinity;
  walk(tree, (e) => {
    if (type && e.type !== type) return;
    const text = textOf(e);
    if (!text.includes(want) || text.length >= bestLen) return;
    best = e;
    bestLen = text.length;
  });
  return best;
};
const click = (node) => {
  if (typeof node?.props?.onClick !== "function") throw new Error("目标没有 onClick");
  return node.props.onClick({ stopPropagation() {}, preventDefault() {}, currentTarget: el(), target: { value: "" } });
};

// —— 展开函数组件（hooks 在展开过程中跑，effect 收集后统一执行）——
let pathSeq = 0;
const expand = (node, key) => {
  if (node === null || node === undefined || node === true || node === false) return node;
  if (typeof node === "string" || typeof node === "number") return node;
  if (Array.isArray(node)) return node.map((child, i) => expand(child, `${key}.${i}`));
  if (!isEl(node)) return node;
  if (typeof node.type === "function") {
    const instanceKey = `${key}|${node.type.name || (pathSeq += 1)}`;
    const previous = host.enter(instanceKey);
    let out;
    try {
      out = node.type(node.props);
    } finally {
      host.exit(previous);
    }
    if (out && typeof out.then === "function") throw new Error("组件返回了 Promise（不支持 Suspense）");
    return expand(out, instanceKey);
  }
  const props = { ...node.props };
  if ("children" in props) props.children = expand(props.children, `${key}.c`);
  return { ...node, props };
};

// —— 渲染驱动：beginPass → 展开 → 跑 effect → 脏了就再来一轮 ——
const settle = async (max = 25) => {
  let tree = null;
  for (let i = 0; i < max; i += 1) {
    host.beginPass();
    tree = expand(jsx(FooterButton, { wide: true, t, onOpenSession: () => {} }), "root");
    const pending = host.takeEffects();
    for (const fn of pending) {
      try {
        await fn();
      } catch (error) {
      }
    }
    // effect 里常见 `useEffect(() => { (async () => {...})(); })`：async 体不随 effect 返回，
    // 所以每次 effect 之后让出一轮宏任务，把在飞的 fetch/setState 全跑完再看是否还要重渲染。
    await new Promise((resolve) => setImmediate(resolve));
    if (pending.length === 0 && !host.isDirty() && i >= 3) break; // 至少跑 4 轮，等异步 effect 的 setState 落地
  }
  return tree;
};

let pass = 0;
const check = async (name, fn) => {
  try {
    await fn();
    pass += 1;
  } catch (cause) {
    console.error(`✗ ${name}`);
    throw cause;
  }
};

// ① 侧栏按钮 → 点开面板 → 会话行出现，并带「＋标签」入口
let tree = await settle();
await check("点侧栏按钮打开面板 + 会话行渲染 + 「＋标签」按钮", async () => {
  const opener = findByText(tree, "会话管理", "button");
  assert.ok(opener, "没找到侧栏「会话管理」按钮");
  click(opener);
  tree = await settle();
  const all = textOf(tree);
  assert.match(all, /标签演示会话/, `会话标题没渲染；实际文本=${JSON.stringify(all.slice(0, 300))}`);
  assert.ok(findByText(tree, "＋标签", "button"), "会话行里没有「＋标签」按钮");
});

// ② 已有标签渲染成徽章（点它 = 按标签筛选）
await check("已有标签渲染成 #开发 徽章且可点", () => {
  const badge = findByText(tree, "#开发", "span");
  assert.ok(badge, "没有渲染 #开发 徽章");
  assert.equal(typeof badge.props.onClick, "function", "徽章不可点击（应能按标签筛选）");
});

// ③ 点徽章 → 进入筛选态，筛选条出现并高亮
await check("点徽章进入筛选，筛选条与批量入口出现", async () => {
  click(findByText(tree, "#开发", "span"));
  tree = await settle();
  const all = textOf(tree);
  assert.ok(all.includes(zhDict["filter.label"]), "筛选条标签名没出现");
  assert.ok(findByTextContaining(tree, "#开发 1", "span"), `筛选条里没有「#开发 1」；实际=${JSON.stringify(all.slice(0, 300))}`);
  assert.ok(findByText(tree, zhDict["tag.clearFilter"], "button"), "筛选态下没有「取消筛选」按钮");
  assert.ok(findByTextContaining(tree, "全选筛选结果 (1)", "button"), "筛选态下没有「全选筛选结果」");
});

// ④ 点「＋标签」→ 浮窗（popover）出现，带输入框与「添加」按钮（不是 window.prompt）
const findTagInput = (root0) => {
  let hit = null;
  walk(root0, (e) => {
    if (!hit && e.type === "input" && typeof e.props?.placeholder === "string" && e.props.placeholder.includes("输入标签")) hit = e;
  });
  return hit;
};
await check("「＋标签」打开标签浮窗", async () => {
  click(findByText(tree, "＋标签", "button"));
  tree = await settle();
  assert.ok(findTagInput(tree), "没有出现标签输入框");
  assert.ok(findByText(tree, "添加", "button"), "浮窗里没有「添加」按钮");
});

// ⑤ 输入并添加 → 徽章出现 + localStorage 落盘
await check("输入标签并添加后渲染徽章且落盘", async () => {
  findTagInput(tree).props.onChange({ target: { value: "教学" } });
  tree = await settle();
  click(findByText(tree, "添加", "button"));
  tree = await settle();
  assert.match(textOf(tree), /#教学/, "新增的 #教学 没渲染出来");
  const saved = JSON.parse(storage.getItem(TAGS_KEY));
  assert.equal(JSON.stringify(saved.tags[session.id]), JSON.stringify(["开发", "教学"]), "标签没有写进 localStorage");
});

// ⑥ 卡片「⋯」菜单：低频操作（置为不活跃 / 归档）收进菜单，按钮行不再平铺
const findMoreButton = (root0) => {
  let hit = null;
  walk(root0, (e) => {
    if (!hit && e.type === "button" && e.props?.title === zhDict["row.more"]) hit = e;
  });
  return hit;
};
await check("卡片「⋯」菜单收纳低频操作", async () => {
  assert.ok(!findByText(tree, zhDict["action.archive"], "button"), "「归档」不应再平铺在按钮行里");
  const more = findMoreButton(tree);
  assert.ok(more, "卡片上没有「更多操作」按钮");
  click(more);
  tree = await settle();
  assert.ok(findByText(tree, zhDict["action.release"], "button"), "菜单里没有「置为不活跃」");
  assert.ok(findByText(tree, zhDict["action.archive"], "button"), "菜单里没有「归档」");
  click(findMoreButton(tree));
  tree = await settle();
  assert.ok(!findByText(tree, zhDict["action.archive"], "button"), "再次点击后菜单没有收起");
});

// ⑦ 批量：全选筛选结果 → 出现批量打标签 / 归档勾选
await check("全选筛选结果后出现批量操作", async () => {
  click(findByTextContaining(tree, "全选筛选结果 (1)", "button"));
  tree = await settle();
  const all = textOf(tree);
  assert.ok(all.includes("批量打标签 (1)"), "勾选后没有「批量打标签」");
  assert.ok(all.includes("归档勾选 (1)"), "勾选后没有「归档勾选」");
  assert.ok(all.includes("清空勾选"), "勾选后没有「清空勾选」");
});

// ⑦ 标签筛选无结果 → 专门的空态文案（而不是「还没有会话」）
// 做法：往 localStorage 塞一个「没有任何会话挂着」的标签，然后重挂面板（面板只在挂载时读存储），
// 点这个标签 → 列表为空 → 应显示 tag.emptyFiltered。
await check("筛选无结果时显示标签专属空态", async () => {
  const T = sandbox.window.__SC_TAGS__;
  T.save({ ...T.load(), "another-session": ["无关标签"] });
  host.resetStores();
  tree = await settle();
  click(findByText(tree, "会话管理", "button"));
  tree = await settle();
  const chip = findByTextContaining(tree, "#无关标签 1", "span");
  assert.ok(chip, `重挂后「#无关标签 1」没进筛选条；实际文本=${JSON.stringify(textOf(tree).slice(0, 300))}`);
  click(chip);
  tree = await settle();
  const empty = zhDict["tag.emptyFiltered"];
  assert.ok(textOf(tree).includes(empty), `没有出现标签专属空态「${empty}」`);
});

// ⑧ 删除语义拆分：卡片「删除」= 立即清盘（/delete-permanent）；「移入回收站」收在「⋯」菜单里
await check("卡片「删除」走永久删除，「移入回收站」收在「⋯」菜单", async () => {
  host.resetStores();
  tree = await settle();
  click(findByText(tree, "会话管理", "button"));
  tree = await settle();

  const calls = [];
  const prevFetch = sandbox.window.__scFetch;
  sandbox.window.__scFetch = async (url, init) => {
    if (typeof url === "string") calls.push({ url, body: init?.body });
    return prevFetch(url, init);
  };
  try {
    click(findMoreButton(tree));
    tree = await settle();
    const trashItem = findByText(tree, zhDict["action.trash"], "button");
    assert.ok(trashItem, "「⋯」菜单里没有「移入回收站」");
    click(findMoreButton(tree));
    tree = await settle();
    assert.ok(!findByText(tree, zhDict["action.trash"], "button"), "「⋯」菜单没有收起");

    const delButton = findByText(tree, zhDict["action.delete"], "button");
    assert.ok(delButton, "卡片上没有「删除」按钮");
    click(delButton);
    tree = await settle();
    const permanent = calls.filter((c) => c.url.includes("/delete-permanent"));
    assert.equal(permanent.length, 1, `点「删除」应请求 /delete-permanent；实际=${JSON.stringify(calls.map((c) => c.url))}`);
    assert.match(String(permanent[0].body), /"sessionId"/, "永久删除请求体里没有 sessionId");
    assert.ok(!calls.some((c) => /\/delete-batch|\/delete$/.test(c.url)), "点「删除」不应走回收站链路");
  } finally {
    sandbox.window.__scFetch = prevFetch;
  }
});

console.log(`✅ 面板渲染自测通过：${pass} 项`);