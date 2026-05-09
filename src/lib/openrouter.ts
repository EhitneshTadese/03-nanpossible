type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionOptions = {
  model: string;
  messages: ChatCompletionMessage[];
  responseFormat?: "json";
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    code?: number;
    message?: string;
    metadata?: {
      provider_name?: string;
      raw?: unknown;
    };
  };
};

type ChatCompletionResult = {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
};

type OpenRouterRequestError = Error & {
  isRetryable?: boolean;
  isTimeout?: boolean;
  statusCode?: number;
};

function getTextContent(
  content: string | Array<{ type?: string; text?: string }> | undefined,
) {
  if (typeof content === "string") {
    return content;
  }

  return (
    content
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function formatOpenRouterError(payload: OpenRouterChatResponse) {
  const message = payload.error?.message ?? "OpenRouter chat completion failed";
  const code =
    typeof payload.error?.code === "number" ? String(payload.error.code) : null;
  const providerName =
    typeof payload.error?.metadata?.provider_name === "string"
      ? payload.error.metadata.provider_name
      : null;
  const raw = payload.error?.metadata?.raw;
  const rawText =
    typeof raw === "string"
      ? raw.trim()
      : raw != null
        ? JSON.stringify(raw)
        : null;

  return [message, code ? `code=${code}` : null, providerName ? `provider=${providerName}` : null, rawText]
    .filter(Boolean)
    .join(" | ");
}

function createRequestError(
  message: string,
  options?: {
    isRetryable?: boolean;
    isTimeout?: boolean;
    statusCode?: number;
  },
): OpenRouterRequestError {
  return Object.assign(new Error(message), options);
}

function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    /aborted due to timeout/i.test(error.message) ||
    /timed out/i.test(error.message)
  );
}

function normalizeOpenRouterError(
  error: unknown,
  timeoutMs: number,
): OpenRouterRequestError {
  if (
    error instanceof Error &&
    ("isRetryable" in error || "isTimeout" in error || "statusCode" in error)
  ) {
    return error as OpenRouterRequestError;
  }

  if (isTimeoutError(error)) {
    return createRequestError(
      `OpenRouter request timed out after ${timeoutMs}ms`,
      {
        isRetryable: true,
        isTimeout: true,
        statusCode: 504,
      },
    );
  }

  if (error instanceof Error) {
    return createRequestError(error.message);
  }

  return createRequestError("OpenRouter chat completion failed");
}

async function parseOpenRouterResponse(response: Response) {
  const raw = await response.text();

  if (!raw.trim()) {
    return {} satisfies OpenRouterChatResponse;
  }

  try {
    return JSON.parse(raw) as OpenRouterChatResponse;
  } catch {
    return {
      error: {
        message: `OpenRouter returned invalid JSON (${response.status} ${response.statusText})`,
        metadata: {
          raw,
        },
      },
    } satisfies OpenRouterChatResponse;
  }
}

function shouldRetryOpenRouterError(error: OpenRouterRequestError) {
  if (error.isRetryable) {
    return true;
  }

  return typeof error.statusCode === "number"
    ? error.statusCode === 408 ||
        error.statusCode === 409 ||
        error.statusCode === 429 ||
        error.statusCode >= 500
    : false;
}

export async function chatCompletionDetailed({
  model,
  messages,
  responseFormat,
  maxTokens,
  temperature,
  timeoutMs = 2500,
  retries = 0,
  retryDelayMs = 750,
}: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "WIAL Platform",
        },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          model,
          messages,
          ...(typeof maxTokens === "number" ? { max_tokens: maxTokens } : {}),
          ...(typeof temperature === "number" ? { temperature } : {}),
          ...(responseFormat === "json"
            ? {
                response_format: {
                  type: "json_object",
                },
              }
            : {}),
        }),
      });

      const payload = await parseOpenRouterResponse(response);

      if (!response.ok) {
        throw createRequestError(formatOpenRouterError(payload), {
          statusCode: response.status,
        });
      }

      if (payload.error) {
        throw createRequestError(formatOpenRouterError(payload), {
          statusCode: response.status,
          isRetryable: true,
        });
      }

      if (!payload.choices?.[0]) {
        throw createRequestError(
          "OpenRouter response is missing choices",
          {
            statusCode: response.status,
            isRetryable: true,
          },
        );
      }

      return {
        content: getTextContent(payload.choices[0].message?.content),
        usage: {
          promptTokens: payload.usage?.prompt_tokens ?? 0,
          completionTokens: payload.usage?.completion_tokens ?? 0,
          totalTokens: payload.usage?.total_tokens ?? 0,
        },
        model,
      };
    } catch (error) {
      const normalizedError = normalizeOpenRouterError(error, timeoutMs);

      if (attempt >= retries || !shouldRetryOpenRouterError(normalizedError)) {
        throw normalizedError;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, retryDelayMs * (attempt + 1));
      });
    }
  }

  throw createRequestError("OpenRouter chat completion failed");
}

export async function chatCompletion(options: ChatCompletionOptions) {
  const result = await chatCompletionDetailed(options);
  return result.content;
}
