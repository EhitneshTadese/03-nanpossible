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
    message?: string;
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

export async function chatCompletionDetailed({
  model,
  messages,
  responseFormat,
  maxTokens,
  temperature,
  timeoutMs = 2500,
}: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

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

  const payload = (await response.json()) as OpenRouterChatResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "OpenRouter chat completion failed");
  }

  return {
    content: getTextContent(payload.choices?.[0]?.message?.content),
    usage: {
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
      totalTokens: payload.usage?.total_tokens ?? 0,
    },
    model,
  };
}

export async function chatCompletion(options: ChatCompletionOptions) {
  const result = await chatCompletionDetailed(options);
  return result.content;
}
