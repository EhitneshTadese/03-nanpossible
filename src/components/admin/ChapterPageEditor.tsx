"use client";

import { useState } from "react";
import { BuilderWorkspace } from "@/components/admin/BuilderWorkspace";
import { ContentEditor } from "@/components/admin/ContentEditor";
import type { ChapterBuilderChromeStateV1, ContentPageRecord } from "@/lib/types";

type ChapterPageEditorProps = {
  chapterId: string;
  chapterName: string;
  chapterSubdomain: string;
  defaultLanguage: string;
  initialBuilderChromeState: ChapterBuilderChromeStateV1 | null;
  pages: ContentPageRecord[];
  page: ContentPageRecord;
};

export function ChapterPageEditor({
  chapterId,
  chapterName,
  chapterSubdomain,
  defaultLanguage,
  initialBuilderChromeState,
  pages,
  page,
}: ChapterPageEditorProps) {
  const [editorKind, setEditorKind] = useState(page.editorKind);
  const [builderState, setBuilderState] = useState(page.builderState ?? null);
  const [builderChromeState, setBuilderChromeState] = useState(initialBuilderChromeState);
  const [isCreatingBuilder, setIsCreatingBuilder] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const createBuilderDraft = async () => {
    setIsCreatingBuilder(true);
    setNotice(null);

    try {
      const response = await fetch("/api/content/create-builder-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_id: page.id,
        }),
      });
      const payload = (await response.json()) as {
        bodyJson?: ContentPageRecord["builderState"];
        builderChrome?: ChapterBuilderChromeStateV1;
        error?: string;
      };

      if (!response.ok || !payload.bodyJson || !payload.builderChrome) {
        throw new Error(payload.error ?? "create failed");
      }

      setBuilderState(payload.bodyJson);
      setBuilderChromeState(payload.builderChrome);
      setEditorKind("builder");
      setNotice({
        message: "Builder draft created. The existing live page stays intact until you publish the builder version.",
        tone: "success",
      });
    } catch {
      setNotice({
        message: "The builder draft could not be created.",
        tone: "error",
      });
    } finally {
      setIsCreatingBuilder(false);
    }
  };

  if (editorKind === "builder" && builderState && builderChromeState) {
    return (
      <div className="space-y-4">
        {notice ? (
          <div className={`account-flash ${notice.tone === "success" ? "is-success" : "is-error"}`}>
            {notice.message}
          </div>
        ) : null}
        <BuilderWorkspace
          availablePages={pages.map((entry) => ({
            id: entry.id,
            title: entry.title,
          }))}
          chapterId={chapterId}
          chapterName={chapterName}
          chapterSubdomain={chapterSubdomain}
          initialHasPublishedBuilderSnapshot={page.hasPublishedBuilderSnapshot}
          initialChromeState={builderChromeState}
          initialLiveRenderSource={page.liveRenderSource}
          initialState={builderState}
          pageId={page.id}
          pageSlug={page.slug}
          pageTitle={page.title}
          published={page.published}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <div className={`account-flash ${notice.tone === "success" ? "is-success" : "is-error"}`}>
          {notice.message}
        </div>
      ) : null}

      <section className="site-panel rounded-[2rem] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="eyebrow">Builder opt-in</p>
            <h2 className="font-display text-3xl tracking-[-0.04em] text-teal-deep">
              Start a Wix-style builder draft
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-foreground/68 md:text-base">
              This keeps the current published page untouched, creates a separate builder draft in `body_json`, and switches this page into the new freeform workspace.
            </p>
          </div>
          <button
            className="button-link secondary"
            disabled={isCreatingBuilder}
            onClick={() => void createBuilderDraft()}
            type="button"
          >
            {isCreatingBuilder ? "Creating..." : "Create builder draft"}
          </button>
        </div>
      </section>

      <ContentEditor
        chapterId={chapterId}
        chapterName={chapterName}
        chapterSubdomain={chapterSubdomain}
        defaultLanguage={defaultLanguage}
        initialContent={page.bodyJson ?? page.bodyRichtext}
        initialHtml={page.bodyHtml ?? ""}
        pageId={page.id}
        pageSlug={page.slug}
        pageTitle={page.title}
        published={page.published}
      />
    </div>
  );
}
