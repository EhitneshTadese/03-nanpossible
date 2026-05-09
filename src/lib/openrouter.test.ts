import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chatCompletionDetailed } from "./openrouter";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("chatCompletionDetailed", () => {
  const originalFetch = globalThis.fetch;
  const fetchSpy = vi.fn<(input: unknown, init?: unknown) => Promise<Response>>();

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    fetchSpy.mockReset();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.OPENROUTER_API_KEY;
  });

  it("throws when the response status is not ok", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ error: { message: "rate limited" } }, 429),
    );

    await expect(
      chatCompletionDetailed({
        model: "test/model",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow(/rate limited/);
  });

  it("throws when a 200 response carries an error payload (silent failure guard)", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        error: { message: "upstream provider failed", code: 502 },
      }),
    );

    await expect(
      chatCompletionDetailed({
        model: "test/model",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow(/upstream provider failed/);
  });

  it("throws when the response is missing choices[0]", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ choices: [] }));

    await expect(
      chatCompletionDetailed({
        model: "test/model",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow(/missing choices/i);
  });

  it("retries retryable failures and returns content on success", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ error: { message: "temporary" } }, 503))
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [{ message: { content: "hello" } }],
          usage: {
            prompt_tokens: 1,
            completion_tokens: 2,
            total_tokens: 3,
          },
        }),
      );

    const result = await chatCompletionDetailed({
      model: "test/model",
      messages: [{ role: "user", content: "hi" }],
      retries: 1,
      retryDelayMs: 0,
    });

    expect(result.content).toBe("hello");
    expect(result.usage.totalTokens).toBe(3);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("treats invalid JSON in a 200 response as a retryable error and surfaces the raw body", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("not json at all", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      chatCompletionDetailed({
        model: "test/model",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow(/invalid JSON/);
  });
});
