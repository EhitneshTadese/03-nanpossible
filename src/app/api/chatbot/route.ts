import { NextRequest, NextResponse } from "next/server";
import { chatCompletionDetailed } from "@/lib/openrouter";
import {
  buildFallbackAssistantReply,
  buildSiteAssistantContext,
  type SiteChatMessage,
} from "@/lib/site-chatbot";

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_CHATBOT_MODEL = "openai/gpt-4o-mini";
const requestCounters = new Map<string, { count: number; resetAt: number }>();

function getIpAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function assertRateLimit(ip: string) {
  const now = Date.now();
  const current = requestCounters.get(ip);

  if (!current || current.resetAt < now) {
    requestCounters.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (current.count >= 20) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  current.count += 1;
}

function normalizeMessages(value: unknown): SiteChatMessage[] {
  if (!Array.isArray(value)) {
    return [] satisfies SiteChatMessage[];
  }

  return value
    .filter(
      (item): item is { role: string; content: string } =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as { role?: unknown }).role === "string" &&
        typeof (item as { content?: unknown }).content === "string",
    )
    .map(
      (item): SiteChatMessage => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: item.content.trim().slice(0, 1500),
      }),
    )
    .filter((item) => item.content.length > 0)
    .slice(-8);
}

export async function POST(request: NextRequest) {
  try {
    assertRateLimit(getIpAddress(request));
  } catch {
    return NextResponse.json(
      { error: "Too many assistant requests. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { messages?: unknown }
    | null;
  const messages = normalizeMessages(body?.messages);
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

  if (!lastUserMessage) {
    return NextResponse.json(
      { error: "Ask a certification question to start the conversation." },
      { status: 400 },
    );
  }

  const fallbackReply = buildFallbackAssistantReply(lastUserMessage.content);

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({
      reply: fallbackReply,
      fallback: true,
      model: null,
    });
  }

  try {
    const result = await chatCompletionDetailed({
      model:
        process.env.OPENROUTER_CHATBOT_MODEL?.trim() || DEFAULT_CHATBOT_MODEL,
      maxTokens: 420,
      temperature: 0.2,
      timeoutMs: 5000,
      messages: [
        {
          role: "system",
          content: [
            "You are the WIAL site assistant.",
            "Answer questions about WIAL certification, recertification, application forms, LMS access, Credly badges, public resources, and general WIAL context.",
            "Use only the provided context. If the answer is not in the context, say so and direct the user to /contact or info@wial.org.",
            "Keep answers concise and practical.",
            "When a form, packet, or LMS link is relevant, include the direct URL from the context.",
            "Never invent requirements, fees, deadlines, or policies.",
            "",
            buildSiteAssistantContext(),
          ].join("\n"),
        },
        ...messages,
      ],
    });

    return NextResponse.json({
      reply: result.content || fallbackReply,
      fallback: false,
      model: result.model,
      usage: result.usage,
    });
  } catch {
    return NextResponse.json({
      reply: fallbackReply,
      fallback: true,
      model: null,
    });
  }
}
