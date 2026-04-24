import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("local Next runtime output dirs", () => {
  it("separates dev and prod dist dirs and clears the correct targets", () => {
    const root = process.cwd();
    const nextConfig = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
    const buildScript = fs.readFileSync(path.join(root, "scripts/reliable-build.mjs"), "utf8");
    const devScript = fs.readFileSync(path.join(root, "scripts/dev-server.mjs"), "utf8");

    expect(nextConfig).toContain('.next.nosync/dev');
    expect(nextConfig).toContain('.next.nosync/prod');
    expect(buildScript).toContain('.next.nosync", "prod');
    expect(buildScript).not.toContain('resolve(root, ".next")');
    expect(devScript).toContain('.next.nosync", "dev');
  });
});
