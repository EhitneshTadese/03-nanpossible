"use client";

import Link from "next/link";
import { useState } from "react";

type AdminWorkbenchProps = {
  actions: React.ReactNode;
  editLabel?: string;
  editPane: React.ReactNode;
  eyebrow: string;
  liveHref?: string;
  previewLabel?: string;
  previewPane: React.ReactNode;
  rail?: React.ReactNode;
  saveStatus: {
    label: string;
    tone: "neutral" | "success" | "warning" | "error";
  };
  stageLabel: string;
  stageTone?: "neutral" | "success" | "warning";
  subtitle: string;
  title: string;
};

function getStatusClassName(
  tone: "neutral" | "success" | "warning" | "error" | undefined,
) {
  switch (tone) {
    case "success":
      return "border-[rgba(22,95,88,0.14)] bg-[rgba(22,95,88,0.08)] text-teal-deep";
    case "warning":
      return "border-[rgba(181,163,0,0.2)] bg-[rgba(181,163,0,0.1)] text-[#6f5e00]";
    case "error":
      return "border-[rgba(180,83,9,0.18)] bg-[rgba(180,83,9,0.1)] text-[#92400e]";
    default:
      return "border-line/80 bg-white/70 text-foreground/62";
  }
}

export function AdminWorkbench({
  actions,
  editLabel = "Editor",
  editPane,
  eyebrow,
  liveHref,
  previewLabel = "Preview",
  previewPane,
  rail,
  saveStatus,
  stageLabel,
  stageTone = "neutral",
  subtitle,
  title,
}: AdminWorkbenchProps) {
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  return (
    <section className="site-panel overflow-hidden rounded-[2rem]">
      <div className="sticky top-[5.75rem] z-20 border-b border-line/80 bg-[linear-gradient(180deg,rgba(255,252,248,0.96),rgba(255,248,242,0.92))] px-5 py-5 backdrop-blur-xl md:px-7">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <p className="eyebrow">{eyebrow}</p>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-3xl tracking-[-0.04em] text-teal-deep md:text-[2.35rem]">
                    {title}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] ${getStatusClassName(stageTone)}`}
                  >
                    {stageLabel}
                  </span>
                </div>
                <p className="max-w-3xl text-sm leading-7 text-foreground/64 md:text-base">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {liveHref ? (
                <Link className="button-link secondary" href={liveHref} target="_blank">
                  Open live page
                </Link>
              ) : null}
              {actions}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-line/80 bg-white/72 px-3 py-2 text-sm font-semibold tracking-[0.01em] text-foreground/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              <span className="text-[0.72rem] uppercase tracking-[0.16em] text-foreground/46">
                Workspace status
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.72rem] uppercase tracking-[0.14em] ${getStatusClassName(saveStatus.tone)}`}
              >
                {saveStatus.label}
              </span>
            </div>

            <div className="inline-flex w-full max-w-[18rem] rounded-full border border-line/80 bg-white/72 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] md:hidden">
              <button
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  mobileTab === "edit"
                    ? "bg-teal-deep text-white"
                    : "text-foreground/58"
                }`}
                onClick={() => setMobileTab("edit")}
                type="button"
              >
                {editLabel}
              </button>
              <button
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  mobileTab === "preview"
                    ? "bg-teal-deep text-white"
                    : "text-foreground/58"
                }`}
                onClick={() => setMobileTab("preview")}
                type="button"
              >
                {previewLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`${rail ? "grid xl:grid-cols-[280px_minmax(0,1fr)]" : ""}`}>
        {rail ? (
          <aside className="border-b border-line/70 bg-[rgba(255,252,248,0.56)] xl:border-b-0 xl:border-r">
            {rail}
          </aside>
        ) : null}

        <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)]">
          <section
            className={`min-w-0 border-b border-line/70 xl:border-b-0 xl:border-r ${
              mobileTab === "preview" ? "hidden xl:block" : "block"
            }`}
          >
            <div className="px-5 py-4 md:px-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/42">
                {editLabel}
              </p>
            </div>
            <div className="px-5 pb-6 md:px-7 md:pb-7">{editPane}</div>
          </section>

          <aside
            className={`min-w-0 bg-[linear-gradient(180deg,rgba(252,249,244,0.78),rgba(249,246,241,0.62))] ${
              mobileTab === "edit" ? "hidden xl:block" : "block"
            }`}
          >
            <div className="px-5 py-4 md:px-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/42">
                {previewLabel}
              </p>
            </div>
            <div className="px-5 pb-6 md:px-7 md:pb-7">{previewPane}</div>
          </aside>
        </div>
      </div>
    </section>
  );
}
