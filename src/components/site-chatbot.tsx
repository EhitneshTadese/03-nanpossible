"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Message = {
  role: "assistant" | "user";
  content: string;
};

const starterPrompts = [
  "What do I need for CALC?",
  "How do I renew PALC?",
  "Where is the LMS?",
  "Show the MALC application form",
];

const initialMessage: Message = {
  role: "assistant",
  content:
    "Ask me about CALC, PALC, SALC, MALC, renewal rules, application forms, LMS links, or Credly badges.",
};

function renderMessageText(content: string) {
  const parts = content.split(/(https?:\/\/[^\s]+)/g);

  return parts.map((part, index) => {
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      return (
        <a
          className="font-semibold text-teal underline decoration-accent/60 underline-offset-4"
          href={part}
          key={`${part}-${index}`}
          rel="noreferrer"
          target="_blank"
        >
          {part}
        </a>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function SiteChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const trimmedInput = input.trim();
  const canSend = trimmedInput.length > 0 && !isLoading;
  const conversation = useMemo(() => messages.slice(-8), [messages]);

  useEffect(() => {
    if (!viewportRef.current) {
      return;
    }

    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [messages, isLoading, open]);

  async function sendMessage(content: string) {
    const question = content.trim();

    if (!question || isLoading) {
      return;
    }

    const nextMessages = [...messages, { role: "user" as const, content: question }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      const payload = (await response.json()) as
        | { reply?: string; error?: string }
        | undefined;

      if (!response.ok || !payload?.reply) {
        throw new Error(
          payload?.error ??
            "The assistant could not answer right now. Please try again.",
        );
      }

      const reply = payload.reply;

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: reply,
        },
      ]);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "The assistant could not answer right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="site-chatbot-shell">
      {open ? (
        <section
          aria-label="WIAL certification assistant"
          className="site-chatbot-panel"
        >
          <div className="site-chatbot-header">
            <div>
              <p className="site-chatbot-kicker">Ask WIAL</p>
              <h2 className="site-chatbot-title">Certification assistant</h2>
            </div>
            <button
              aria-label="Close chatbot"
              className="site-chatbot-close"
              onClick={() => setOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <p className="site-chatbot-copy">
            Ask about certification levels, renewal requirements, application forms,
            LMS links, or Credly badges.
          </p>

          <div className="site-chatbot-prompt-row">
            {starterPrompts.map((prompt) => (
              <button
                className="site-chatbot-chip"
                key={prompt}
                onClick={() => void sendMessage(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="site-chatbot-messages" ref={viewportRef}>
            {conversation.map((message, index) => (
              <article
                className={`site-chatbot-message ${message.role === "user" ? "is-user" : "is-assistant"}`}
                key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
              >
                <p className="site-chatbot-message-label">
                  {message.role === "user" ? "You" : "WIAL"}
                </p>
                <div className="site-chatbot-message-body whitespace-pre-line">
                  {renderMessageText(message.content)}
                </div>
              </article>
            ))}

            {isLoading ? (
              <article className="site-chatbot-message is-assistant">
                <p className="site-chatbot-message-label">WIAL</p>
                <div className="site-chatbot-message-body">
                  Working on that answer…
                </div>
              </article>
            ) : null}
          </div>

          {error ? <p className="site-chatbot-error">{error}</p> : null}

          <form
            className="site-chatbot-form"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(trimmedInput);
            }}
          >
            <textarea
              className="site-chatbot-input"
              name="chatbot-question"
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about CALC, renewal, forms, LMS, or badges…"
              rows={2}
              value={input}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/46">
                Public assistant
              </p>
              <button
                className="button-link primary"
                disabled={!canSend}
                type="submit"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        aria-expanded={open}
        className="site-chatbot-trigger"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="site-chatbot-trigger-dot" aria-hidden="true" />
        Ask WIAL
      </button>
    </div>
  );
}
