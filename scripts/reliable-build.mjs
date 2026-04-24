import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const nextBin = resolve(root, "node_modules", "next", "dist", "bin", "next");
const preferredNodePaths = [
  "/opt/homebrew/opt/node@22/bin/node",
  "/usr/local/opt/node@22/bin/node",
];
const maxAttempts = 3;
const prodDistDir = resolve(root, ".next.nosync", "prod");

function resolveNodeBin() {
  for (const candidate of preferredNodePaths) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return process.execPath;
}

const nodeBin = resolveNodeBin();

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  rmSync(prodDistDir, { force: true, recursive: true });

  console.log(`Build attempt ${attempt}/${maxAttempts}`);

  const result = spawnSync(nodeBin, [nextBin, "build"], {
    cwd: root,
    stdio: "inherit",
  });

  if (result.status === 0) {
    process.exit(0);
  }
}

process.exit(1);
