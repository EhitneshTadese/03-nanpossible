import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const nextBin = resolve(root, "node_modules", "next", "dist", "bin", "next");

rmSync(resolve(root, ".next"), { force: true, recursive: true });

const devServer = spawn(process.execPath, [nextBin, "dev", "--webpack"], {
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
