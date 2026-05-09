import { existsSync } from "node:fs";
import net from "node:net";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = process.cwd();
const nextBin = resolve(root, "node_modules", "next", "dist", "bin", "next");
const buildScript = resolve(root, "scripts", "reliable-build.mjs");
const preferredNodePaths = [
  "/opt/homebrew/opt/node@22/bin/node",
  "/usr/local/opt/node@22/bin/node",
];

const tenant = process.env.SMOKE_TENANT ?? "mexico";
const mixedPageSlug = process.env.SMOKE_MIXED_PAGE_SLUG ?? "about";
const builderPageSlug = process.env.SMOKE_BUILDER_PAGE_SLUG ?? "team";

function resolveNodeBin() {
  for (const candidate of preferredNodePaths) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return process.execPath;
}

function delay(milliseconds) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

function resolvePort() {
  const explicitPort = process.env.SMOKE_PORT;

  if (explicitPort) {
    return Promise.resolve(Number.parseInt(explicitPort, 10));
  }

  return new Promise((resolvePromise, rejectPromise) => {
    const server = net.createServer();

    server.on("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close(() => rejectPromise(new Error("could not resolve a free port")));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          rejectPromise(error);
          return;
        }

        resolvePromise(port);
      });
    });
  });
}

async function fetchText(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
  });

  return {
    status: response.status,
    text: await response.text(),
  };
}

function extractVisibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function waitForServer(baseUrl, childProcess) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (childProcess.exitCode != null) {
      throw new Error(`start failed with exit code ${childProcess.exitCode}`);
    }

    try {
      const response = await fetch(`${baseUrl}/sites/${tenant}`, {
        signal: AbortSignal.timeout(2500),
      });

      if (response.status < 500) {
        return;
      }
    } catch {
      // keep polling until ready
    }

    await delay(500);
  }

  throw new Error(`server did not become ready at ${baseUrl}`);
}

function assertIncludes(haystack, needle, context) {
  if (!haystack.includes(needle)) {
    throw new Error(`Expected ${context} to include ${needle}`);
  }
}

function assertExcludes(haystack, needle, context) {
  if (haystack.includes(needle)) {
    throw new Error(`Expected ${context} to exclude ${needle}`);
  }
}

function runBuild(nodeBin) {
  const result = spawnSync(nodeBin, [buildScript], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`build failed with exit code ${result.status ?? "unknown"}`);
  }
}

async function main() {
  const nodeBin = resolveNodeBin();
  const port = await resolvePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`[smoke] building app for ${tenant}`);
  runBuild(nodeBin);

  console.log(`[smoke] starting app on ${baseUrl}`);
  const server = spawn(nodeBin, [nextBin, "start", "-p", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: ["ignore", "inherit", "inherit"],
  });

  try {
    await waitForServer(baseUrl, server);

    const home = await fetchText(`${baseUrl}/sites/${tenant}`);
    if (home.status !== 200) {
      throw new Error(`Expected /sites/${tenant} to return 200, got ${home.status}`);
    }
    const homeText = extractVisibleText(home.text);
    assertIncludes(homeText, tenant[0].toUpperCase() + tenant.slice(1), "tenant home page");
    assertIncludes(homeText, "About this chapter", "tenant home page");
    assertExcludes(homeText, "This WIAL page is not available", "tenant home page");

    const mixed = await fetchText(`${baseUrl}/sites/${tenant}/${mixedPageSlug}`);
    if (mixed.status !== 200) {
      throw new Error(
        `Expected /sites/${tenant}/${mixedPageSlug} to return 200, got ${mixed.status}`,
      );
    }
    assertExcludes(mixed.text, 'data-builder-page=""', "mixed-state legacy fallback page");
    assertExcludes(
      extractVisibleText(mixed.text),
      "This WIAL page is not available",
      "mixed-state legacy fallback page",
    );

    const builder = await fetchText(`${baseUrl}/sites/${tenant}/${builderPageSlug}`);
    if (builder.status !== 200) {
      throw new Error(
        `Expected /sites/${tenant}/${builderPageSlug} to return 200, got ${builder.status}`,
      );
    }
    assertIncludes(builder.text, 'data-builder-page=""', "published builder page");

    console.log(
      `[smoke] verified /sites/${tenant}, /sites/${tenant}/${mixedPageSlug}, and /sites/${tenant}/${builderPageSlug}`,
    );
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(`[smoke] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
