import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const nextBin = resolve(root, "node_modules", "next", "dist", "bin", "next");
const preferredNodePaths = [
  "/opt/homebrew/opt/node@22/bin/node",
  "/usr/local/opt/node@22/bin/node",
];
const devDistDir = resolve(root, ".next.nosync", "dev");

function resolveNodeBin() {
  for (const candidate of preferredNodePaths) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return process.execPath;
}

const nodeBin = resolveNodeBin();

rmSync(devDistDir, { force: true, recursive: true });

const devServer = spawn(nodeBin, [nextBin, "dev"], {
  cwd: root,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!devServer.killed) {
      devServer.kill(signal);
    }
  });
}

devServer.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
