import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendResendEmail } from "./resend";

const originalEnv = { ...process.env };

afterEach(async () => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendResendEmail", () => {
  it("captures emails to the dev outbox when the API key is missing", async () => {
    const directory = await mkdtemp(join(tmpdir(), "resend-outbox-"));
    const outboxPath = join(directory, "emails.json");
    process.env.RESEND_API_KEY = "";
    process.env.RESEND_FROM = "WIAL <onboarding@resend.dev>";
    process.env.DEV_EMAIL_OUTBOX_PATH = outboxPath;

    const result = await sendResendEmail({
      to: ["lead@example.com"],
      subject: "Chapter ready",
      text: "Hello from local dev.",
    });

    expect(result).toMatchObject({
      delivered: true,
      mode: "dev-outbox",
      outboxPath,
    });

    const entries = JSON.parse(await readFile(outboxPath, "utf8")) as Array<{
      reason: string;
      subject: string;
      to: string[];
    }>;

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      reason: "missing-api-key",
      subject: "Chapter ready",
      to: ["lead@example.com"],
    });

    await rm(directory, { force: true, recursive: true });
  });

  it("captures provider failures to the dev outbox in local development", async () => {
    const directory = await mkdtemp(join(tmpdir(), "resend-provider-"));
    const outboxPath = join(directory, "emails.json");
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM = "WIAL <onboarding@resend.dev>";
    process.env.DEV_EMAIL_OUTBOX_PATH = outboxPath;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Sender not allowed", { status: 403 })),
    );

    const result = await sendResendEmail({
      to: ["lead@example.com"],
      subject: "Chapter ready",
      text: "Hello from local dev.",
    });

    expect(result).toMatchObject({
      delivered: true,
      mode: "dev-outbox",
      outboxPath,
    });

    const entries = JSON.parse(await readFile(outboxPath, "utf8")) as Array<{
      reason: string;
    }>;

    expect(entries).toHaveLength(1);
    expect(entries[0]?.reason).toBe("provider-failed");

    await rm(directory, { force: true, recursive: true });
  });

  it("returns a real failure in production when the provider rejects the send", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
    };
    process.env.RESEND_API_KEY = "re_test_key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Sender not allowed", { status: 403 })),
    );

    const result = await sendResendEmail({
      to: ["lead@example.com"],
      subject: "Chapter ready",
      text: "Hello from production.",
    });

    expect(result).toMatchObject({
      delivered: false,
      error: "provider-failed",
      providerMessage: "Sender not allowed",
    });
  });
});
