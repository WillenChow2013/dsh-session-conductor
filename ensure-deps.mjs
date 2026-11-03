/**
 * Recreate the dependency junctions this fork needs.
 *
 * Why this exists: the plugin is installed with `link:` (a junction from the
 * profile's node_modules into this repository). Node resolves ESM imports
 * against the *real* path, so the host half would otherwise look for
 * `@deepseek-ai/schemastery`, `zod`, `@deepseek-ai/dsh-llm`, … under
 * D:\dsh-home\plugins and find nothing — the plugin then fails to load with no
 * client-side error at all (the symptom: the「会话管理」entry disappears).
 *
 * Nothing here is published: `node_modules/` is local plumbing, recreate it
 * after moving the checkout or reinstalling the app.
 *
 * Usage:  node ensure-deps.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FORK = path.dirname(fileURLToPath(import.meta.url));
const LOCAL = path.join(FORK, "node_modules");

/** Searched in order; the first hit wins. */
const SOURCES = [
  process.env.DSH_PROFILE_NODE_MODULES ??
    "D:\\dsh-home\\profiles\\desktop\\node_modules",
  // Fallback for packages that only ship inside the installed app
  // (extract with: npx asar extract app.asar D:\dsh-asar-extract\dsh).
  process.env.DSH_APP_NODE_MODULES ??
    "D:\\dsh-asar-extract\\dsh\\node_modules",
];

const REQUIRED = [
  "@deepseek-ai/schemastery",
  "zod",
  "@deepseek-ai/dsh-llm",
  "@deepseek-ai/dsh-session",
  "@deepseek-ai/dsh-session-title",
  "@deepseek-ai/dsh-storage-domain",
];

let failed = 0;
for (const spec of REQUIRED) {
  const dest = path.join(LOCAL, spec);
  if (existsSync(dest)) {
    console.log(`ok       ${spec}`);
    continue;
  }
  const src = SOURCES.map((root) => path.join(root, spec)).find(existsSync);
  if (src === undefined) {
    console.error(`MISSING  ${spec} — not found in any source root`);
    failed += 1;
    continue;
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  execFileSync("cmd", ["/c", "mklink", "/J", dest, src], { stdio: "ignore" });
  console.log(`linked   ${spec} -> ${src}`);
}

process.exitCode = failed === 0 ? 0 : 1;
