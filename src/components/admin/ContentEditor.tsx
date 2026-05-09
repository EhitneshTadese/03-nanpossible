"use client";

import type { JSONContent } from "@tiptap/core";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { Fragment } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AdminWorkbench } from "@/components/admin/AdminWorkbench";
import { AIGenerateModal } from "@/components/admin/AIGenerateModal";
import { ChapterHtmlPage } from "@/components/chapter/ChapterHtmlPage";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useEventCallback } from "@/lib/use-event";
import { getWorkbenchStatusCopy, type WorkbenchSaveState } from "@/lib/workbench";

const AUTOSAVE_DELAY_MS = 1500;
const DEFAULT_IMAGE_WIDTH = 640;

const ChapterImageExtension = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: DEFAULT_IMAGE_WIDTH,
        parseHTML: (element) => {
          const rawWidth = element.getAttribute("width");
          const parsedWidth = rawWidth ? Number.parseInt(rawWidth, 10) : NaN;

          return Number.isFinite(parsedWidth) && parsedWidth > 0
            ? parsedWidth
            : DEFAULT_IMAGE_WIDTH;
        },
        renderHTML: (attributes) =>
          attributes.width ? { width: String(attributes.width) } : {},
      },
    };
  },
});

type ContentEditorProps = {
  chapterId: string;
  chapterName: string;
  chapterSubdomain: string;
  defaultLanguage: string;
  initialContent: unknown;
  initialHtml: string;
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  published: boolean;
};

type SlashMenuState = {
  from: number;
  left: number;
  query: string;
  to: number;
  top: number;
};

type SlashCommand = {
  description: string;
  id: string;
  keywords: string[];
  label: string;
};

const slashCommands: SlashCommand[] = [
  {
    id: "h2",
    label: "Heading 2",
    description: "Large section heading",
    keywords: ["title", "heading", "section"],
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Smaller subsection heading",
    keywords: ["subheading", "heading"],
  },
  {
    id: "bullets",
    label: "Bulleted list",
    description: "Start a bulleted list",
    keywords: ["list", "bullets", "items"],
  },
  {
    id: "numbers",
    label: "Numbered list",
    description: "Start an ordered list",
    keywords: ["ordered", "steps", "numbers"],
  },
  {
    id: "quote",
    label: "Quote",
    description: "Pull quote or testimonial block",
    keywords: ["quote", "blockquote", "testimonial"],
  },
  {
    id: "link",
    label: "Link",
    description: "Insert or edit a link",
    keywords: ["url", "anchor", "link"],
  },
  {
    id: "image",
    label: "Image",
    description: "Upload an image from your device",
    keywords: ["photo", "media", "image"],
  },
];

