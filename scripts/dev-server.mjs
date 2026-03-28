import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const nextBin = resolve(root, "node_modules", "next", "dist", "bin", "next");
const buildScript = resolve(root, "scripts", "reliable-build.mjs");

const build = spawnSync(process.execPath, [buildScript], {
  cwd: root,
  stdio: "inherit",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const start = spawnSync(process.execPath, [nextBin, "start"], {
  cwd: root,
  stdio: "inherit",
});

process.exit(start.status ?? 0);
