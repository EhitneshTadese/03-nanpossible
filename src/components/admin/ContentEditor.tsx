"use client";

import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import { AIGenerateModal } from "@/components/admin/AIGenerateModal";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { regeneratePageAudioAction } from "@/app/admin/chapter/actions";

type ContentEditorProps = {
  chapterId: string;
  defaultLanguage: string;
  initialAudioDuration?: number | null;
  initialAudioGeneratedAt?: string | null;
  initialAudioUrl?: string | null;
  initialContent: unknown;
  initialHtml: string;
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  published: boolean;
};

function ToolbarButton({
  active = false,
  children,
  onClick,
}: Readonly<{
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}>) {
  return (
    <button
      className={`shrink-0 rounded-[1rem] px-3 py-2 text-sm font-semibold tracking-[0.01em] transition-colors ${
        active
          ? "bg-teal-deep text-white shadow-[0_10px_24px_rgba(22,63,61,0.14)]"
          : "bg-transparent text-foreground/62 hover:bg-teal-deep/6 hover:text-teal-deep"
      }`}
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      type="button"
    >
      {children}
    </button>
  );
}

export function ContentEditor({
  chapterId,
  defaultLanguage,
  initialAudioDuration,
  initialAudioGeneratedAt,
  initialAudioUrl,
  initialContent,
  initialHtml,
  pageId,
  pageSlug,
  pageTitle,
  published,
}: ContentEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const skipNextAudioStaleRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "saved" | "saving" | "error">("idle");
  const [publishNotice, setPublishNotice] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [draftAudioPreview, setDraftAudioPreview] = useState<{
    audioUrl: string | null;
    duration: number | null;
    stale: boolean;
  } | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [officialAudio, setOfficialAudio] = useState({
    url: initialAudioUrl ?? null,
    duration: initialAudioDuration ?? null,
    generatedAt: initialAudioGeneratedAt ?? null,
  });
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    setOfficialAudio({
      url: initialAudioUrl ?? null,
      duration: initialAudioDuration ?? null,
      generatedAt: initialAudioGeneratedAt ?? null,
    });
  }, [initialAudioUrl, initialAudioDuration, initialAudioGeneratedAt]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
      ImageExtension,
      Placeholder.configure({
        placeholder: "Start writing or click AI Generate...",
      }),
    ],
    content:
      initialContent && Object.keys(initialContent as Record<string, unknown>).length
        ? (initialContent as Record<string, unknown>)
        : initialHtml,
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    let timeout: number | null = null;
    const handleUpdate = () => {
      if (skipNextAudioStaleRef.current) {
        skipNextAudioStaleRef.current = false;
      } else if (draftAudioPreview && !draftAudioPreview.stale) {
        setDraftAudioPreview((current) =>
          current
            ? {
                ...current,
                stale: true,
              }
            : current,
        );
      }

      if (timeout) {
        window.clearTimeout(timeout);
      }

      timeout = window.setTimeout(async () => {
        setStatus("saving");

        try {
          const response = await fetch("/api/content/save-draft", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              page_id: pageId,
              body_json: editor.getJSON(),
            }),
          });

          if (!response.ok) {
            throw new Error("save failed");
          }

          setStatus("saved");
          window.setTimeout(() => setStatus("idle"), 1600);
        } catch {
          setStatus("error");
        }
      }, 30_000);
    };

    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);

      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, [draftAudioPreview, editor, pageId]);

  async function handleRegenerateAudio() {
    if (isRegenerating) return;

    setIsRegenerating(true);
    try {
      const result = await regeneratePageAudioAction(pageId);
      if (result.success) {
        setOfficialAudio({
          url: result.audioUrl ?? null,
          duration: result.duration ?? null,
          generatedAt: result.generatedAt ?? null,
        });
        setPublishNotice({
          message: "WIAL successfully regenerated the page audio.",
          tone: "success",
        });
      } else {
        setPublishNotice({
          message: `Audio regeneration failed: ${result.error}`,
          tone: "error",
        });
      }
    } catch {
      setPublishNotice({
        message: "WIAL encountered an unexpected error during audio regeneration.",
        tone: "error",
      });
    } finally {
      setIsRegenerating(false);
    }
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="site-panel rounded-[2rem] p-6 md:p-8">
      <div className="flex flex-col gap-4 border-b border-line/70 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="eyebrow">Editing page</p>
          <div>
            <h2 className="font-display text-3xl tracking-[-0.04em] text-teal-deep md:text-4xl">
              {pageTitle}
            </h2>
            <p className="mt-2 text-sm uppercase tracking-[0.16em] text-foreground/45">
              /{pageSlug} · {published ? "Published" : "Draft"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <button
            className="button-link secondary"
            onClick={async () => {
              setStatus("saving");

              try {
                const response = await fetch("/api/content/save-draft", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    page_id: pageId,
                    body_json: editor.getJSON(),
                  }),
                });

                if (!response.ok) {
                  throw new Error("save failed");
                }

                setStatus("saved");
              } catch {
                setStatus("error");
              }
            }}
            type="button"
          >
            Save draft
          </button>

          <button
            className="button-link primary"
            onClick={async () => {
              setPublishNotice(null);

              const response = await fetch("/api/content/update", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  page_id: pageId,
                  body_json: editor.getJSON(),
                  body_html: editor.getHTML(),
                  published: true,
                }),
              });

              const payload = (await response.json()) as { error?: string };

              if (!response.ok) {
                setPublishNotice({
                  message: payload.error ?? "WIAL could not publish this page.",
                  tone: "error",
                });
                return;
              }

              // Actively trigger regeneration on publish
              void handleRegenerateAudio();

              setPublishNotice({
                message:
                  "Page published. WIAL is regenerating the final public audio from the latest content.",
                tone: "success",
              });
              setDraftAudioPreview(null);
            }}
            type="button"
          >
            Publish
          </button>

          <button
            className="button-link secondary"
            onClick={() => setShowGenerate(true)}
            type="button"
          >
            AI Generate
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-1">
        <div className="inline-flex min-w-full items-center gap-1.5 rounded-[1.5rem] border border-line/80 bg-white/76 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] md:min-w-0">
          <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            Bold
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            Italic
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            H2
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            H3
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            Bullets
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            Numbers
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("link")}
            onClick={() => {
              const previousUrl = editor.getAttributes("link").href;
              const url = window.prompt("Enter URL", previousUrl);

              if (!url) {
                editor.chain().focus().unsetLink().run();
                return;
              }

              editor.chain().focus().setLink({ href: url }).run();
            }}
          >
            Link
          </ToolbarButton>
          <ToolbarButton onClick={() => fileInputRef.current?.click()}>
            Image
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            Quote
          </ToolbarButton>
        </div>
      </div>

      <input
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];

          if (!file || !supabase) {
            return;
          }

          const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
          const objectPath = `${chapterId}/${Date.now()}_${safeName}`;
          const { error } = await supabase.storage
            .from("chapter-content")
            .upload(objectPath, file, {
              upsert: true,
              contentType: file.type,
            });

          if (error) {
            setPublishNotice({
              message: "WIAL could not upload the image.",
              tone: "error",
            });
            return;
          }

          const publicUrl = supabase.storage.from("chapter-content").getPublicUrl(objectPath)
            .data.publicUrl;
          editor.chain().focus().setImage({ src: publicUrl, alt: file.name }).run();
        }}
        ref={fileInputRef}
        type="file"
      />

      <div className="mt-5 rounded-[1.6rem] border border-line bg-white/72 px-5 py-6 md:px-8 md:py-7">
        <EditorContent className="chapter-editor prose max-w-none" editor={editor} />
      </div>

      <div className="mt-5 rounded-[1.6rem] border border-line bg-white/72 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="eyebrow">Official page audio</p>
            <p className="text-sm leading-6 text-foreground/68">
              This is the narration audio currently visible to public visitors.
              {officialAudio.generatedAt ? (
                <> Last updated {new Date(officialAudio.generatedAt).toLocaleString()}.</>
              ) : (
                <> No official audio has been generated yet.</>
              )}
            </p>
          </div>
          <button
            className="button-link secondary shrink-0"
            disabled={isRegenerating}
            onClick={handleRegenerateAudio}
            type="button"
          >
            {isRegenerating ? "Regenerating..." : "Regenerate Official Audio"}
          </button>
        </div>

        {officialAudio.url ? (
          <div className="mt-5">
            <AudioPlayer
              audioUrl={officialAudio.url}
              duration={officialAudio.duration}
              mode="inline"
              pageTitle={`${pageTitle} official audio`}
            />
          </div>
        ) : null}
      </div>

      {draftAudioPreview ? (
        <div className="mt-5 rounded-[1.6rem] border border-line bg-white/72 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="eyebrow">Draft audio preview</p>
              <p className="text-sm leading-6 text-foreground/68">
                Preview the narration generated for this draft. Publishing will
                regenerate the final public audio from the latest page content.
              </p>
            </div>
            {draftAudioPreview.stale ? (
              <span className="rounded-full border border-accent/25 bg-accent/8 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Audio preview is stale
              </span>
            ) : null}
          </div>

          <div className="mt-4">
            {draftAudioPreview.audioUrl ? (
              <AudioPlayer
                audioUrl={draftAudioPreview.audioUrl}
                duration={draftAudioPreview.duration}
                mode="inline"
                pageTitle={`${pageTitle} draft audio preview`}
              />
            ) : (
              <div className="rounded-[1.35rem] border border-line/70 bg-white/55 px-4 py-3 text-sm leading-6 text-foreground/68">
                Audio preview is not available in this environment yet.
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground/45">
          {published ? "Published view loaded" : "Draft view loaded"}
        </span>

        {status === "saved" ? (
          <span className="text-sm font-semibold text-teal-deep">Draft saved</span>
        ) : null}
        {status === "saving" ? (
          <span className="text-sm font-semibold text-foreground/55">Saving draft...</span>
        ) : null}
        {status === "error" ? (
          <span className="text-sm font-semibold text-accent">Draft save failed</span>
        ) : null}
      </div>

      {publishNotice ? (
        <div
          className={`account-flash mt-4 ${
            publishNotice.tone === "success" ? "is-success" : "is-error"
          }`}
        >
          {publishNotice.message}
        </div>
      ) : null}

      <AIGenerateModal
        chapterId={chapterId}
        defaultLanguage={defaultLanguage}
        onClose={() => setShowGenerate(false)}
        onGenerated={({ audioDuration, audioUrl, html }) => {
          skipNextAudioStaleRef.current = true;
          editor.commands.setContent(html);
          setDraftAudioPreview({
            audioUrl,
            duration: audioDuration,
            stale: false,
          });
        }}
        open={showGenerate}
        pageSlug={pageSlug}
        pageTitle={pageTitle}
      />
    </div>
  );
}
