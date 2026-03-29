"use client";

import { useState } from "react";
import type { GenerationTone } from "@/lib/types";

type AIGenerateModalProps = {
  chapterId: string;
  defaultLanguage: string;
  onClose: () => void;
  onGenerated: (payload: {
    html: string;
    audioUrl: string | null;
    audioDuration: number | null;
  }) => void;
  open: boolean;
  pageSlug: string;
  pageTitle: string;
};

const toneOptions: GenerationTone[] = ["professional", "warm", "academic"];

export function AIGenerateModal({
  chapterId,
  defaultLanguage,
  onClose,
  onGenerated,
  open,
  pageSlug,
  pageTitle,
}: AIGenerateModalProps) {
  const [language, setLanguage] = useState(defaultLanguage || "en");
  const [includeCoaches, setIncludeCoaches] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(true);
  const [testimonials, setTestimonials] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [tone, setTone] = useState<GenerationTone>("professional");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8">
      <div className="site-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Chapter-in-a-box</p>
            <h2 className="mt-3 font-display text-3xl text-teal-deep">
              Generate content for: {pageTitle}
            </h2>
          </div>
          <button className="button-link secondary" onClick={onClose} type="button">
            Cancel
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="field-shell">
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

          <label className="field-shell">
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

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="coach-checkbox">
            <input
              checked={includeCoaches}
              onChange={(event) => setIncludeCoaches(event.target.checked)}
              type="checkbox"
            />
            <span>Include coach roster</span>
          </label>
          <label className="coach-checkbox">
            <input
              checked={includeEvents}
              onChange={(event) => setIncludeEvents(event.target.checked)}
              type="checkbox"
            />
            <span>Include upcoming events</span>
          </label>
        </div>

        <label className="field-shell mt-4">
          <span className="field-label">Testimonials</span>
          <textarea
            className="field-textarea"
            onChange={(event) => setTestimonials(event.target.value)}
            rows={4}
            value={testimonials}
          />
        </label>

        <label className="field-shell mt-4">
          <span className="field-label">Custom context</span>
          <textarea
            className="field-textarea"
            onChange={(event) => setCustomContext(event.target.value)}
            rows={5}
            value={customContext}
          />
        </label>

        {error ? <div className="account-flash is-error mt-4">{error}</div> : null}

        <div className="mt-6 flex flex-wrap gap-3">
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
                    page_slug: pageSlug,
                    language,
                    include_coaches: includeCoaches,
                    include_events: includeEvents,
                    testimonials,
                    custom_context: customContext,
                    tone,
                  }),
                });
                const payload = (await response.json()) as {
                  error?: string;
                  html?: string;
                  audio_url?: string | null;
                  audio_duration?: number | null;
                };

                if (!response.ok || !payload.html) {
                  setError(payload.error ?? "WIAL could not generate this page yet.");
                  return;
                }

                onGenerated({
                  html: payload.html,
                  audioUrl: payload.audio_url ?? null,
                  audioDuration:
                    typeof payload.audio_duration === "number"
                      ? payload.audio_duration
                      : null,
                });
                onClose();
              } catch {
                setError("WIAL could not generate this page yet.");
              } finally {
                setIsGenerating(false);
              }
            }}
            type="button"
          >
            {isGenerating
              ? `Generating content and audio for ${pageTitle}...`
              : "Generate content"}
          </button>
        </div>
      </div>
    </div>
  );
}