function ToolbarButton({
  active = false,
  children,
  disabled = false,
  onClick,
}: Readonly<{
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      className={`rounded-full px-3 py-2 text-sm font-semibold tracking-[0.01em] transition-colors ${
        active
          ? "bg-teal-deep text-white shadow-[0_12px_24px_rgba(22,63,61,0.14)]"
          : "bg-white/72 text-foreground/62 hover:bg-white hover:text-teal-deep"
      } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
      disabled={disabled}
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

function buildChapterPageHref(subdomain: string, slug: string) {
  return slug === "home" ? `/sites/${subdomain}` : `/sites/${subdomain}/${slug}`;
}

function hasEditorJsonContent(value: unknown): value is JSONContent {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length > 0,
  );
}

function normalizeLinkHref(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getSlashMenuState(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  container: HTMLDivElement | null,
) {
  if (!container || !editor.state.selection.empty) {
    return null;
  }

  const { $from, from } = editor.state.selection;
  const parent = $from.parent;

  if (parent.type.name !== "paragraph") {
    return null;
  }

  const text = parent.textContent;

  if (!text.startsWith("/")) {
    return null;
  }

  const rect = container.getBoundingClientRect();
  const coords = editor.view.coordsAtPos(from);

  return {
    from: $from.start(),
    to: $from.end(),
    query: text.slice(1).trim().toLowerCase(),
    left: coords.left - rect.left,
    top: coords.bottom - rect.top + 12,
  } satisfies SlashMenuState;
}

function getTopLevelBlockInfo(editor: NonNullable<ReturnType<typeof useEditor>>) {
  const { $from } = editor.state.selection;

  return {
    index: $from.index(0),
    total: editor.state.doc.childCount,
  };
}

function moveTopLevelBlock(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  direction: -1 | 1,
) {
  const documentNode = editor.state.doc;
  const { index } = getTopLevelBlockInfo(editor);
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= documentNode.childCount) {
    return;
  }

  const nodes = Array.from({ length: documentNode.childCount }, (_, nodeIndex) =>
    documentNode.child(nodeIndex),
  );

  [nodes[index], nodes[nextIndex]] = [nodes[nextIndex], nodes[index]];

  let selectionAnchor = 0;

  for (let nodeIndex = 0; nodeIndex < nextIndex; nodeIndex += 1) {
    selectionAnchor += nodes[nodeIndex]?.nodeSize ?? 0;
  }

  const transaction = editor.state.tr.replaceWith(
    0,
    documentNode.content.size,
    Fragment.fromArray(nodes),
  );

  transaction.setSelection(
    TextSelection.near(
      transaction.doc.resolve(Math.min(selectionAnchor + 1, transaction.doc.content.size)),
    ),
  );
  editor.view.dispatch(transaction.scrollIntoView());
}

export function ContentEditor({
  chapterId,
  chapterName,
  chapterSubdomain,
  defaultLanguage,
  initialContent,
  initialHtml,
  pageId,
  pageSlug,
  pageTitle,
  published,
}: ContentEditorProps) {
  const editorSurfaceRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const [, setSelectionTick] = useState(0);
  const [saveState, setSaveState] = useState<WorkbenchSaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [publishNotice, setPublishNotice] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [isPublished, setIsPublished] = useState(published);
  const [previewHtml, setPreviewHtml] = useState(initialHtml);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [slashMenuState, setSlashMenuState] = useState<SlashMenuState | null>(null);
  const [activeSlashIndex, setActiveSlashIndex] = useState(0);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const deferredPreviewHtml = useDeferredValue(previewHtml);

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
        HTMLAttributes: {
          rel: "noreferrer noopener",
          target: "_blank",
        },
      }),
      ChapterImageExtension,
      Placeholder.configure({
        placeholder: "Start writing, type / for blocks, or open AI Generate.",
      }),
    ],
    content: hasEditorJsonContent(initialContent) ? initialContent : initialHtml,
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
  });

  const filteredSlashCommands = useMemo(() => {
    if (!slashMenuState) {
      return [];
    }

    return slashCommands.filter((command) => {
      if (!slashMenuState.query) {
        return true;
      }

      const haystack = [command.label, command.description, ...command.keywords]
        .join(" ")
        .toLowerCase();

      return haystack.includes(slashMenuState.query);
    });
  }, [slashMenuState]);

  const selectedImageAttributes = editor?.isActive("image")
    ? editor.getAttributes("image")
    : null;
  const topLevelBlockInfo = editor ? getTopLevelBlockInfo(editor) : null;
  const workbenchStatus = getWorkbenchStatusCopy(saveState, {
    lastSavedAt,
  });

  const closeLinkPopover = useEventCallback(() => {
    setLinkPopoverOpen(false);
  });

  const syncEditorChrome = useEventCallback(() => {
    if (!editor) {
      return;
    }

    setSelectionTick((tick) => tick + 1);
    setSlashMenuState(getSlashMenuState(editor, editorSurfaceRef.current));
  });

  const saveDraft = useEventCallback(async () => {
    if (!editor) {
      return false;
    }

    const nextSnapshot = JSON.stringify(editor.getJSON());

    if (nextSnapshot === lastSavedSnapshotRef.current) {
      setSaveState((currentState) => (currentState === "saving" ? "saved" : currentState));
      return true;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setSaveState("saving");

    try {
      const response = await fetch("/api/content/save-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          editor_kind: "legacy",
          page_id: pageId,
          body_json: editor.getJSON(),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        savedAt?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "save failed");
      }

      lastSavedSnapshotRef.current = nextSnapshot;
      setLastSavedAt(payload.savedAt ?? new Date().toISOString());
      setSaveState("saved");
      return true;
    } catch {
      setSaveState("error");
      return false;
    }
  });

  const publishPage = useEventCallback(async () => {
    if (!editor) {
      return;
    }

    setPublishNotice(null);

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setSaveState("saving");

    const response = await fetch("/api/content/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        editor_kind: "legacy",
        page_id: pageId,
        body_json: editor.getJSON(),
        body_html: editor.getHTML(),
        published: true,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      updatedAt?: string;
    };

    if (!response.ok) {
      setSaveState("error");
      setPublishNotice({
        message: payload.error ?? "WIAL could not publish this page.",
        tone: "error",
      });
      return;
    }

    lastSavedSnapshotRef.current = JSON.stringify(editor.getJSON());
    setLastSavedAt(payload.updatedAt ?? new Date().toISOString());
    setSaveState("saved");
    setIsPublished(true);
    setPublishNotice({
      message:
        "Page published successfully. Public routes will now serve the updated content.",
      tone: "success",
    });
  });

  const uploadImage = useEventCallback(async (file: File) => {
    if (!editor || !supabase) {
      return;
    }

    setIsUploadingImage(true);

    try {
      const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
      const objectPath = `${chapterId}/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage
        .from("chapter-content")
        .upload(objectPath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (error) {
        throw error;
      }

      const publicUrl = supabase.storage.from("chapter-content").getPublicUrl(objectPath)
        .data.publicUrl;

      editor.chain().focus().setImage({
        src: publicUrl,
        alt: file.name,
        width: DEFAULT_IMAGE_WIDTH,
      }).run();
      setPublishNotice(null);
    } catch {
      setPublishNotice({
        message: "WIAL could not upload the image.",
        tone: "error",
      });
    } finally {
      setIsUploadingImage(false);
    }
  });

  const applySlashCommand = useEventCallback((commandId: string) => {
    if (!editor || !slashMenuState) {
      return;
    }

    editor.chain().focus().deleteRange({
      from: slashMenuState.from,
      to: slashMenuState.to,
    }).run();

    switch (commandId) {
      case "h2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "h3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "bullets":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "numbers":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "quote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "link":
        setLinkHref(editor.getAttributes("link").href ?? "");
        setLinkPopoverOpen(true);
        break;
      case "image":
        fileInputRef.current?.click();
        break;
      default:
        break;
    }

    setSlashMenuState(null);
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    lastSavedSnapshotRef.current = JSON.stringify(editor.getJSON());
    setPreviewHtml(editor.getHTML());
    syncEditorChrome();
  }, [editor, syncEditorChrome]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleEditorUpdate = () => {
      startTransition(() => {
        setPreviewHtml(editor.getHTML());
      });

      syncEditorChrome();

      const nextSnapshot = JSON.stringify(editor.getJSON());

      if (nextSnapshot === lastSavedSnapshotRef.current) {
        return;
      }

      setSaveState("dirty");

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        void saveDraft();
      }, AUTOSAVE_DELAY_MS);
    };

    const handleSelectionUpdate = () => {
      syncEditorChrome();
    };

    editor.on("update", handleEditorUpdate);
    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("update", handleEditorUpdate);
      editor.off("selectionUpdate", handleSelectionUpdate);

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [editor, saveDraft, syncEditorChrome]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveDraft();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveDraft]);

  useEffect(() => {
    if (!slashMenuState || filteredSlashCommands.length === 0) {
      setActiveSlashIndex(0);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSlashMenuState(null);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveSlashIndex((currentIndex) =>
          (currentIndex + 1) % filteredSlashCommands.length,
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveSlashIndex((currentIndex) =>
          (currentIndex - 1 + filteredSlashCommands.length) % filteredSlashCommands.length,
        );
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const activeCommand = filteredSlashCommands[activeSlashIndex];

        if (activeCommand) {
          applySlashCommand(activeCommand.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [activeSlashIndex, applySlashCommand, filteredSlashCommands, slashMenuState]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <AdminWorkbench
        actions={
          <>
            <button className="button-link secondary" onClick={() => void saveDraft()} type="button">
              Save draft
            </button>
            <button className="button-link secondary" onClick={() => setShowGenerate(true)} type="button">
              AI Generate
            </button>
            <button className="button-link primary" onClick={() => void publishPage()} type="button">
              Publish
            </button>
          </>
        }
        editLabel="Editing"
        editPane={
          <div className="space-y-4">
            {publishNotice ? (
              <div
                className={`account-flash ${
                  publishNotice.tone === "success" ? "is-success" : "is-error"
                }`}
              >
                {publishNotice.message}
              </div>
            ) : null}

            {selectedImageAttributes ? (
              <div className="rounded-[1.5rem] border border-line/80 bg-[rgba(255,252,248,0.9)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/44">
                      Selected image controls
                    </p>
                    <button
                      className="text-sm font-semibold text-teal-deep"
                      onClick={() => editor.chain().focus().deleteSelection().run()}
                      type="button"
                    >
                      Remove image
                    </button>
                  </div>

                  <label className="field-shell">
                    <span className="field-label">Image width</span>
                    <input
                      className="w-full accent-[var(--teal-deep)]"
                      max={960}
                      min={240}
                      onChange={(event) =>
                        editor.commands.updateAttributes("image", {
                          width: Number.parseInt(event.target.value, 10),
                        })
                      }
                      step={20}
                      type="range"
                      value={Number(selectedImageAttributes.width ?? DEFAULT_IMAGE_WIDTH)}
                    />
                  </label>

                  <label className="field-shell">
                    <span className="field-label">Alt text</span>
                    <input
                      className="field-input"
                      onChange={(event) =>
                        editor.commands.updateAttributes("image", {
                          alt: event.target.value,
                        })
                      }
                      type="text"
                      value={String(selectedImageAttributes.alt ?? "")}
                    />
                  </label>
                </div>
              </div>
            ) : null}

            <div className="sticky top-[12rem] z-10 rounded-[1.6rem] border border-line/80 bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,248,242,0.94))] p-3 shadow-[0_22px_56px_rgba(24,37,36,0.1)] backdrop-blur-xl">
              <div className="flex flex-wrap gap-2">
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
                <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                  Quote
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive("link")}
                  disabled={editor.state.selection.empty && !editor.isActive("link")}
                  onClick={() => {
                    setLinkHref(editor.getAttributes("link").href ?? "");
                    setLinkPopoverOpen(true);
                  }}
                >
                  Link
                </ToolbarButton>
                <ToolbarButton disabled={isUploadingImage} onClick={() => fileInputRef.current?.click()}>
                  {isUploadingImage ? "Uploading..." : "Image"}
                </ToolbarButton>
                <ToolbarButton
                  disabled={!topLevelBlockInfo || topLevelBlockInfo.index === 0}
                  onClick={() => moveTopLevelBlock(editor, -1)}
                >
                  Move up
                </ToolbarButton>
                <ToolbarButton
                  disabled={
                    !topLevelBlockInfo ||
                    topLevelBlockInfo.index >= topLevelBlockInfo.total - 1
                  }
                  onClick={() => moveTopLevelBlock(editor, 1)}
                >
                  Move down
                </ToolbarButton>
              </div>

              {linkPopoverOpen ? (
                <div className="mt-3 rounded-[1.35rem] border border-line/80 bg-white/82 p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <label className="field-shell flex-1">
                      <span className="field-label">Link URL</span>
                      <input
                        autoFocus
                        className="field-input"
                        onChange={(event) => setLinkHref(event.target.value)}
                        placeholder="https://example.com"
                        type="url"
                        value={linkHref}
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        className="button-link secondary"
                        onClick={() => {
                          if (!linkHref.trim()) {
                            editor.chain().focus().extendMarkRange("link").unsetLink().run();
                            closeLinkPopover();
                            return;
                          }

                          editor.chain().focus().extendMarkRange("link").setLink({
                            href: normalizeLinkHref(linkHref),
                          }).run();
                          closeLinkPopover();
                        }}
                        type="button"
                      >
                        Apply link
                      </button>
                      {editor.isActive("link") ? (
                        <button
                          className="button-link secondary"
                          onClick={() => {
                            editor.chain().focus().extendMarkRange("link").unsetLink().run();
                            closeLinkPopover();
                          }}
                          type="button"
                        >
                          Remove link
                        </button>
                      ) : null}
                      <button className="button-link ghost" onClick={closeLinkPopover} type="button">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <input
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void uploadImage(file);
                }

                event.target.value = "";
              }}
              ref={fileInputRef}
              type="file"
            />

            <div
              className="relative overflow-hidden rounded-[1.8rem] border border-line bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
              ref={editorSurfaceRef}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(139,113,112,0.12),transparent_44%),radial-gradient(circle_at_top_right,rgba(138,143,0,0.1),transparent_34%)]" />

              <BubbleMenu
                className="flex items-center gap-1 rounded-full border border-line/80 bg-white/96 p-1.5 shadow-[0_18px_48px_rgba(24,37,36,0.16)]"
                editor={editor}
                shouldShow={({ editor: currentEditor }) =>
                  currentEditor.isEditable &&
                  (!currentEditor.state.selection.empty || currentEditor.isActive("link"))
                }
                updateDelay={0}
              >
                <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
                  Bold
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                  Italic
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive("link")}
                  onClick={() => {
                    setLinkHref(editor.getAttributes("link").href ?? "");
                    setLinkPopoverOpen(true);
                  }}
                >
                  Link
                </ToolbarButton>
              </BubbleMenu>

              <FloatingMenu
                className="flex items-center gap-2 rounded-full border border-line/80 bg-white/96 p-1.5 shadow-[0_18px_48px_rgba(24,37,36,0.14)]"
                editor={editor}
                shouldShow={({ state }) =>
                  state.selection.empty &&
                  state.selection.$from.parent.type.name === "paragraph" &&
                  state.selection.$from.parent.textContent.length === 0
                }
              >
                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                  H2
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()}>
                  Bullets
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                  Quote
                </ToolbarButton>
                <ToolbarButton disabled={isUploadingImage} onClick={() => fileInputRef.current?.click()}>
                  Image
                </ToolbarButton>
              </FloatingMenu>

              <EditorContent className="chapter-editor min-h-[540px] max-w-none px-6 py-7 md:px-8" editor={editor} />

              {slashMenuState && filteredSlashCommands.length > 0 ? (
                <div
                  className="absolute z-20 w-[min(22rem,calc(100%-2rem))] rounded-[1.5rem] border border-line/80 bg-white/96 p-2 shadow-[0_28px_80px_rgba(24,37,36,0.16)]"
                  style={{
                    left: Math.max(16, slashMenuState.left - 12),
                    top: slashMenuState.top,
                  }}
                >
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/42">
                      Slash commands
                    </p>
                  </div>
                  <div className="grid gap-1">
                    {filteredSlashCommands.map((command, index) => (
                      <button
                        className={`rounded-[1.1rem] px-3 py-3 text-left transition-colors ${
                          index === activeSlashIndex
                            ? "bg-[rgba(168,0,42,0.08)] text-teal-deep"
                            : "text-foreground/72 hover:bg-[rgba(168,0,42,0.05)] hover:text-teal-deep"
                        }`}
                        key={command.id}
                        onClick={() => applySlashCommand(command.id)}
                        onMouseEnter={() => setActiveSlashIndex(index)}
                        type="button"
                      >
                        <p className="text-sm font-semibold">{command.label}</p>
                        <p className="mt-1 text-xs leading-6 text-foreground/52">
                          {command.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        }
        eyebrow="Page workbench"
        liveHref={buildChapterPageHref(chapterSubdomain, pageSlug)}
        previewLabel="Live preview"
        previewPane={
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-line/80 bg-white/62 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/42">
                Preview behavior
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground/64">
                This panel uses the same chapter page shell as the public tenant route and updates from the editor in real time.
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.8rem] border border-line/70 bg-[rgba(255,252,248,0.9)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              <ChapterHtmlPage
                chapterName={chapterName}
                embedded
                html={deferredPreviewHtml || "<p></p>"}
                title={pageTitle}
              />
            </div>
          </div>
        }
        saveStatus={workbenchStatus}
        stageLabel={isPublished ? "Published page" : "Draft page"}
        stageTone={isPublished ? "success" : "warning"}
        subtitle="Write, preview, reorder, and stage content updates before publishing them to the live chapter site."
        title={pageTitle}
      />

      <AIGenerateModal
        chapterId={chapterId}
        defaultLanguage={defaultLanguage}
        onApply={({ html, mode }) => {
          if (mode === "replace") {
            editor.commands.setContent(html);
          } else {
            editor.chain().focus().insertContent(html).run();
          }

          setShowGenerate(false);
        }}
        onClose={() => setShowGenerate(false)}
        open={showGenerate}
        pageId={pageId}
        pageSlug={pageSlug}
        pageTitle={pageTitle}
      />
    </>
  );
}
