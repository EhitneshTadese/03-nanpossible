import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const nextBin = resolve(root, "node_modules", "next", "dist", "bin", "next");
const maxAttempts = 3;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  rmSync(resolve(root, ".next"), { force: true, recursive: true });

  console.log(`Build attempt ${attempt}/${maxAttempts}`);

  const result = spawnSync(process.execPath, [nextBin, "build"], {
    cwd: root,
    stdio: "inherit",
  });

  if (result.status === 0) {
    process.exit(0);
  }
}

process.exit(1);
