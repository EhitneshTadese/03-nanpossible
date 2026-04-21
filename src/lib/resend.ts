import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type SendEmailInput = {
  subject: string;
  text: string;
  to: string[];
};

type SendEmailResult =
  | {
      delivered: true;
      mode: "resend";
    }
  | {
      delivered: true;
      mode: "dev-outbox";
      outboxPath: string;
    }
  | {
      delivered: false;
      error: "missing-api-key" | "provider-failed";
      providerMessage?: string;
    };

type DevOutboxEntry = {
  capturedAt: string;
  from: string;
  reason: "missing-api-key" | "provider-failed";
  subject: string;
  text: string;
  to: string[];
};

function getDefaultDevOutboxPath() {
  return resolve(process.cwd(), "data", "dev-email-outbox.json");
}

function shouldUseDevOutboxFallback() {
  return process.env.NODE_ENV !== "production";
}

async function appendToDevOutbox(entry: DevOutboxEntry) {
  const outboxPath = process.env.DEV_EMAIL_OUTBOX_PATH?.trim() || getDefaultDevOutboxPath();
  await mkdir(dirname(outboxPath), { recursive: true });

  let existing: DevOutboxEntry[] = [];

  try {
    const raw = await readFile(outboxPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    existing = Array.isArray(parsed) ? (parsed as DevOutboxEntry[]) : [];
  } catch {
    existing = [];
  }

  existing.push(entry);
  await writeFile(outboxPath, JSON.stringify(existing, null, 2));
  return outboxPath;
}

export function getResendFromAddress() {
  return process.env.RESEND_FROM?.trim() || "WIAL <onboarding@resend.dev>";
}

export async function sendResendEmail({
  subject,
  text,
  to,
}: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = getResendFromAddress();

  if (!apiKey) {
    if (!shouldUseDevOutboxFallback()) {
      return {
        delivered: false,
        error: "missing-api-key",
      };
    }

    const outboxPath = await appendToDevOutbox({
      capturedAt: new Date().toISOString(),
      from,
      reason: "missing-api-key",
      subject,
      text,
      to,
    });

    return {
      delivered: true,
      mode: "dev-outbox",
      outboxPath,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
    }),
  });

  if (response.ok) {
    return {
      delivered: true,
      mode: "resend",
    };
  }

  const providerMessage = (await response.text().catch(() => "")).trim();

  if (!shouldUseDevOutboxFallback()) {
    return {
      delivered: false,
      error: "provider-failed",
      providerMessage,
    };
  }

  const outboxPath = await appendToDevOutbox({
    capturedAt: new Date().toISOString(),
    from,
    reason: "provider-failed",
    subject,
    text,
    to,
  });

  return {
    delivered: true,
    mode: "dev-outbox",
    outboxPath,
  };
}
