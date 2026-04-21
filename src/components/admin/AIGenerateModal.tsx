"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { GenerationTone } from "@/lib/types";

type AIGenerateModalProps = {
  chapterId: string;
  defaultLanguage: string;
  onApply: (payload: {
    html: string;
    mode: "insert" | "replace";
  }) => void;
  onClose: () => void;
  open: boolean;
  pageId: string;
  pageSlug: string;
  pageTitle: string;
};

const toneOptions: GenerationTone[] = ["professional", "warm", "academic"];

export function AIGenerateModal({
  chapterId,
  defaultLanguage,
  onApply,
  onClose,
  open,
  pageId,
  pageSlug,
  pageTitle,
}: AIGenerateModalProps) {
  const dialogTitleId = useId();
  const [language, setLanguage] = useState(defaultLanguage || "en");
  const [includeCoaches, setIncludeCoaches] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(true);
  const [testimonials, setTestimonials] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [tone, setTone] = useState<GenerationTone>("professional");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setGeneratedHtml(null);
      setIsGenerating(false);
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      aria-labelledby={dialogTitleId}
      aria-modal="true"
      className="fixed inset-0 z-[120] overflow-y-auto bg-[rgba(17,24,24,0.48)] px-4 py-8 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[rgba(139,113,112,0.18)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,248,242,0.96))] p-6 shadow-[0_30px_90px_rgba(24,37,36,0.24)] ring-1 ring-white/55 md:p-8"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(139,113,112,0.14),transparent_40%),radial-gradient(circle_at_top_right,rgba(138,143,0,0.11),transparent_32%)]" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="eyebrow">Chapter-in-a-box</p>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-foreground/45">
                  Generate draft copy, review it, then insert or replace content inside the editor
                </p>
                <h2
                  className="mt-3 font-display text-3xl leading-tight text-teal-deep md:text-[2.7rem]"
                  id={dialogTitleId}
                >
                  Generate content for {pageTitle}
                </h2>
              </div>
              <button className="button-link secondary shrink-0" onClick={onClose} type="button">
                Close
              </button>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <label className="field-shell bg-white/88 shadow-[0_12px_30px_rgba(24,37,36,0.07)]">
                    <span className="field-label">Language</span>
                    <select
                      className="field-input"
                      onChange={(event) => setLanguage(event.target.value)}
                      value={language}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="pt">Portuguese</option>
                      <option value="fr">French</option>
                    </select>
                  </label>

                  <label className="field-shell bg-white/88 shadow-[0_12px_30px_rgba(24,37,36,0.07)]">
                    <span className="field-label">Tone</span>
                    <select
                      className="field-input"
                      onChange={(event) => setTone(event.target.value as GenerationTone)}
                      value={tone}
                    >
                      {toneOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3">
                  <label className="coach-checkbox bg-white/88 shadow-[0_12px_30px_rgba(24,37,36,0.06)]">
                    <input
                      checked={includeCoaches}
                      onChange={(event) => setIncludeCoaches(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Include coach roster</span>
                  </label>
                  <label className="coach-checkbox bg-white/88 shadow-[0_12px_30px_rgba(24,37,36,0.06)]">
                    <input
                      checked={includeEvents}
                      onChange={(event) => setIncludeEvents(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Include upcoming events</span>
                  </label>
                </div>

                <label className="field-shell bg-white/88 shadow-[0_12px_30px_rgba(24,37,36,0.07)]">
                  <span className="field-label">Testimonials</span>
                  <textarea
                    className="field-textarea"
                    onChange={(event) => setTestimonials(event.target.value)}
                    rows={4}
                    value={testimonials}
                  />
                </label>

                <label className="field-shell bg-white/88 shadow-[0_12px_30px_rgba(24,37,36,0.07)]">
                  <span className="field-label">Custom context</span>
                  <textarea
                    className="field-textarea"
                    onChange={(event) => setCustomContext(event.target.value)}
                    rows={5}
                    value={customContext}
                  />
                </label>

                {error ? <div className="account-flash is-error">{error}</div> : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    className="button-link primary"
                    disabled={isGenerating}
                    onClick={async () => {
                      setError(null);
                      setIsGenerating(true);

                      try {
                        const response = await fetch("/api/generate", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            chapter_id: chapterId,
                            page_id: pageId,
                            page_slug: pageSlug,
                            language,
                            include_coaches: includeCoaches,
                            include_events: includeEvents,
                            testimonials,
                            custom_context: customContext,
                            tone,
                          }),
                        });
                        const raw = await response.text();
                        let payload: {
                          error?: string;
                          html?: string;
                        } = {};

                        try {
                          payload = raw
                            ? (JSON.parse(raw) as { error?: string; html?: string })
                            : {};
                        } catch {
                          payload = {};
                        }

                        if (!response.ok || !payload.html) {
                          setError(
                            payload.error ??
                              `WIAL could not generate this page yet (${response.status}).`,
                          );
                          return;
                        }

                        setGeneratedHtml(payload.html);
                      } catch {
                        setError("WIAL could not generate this page yet.");
                      } finally {
                        setIsGenerating(false);
                      }
                    }}
                    type="button"
                  >
                    {isGenerating
                      ? `Generating content for ${pageTitle}...`
                      : generatedHtml
                        ? "Regenerate content"
                        : "Generate content"}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-line/80 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/42">
                        Generated preview
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground/62">
                        Review the draft below before you replace the page or insert the copy at the current cursor.
                      </p>
                    </div>

                    {generatedHtml ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="button-link secondary"
                          onClick={() => onApply({ html: generatedHtml, mode: "insert" })}
                          type="button"
                        >
                          Insert at cursor
                        </button>
                        <button
                          className="button-link primary"
                          onClick={() => onApply({ html: generatedHtml, mode: "replace" })}
                          type="button"
                        >
                          Replace draft
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="min-h-[28rem] overflow-hidden rounded-[1.75rem] border border-line/80 bg-[rgba(255,252,248,0.9)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  {generatedHtml ? (
                    <div
                      className="chapter-html max-w-none px-6 py-6 md:px-8"
                      dangerouslySetInnerHTML={{ __html: generatedHtml }}
                    />
                  ) : (
                    <div className="flex h-full min-h-[28rem] items-center justify-center px-8 text-center">
                      <div className="max-w-md space-y-3">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/42">
                          Waiting for draft
                        </p>
                        <p className="text-base leading-7 text-foreground/62">
                          Generate content to review it here before applying it to the page editor.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
