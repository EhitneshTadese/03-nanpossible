"use client";

import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AIGenerateModal } from "@/components/admin/AIGenerateModal";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

type ContentEditorProps = {
  chapterId: string;
  defaultLanguage: string;
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
  initialContent,
  initialHtml,
  pageId,
  pageSlug,
  pageTitle,
  published,
}: ContentEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "saving" | "error">("idle");
  const [publishNotice, setPublishNotice] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

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
  }, [editor, pageId]);

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

              setPublishNotice({
                message:
                  "Page published. Refresh the public site to confirm the latest output.",
                tone: "success",
              });
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
        onGenerated={(html) => editor.commands.setContent(html)}
        open={showGenerate}
        pageSlug={pageSlug}
        pageTitle={pageTitle}
      />
    </div>
  );
}
