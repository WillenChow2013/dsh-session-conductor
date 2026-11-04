// 统一测试入口：顺序跑各专项测试，任一失败即以该退出码结束。
// 用法：node test/run-all.mjs（npm test 也指向这里）
import { spawnSync } from "node:child_process";

const files = ["test/tags.test.mjs", "test/panel-render.test.mjs"];
for (const file of files) {
  const result = spawnSync(process.execPath, [file], { stdio: "inherit" });
  if (result.error) {
    console.error(`✗ ${file} 无法启动：${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`✗ ${file} 失败（exit ${result.status}）`);
    process.exit(result.status ?? 1);
  }
}
console.log("✅ 全部测试通过");
