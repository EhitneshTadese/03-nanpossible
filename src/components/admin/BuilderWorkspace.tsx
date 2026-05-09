"use client";

import React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BuilderNodeView,
  BuilderPageRenderer,
  getBuilderNodeLabel,
} from "@/components/chapter/BuilderPageRenderer";
import {
  createBuilderNode,
  getBuilderSurfaceBackgroundPreset,
  getFooterContent,
  setFooterBody,
  setFooterCtaHref,
  setFooterCtaLabel,
  setFooterHeading,
  setFooterLegal,
} from "@/lib/builder-page";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import type {
  BuilderArtboardV2,
  BuilderNodeV2,
  BuilderPageStateV2,
  BuilderSectionTone,
  ChapterBuilderChromeStateV1,
  ChapterBuilderChromeV1,
  PageLiveRenderSource,
} from "@/lib/types";
import { useEventCallback } from "@/lib/use-event";
import { getWorkbenchStatusCopy, type WorkbenchSaveState } from "@/lib/workbench";

const AUTOSAVE_DELAY_MS = 1500;
const DESKTOP_CANVAS_WIDTH = 1120;
const MIN_PAGE_HEIGHT = 720;

type BuilderWorkspaceProps = {
  availablePages: Array<{
    id: string;
    title: string;
  }>;
  chapterId: string;
  chapterName: string;
  chapterSubdomain: string;
  initialHasPublishedBuilderSnapshot: boolean;
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  published: boolean;
  initialLiveRenderSource: PageLiveRenderSource;
  initialState: BuilderPageStateV2;
  initialChromeState: ChapterBuilderChromeStateV1;
};

type PublishNotice = {
  message: string;
  tone: "success" | "error";
} | null;

type Selection = {
  surface: "page";
  nodeId: string | null;
};

type DragState = {
  type: "move" | "resize";
  nodeId: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  originWidth: number;
  originHeight: number;
};

const surfaceTones: BuilderSectionTone[] = ["canvas", "warm", "mint", "blush", "ink"];

function buildChapterPageHref(subdomain: string, slug: string) {
  return slug === "home" ? `/sites/${subdomain}` : `/sites/${subdomain}/${slug}`;
}

function isLocalOrigin(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function createClientId(prefix: string) {
  const fallback = Math.random().toString(36).slice(2, 10);

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${fallback}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function cloneNode(node: BuilderNodeV2): BuilderNodeV2 {
  return {
    ...node,
    id: createClientId("node"),
    desktop: {
      ...node.desktop,
      x: Math.min(node.desktop.x + 28, DESKTOP_CANVAS_WIDTH - node.desktop.width),
      y: node.desktop.y + 28,
      zIndex: node.desktop.zIndex + 1,
    },
  };
}

function getArtboardMinHeight(
  artboard: BuilderArtboardV2,
  nodes: BuilderNodeV2[],
) {
  const nodeBottom = nodes.reduce((maxValue, node) => {
    const bottom = node.desktop.y + (node.type === "spacer" ? node.height : node.desktop.height);
    return Math.max(maxValue, bottom);
  }, 0);

  return Math.max(MIN_PAGE_HEIGHT, artboard.minHeight, nodeBottom + 96);
}

function FieldLabel({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <span className="field-label">{children}</span>;
}

function InspectorField({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <label className="flex flex-col gap-2 rounded-[0.9rem] border border-[color:var(--line)] bg-[rgba(255,250,242,0.6)] p-3">
      {children}
    </label>
  );
}

function InspectorSection({
  children,
  kicker,
  title,
}: Readonly<{
  children: React.ReactNode;
  kicker?: string;
  title: string;
}>) {
  return (
    <div className="rounded-[1rem] border border-[color:var(--line)] bg-[rgba(255,250,242,0.55)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-teal-deep">{title}</p>
        {kicker ? (
          <span className="rounded-full border border-[color:var(--line)] bg-white/70 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/60">
            {kicker}
          </span>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function getToneSwatchClassName(tone: BuilderSectionTone) {
  switch (tone) {
    case "warm":
      return "bg-[#ffac21]";
    case "mint":
      return "bg-[#2ac1a7]";
    case "blush":
      return "bg-[#ce0037]";
    case "ink":
      return "bg-[#111827]";
    default:
      return "bg-[color:var(--teal-deep)]";
  }
}

function getViewportButtonClassName(active: boolean) {
  return `inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
    active
      ? "bg-[color:var(--teal-deep)] text-white shadow-[0_10px_20px_rgba(168,0,42,0.18)]"
      : "text-[color:var(--foreground)]/60 hover:text-[color:var(--foreground)]"
  }`;
}

function getLayerButtonClassName(active: boolean) {
  return `flex w-full items-center justify-between rounded-[0.85rem] px-3 py-3 text-left transition ${
    active
      ? "bg-white text-teal-deep shadow-[inset_0_0_0_1px_var(--teal-deep),0_10px_24px_rgba(168,0,42,0.10)]"
      : "text-[color:var(--foreground)]/70 hover:bg-white/70 hover:text-[color:var(--foreground)]"
  }`;
}

export function BuilderWorkspace({
  availablePages,
  chapterId,
  chapterName,
  chapterSubdomain,
  initialHasPublishedBuilderSnapshot,
  pageId,
  pageSlug,
  pageTitle,
  published,
  initialLiveRenderSource,
  initialState,
  initialChromeState,
}: BuilderWorkspaceProps) {
  const router = useRouter();
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedSnapshotRef = useRef(
    JSON.stringify({
      page: initialState,
      chrome: initialChromeState,
    }),
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [builderState, setBuilderState] = useState(initialState);
  const [builderChromeState, setBuilderChromeState] = useState(initialChromeState);
  const [saveState, setSaveState] = useState<WorkbenchSaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [publishNotice, setPublishNotice] = useState<PublishNotice>(null);
  const [isPublished, setIsPublished] = useState(published);
  const [hasPublishedBuilderSnapshot, setHasPublishedBuilderSnapshot] = useState(
    initialHasPublishedBuilderSnapshot,
  );
  const [liveRenderSource, setLiveRenderSource] = useState<PageLiveRenderSource>(
    initialLiveRenderSource,
  );
  const [liveOrigin, setLiveOrigin] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({
    surface: "page",
    nodeId: initialState.draft.artboard.nodes[0]?.id ?? null,
  });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [viewportMode, setViewportMode] = useState<"desktop" | "mobile">("desktop");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [supabase] = useState(() => createBrowserSupabaseClient());

  const workbenchStatus = getWorkbenchStatusCopy(saveState, {
    lastSavedAt,
  });

  const draft = builderState.draft;
  const chromeDraft = builderChromeState.draft;
  const footerContent = getFooterContent(chromeDraft);
  const livePagePath = buildChapterPageHref(chapterSubdomain, pageSlug);
  const livePageHref =
    liveOrigin == null ? livePagePath : new URL(livePagePath, liveOrigin).toString();
  const showsLocalLiveHref = isLocalOrigin(liveOrigin);
  const isMixedPublishedBuilderState =
    isPublished && liveRenderSource === "legacy" && !hasPublishedBuilderSnapshot;

  const selectedNode =
    draft.artboard.nodes.find((node) => node.id === selection.nodeId) ?? null;

  const updatePageDraft = useEventCallback((updater: (state: BuilderPageStateV2) => BuilderPageStateV2) => {
    setBuilderState((currentState) => updater(currentState));
  });

  const updateChromeDraft = useEventCallback(
    (
      updater: (state: ChapterBuilderChromeStateV1) => ChapterBuilderChromeStateV1,
    ) => {
      setBuilderChromeState((currentState) => updater(currentState));
    },
  );

  const updateChromeDoc = useEventCallback(
    (mapper: (chrome: ChapterBuilderChromeV1) => ChapterBuilderChromeV1) => {
      updateChromeDraft((currentState) => ({
        ...currentState,
        draft: mapper(currentState.draft),
      }));
    },
  );

  const updateArtboard = useEventCallback(
    (updater: (artboard: BuilderArtboardV2) => BuilderArtboardV2) => {
      updatePageDraft((currentState) => ({
        ...currentState,
        draft: {
          ...currentState.draft,
          artboard: updater(currentState.draft.artboard),
        },
      }));
    },
  );

  const updateNode = useEventCallback(
    (
      nodeId: string,
      updater: (node: BuilderNodeV2) => BuilderNodeV2,
    ) => {
      updateArtboard((artboard) => {
        const nextNodes = artboard.nodes.map((node) =>
          node.id === nodeId ? updater(node) : node,
        );

        return {
          ...artboard,
          minHeight: getArtboardMinHeight(artboard, nextNodes),
          nodes: nextNodes,
        };
      });
    },
  );

  const saveDraft = useEventCallback(async () => {
    const snapshot = JSON.stringify({
      page: builderState,
      chrome: builderChromeState,
    });

    if (snapshot === lastSavedSnapshotRef.current) {
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
          editor_kind: "builder",
          page_id: pageId,
          body_json: builderState,
          builder_chrome: builderChromeState,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        savedAt?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "save failed");
      }

      lastSavedSnapshotRef.current = snapshot;
      setLastSavedAt(payload.savedAt ?? new Date().toISOString());
      setSaveState("saved");
      return true;
    } catch {
      setSaveState("error");
      return false;
    }
  });

  const publishPage = async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setSaveState("saving");
    setPublishNotice(null);

    try {
      const response = await fetch("/api/content/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          editor_kind: "builder",
          page_id: pageId,
          body_json: builderState,
          builder_chrome: builderChromeState,
          published: true,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        hasPublishedBuilderSnapshot?: boolean;
        liveRenderSource?: PageLiveRenderSource;
        updatedAt?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "publish failed");
      }

      const nextPageState = {
        ...builderState,
        published: builderState.draft,
      };
      const nextChromeState = {
        ...builderChromeState,
        published: builderChromeState.draft,
      };

      setBuilderState(nextPageState);
      setBuilderChromeState(nextChromeState);
      setHasPublishedBuilderSnapshot(payload.hasPublishedBuilderSnapshot ?? true);
      setLiveRenderSource(payload.liveRenderSource ?? "builder");
      lastSavedSnapshotRef.current = JSON.stringify({
        page: nextPageState,
        chrome: nextChromeState,
      });
      setLastSavedAt(payload.updatedAt ?? new Date().toISOString());
      setSaveState("saved");
      setIsPublished(true);
      setPublishNotice({
        message: "Full-page builder draft published successfully.",
        tone: "success",
      });
    } catch (error) {
      setSaveState("error");
      setPublishNotice({
        message:
          error instanceof Error && error.message
            ? error.message
            : "The full-page builder draft could not be published.",
        tone: "error",
      });
    }
  };

  const addNode = (type: BuilderNodeV2["type"]) => {
    const nextNode = createBuilderNode(type, draft.artboard.nodes.length);
    const maxLayer = draft.artboard.nodes.reduce(
      (maxValue, node) => Math.max(maxValue, node.desktop.zIndex),
      -1,
    );

    nextNode.desktop.zIndex = maxLayer + 1;

    updateArtboard((artboard) => {
      const nextNodes = [...artboard.nodes, nextNode];

      return {
        ...artboard,
        minHeight: getArtboardMinHeight(artboard, nextNodes),
        nodes: nextNodes,
      };
    });
    setSelection({
      surface: "page",
      nodeId: nextNode.id,
    });
  };

  const duplicateSelectedNode = () => {
    if (!selectedNode) {
      return;
    }

    const nextNode = cloneNode(selectedNode);
    updateArtboard((artboard) => {
      const nextNodes = [...artboard.nodes, nextNode];

      return {
        ...artboard,
        minHeight: getArtboardMinHeight(artboard, nextNodes),
        nodes: nextNodes,
      };
    });
    setSelection({
      surface: "page",
      nodeId: nextNode.id,
    });
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) {
      return;
    }

    const deletedId = selectedNode.id;
    updateArtboard((artboard) => {
      const nextNodes = artboard.nodes.filter((node) => node.id !== deletedId);

      return {
        ...artboard,
        minHeight: getArtboardMinHeight(artboard, nextNodes),
        nodes: nextNodes,
      };
    });
    setSelection({
      surface: "page",
      nodeId:
        draft.artboard.nodes.find((node) => node.id !== deletedId)?.id ?? null,
    });
  };

  const nudgeLayer = (direction: -1 | 1) => {
    if (!selectedNode) {
      return;
    }

    updateArtboard((artboard) => {
      const ordered = [...artboard.nodes].sort(
        (left, right) => left.desktop.zIndex - right.desktop.zIndex,
      );
      const currentIndex = ordered.findIndex((node) => node.id === selectedNode.id);
      const nextIndex = currentIndex + direction;

      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= ordered.length) {
        return artboard;
      }

      const current = ordered[currentIndex];
      const target = ordered[nextIndex];

      return {
        ...artboard,
        nodes: artboard.nodes.map((node) => {
          if (node.id === current.id) {
            return {
              ...node,
              desktop: {
                ...node.desktop,
                zIndex: target.desktop.zIndex,
              },
            };
          }

          if (node.id === target.id) {
            return {
              ...node,
              desktop: {
                ...node.desktop,
                zIndex: current.desktop.zIndex,
              },
            };
          }

          return node;
        }),
      };
    });
  };

  const uploadImage = async (file: File) => {
    if (!selectedNode || selectedNode.type !== "image" || !supabase) {
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

      updateNode(selection.nodeId!, (node) => {
        if (node.type !== "image") {
          return node;
        }

        return {
          ...node,
          src: publicUrl,
          alt: node.alt || file.name,
        };
      });
      setPublishNotice(null);
    } catch {
      setPublishNotice({
        message: "Image upload failed.",
        tone: "error",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  useEffect(() => {
    setLiveOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    const snapshot = JSON.stringify({
      page: builderState,
      chrome: builderChromeState,
    });

    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    setSaveState("dirty");

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void saveDraft();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [builderChromeState, builderState, saveDraft]);

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
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      updateNode(dragState.nodeId, (node) => {
        if (dragState.type === "move") {
          const nextX = clamp(
            dragState.originX + deltaX,
            0,
            DESKTOP_CANVAS_WIDTH - node.desktop.width,
          );
          const nextY = clamp(dragState.originY + deltaY, 0, 5200);

          return {
            ...node,
            desktop: {
              ...node.desktop,
              x: nextX,
              y: nextY,
            },
          };
        }

        const nextWidth = clamp(
          dragState.originWidth + deltaX,
          120,
          DESKTOP_CANVAS_WIDTH - node.desktop.x,
        );
        const nextHeight = clamp(
          dragState.originHeight + deltaY,
          node.type === "spacer" ? 48 : 96,
          1200,
        );

        if (node.type === "spacer") {
          return {
            ...node,
            height: nextHeight,
            desktop: {
              ...node.desktop,
              width: nextWidth,
              height: nextHeight,
            },
          };
        }

        return {
          ...node,
          desktop: {
            ...node.desktop,
            width: nextWidth,
            height: nextHeight,
          },
        };
      });
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, updateNode]);

  useEffect(() => {
    const hasNode =
      selection.nodeId == null ||
      draft.artboard.nodes.some((node) => node.id === selection.nodeId);

    if (hasNode) {
      return;
    }

    setSelection({
      surface: "page",
      nodeId: draft.artboard.nodes[0]?.id ?? null,
    });
  }, [draft.artboard.nodes, selection.nodeId]);

  const setChromeNavItem = (
    index: number,
    field: "label" | "href",
    value: string,
  ) => {
    updateChromeDraft((currentState) => ({
      ...currentState,
      draft: {
        ...currentState.draft,
        navigationItems: currentState.draft.navigationItems.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item,
        ),
      },
    }));
  };

  const artboard = draft.artboard;

  return (
    <section className="fixed inset-0 z-[120] flex h-[100dvh] flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-[var(--background)] text-[color:var(--foreground)]">
      <input
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

      <div className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[var(--background)]/95 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-5 py-4 md:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[color:var(--teal-deep)]/25 bg-[color:var(--teal-deep)]/8 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-teal-deep">
                  WIAL Studio
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] ${
                    isPublished
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <div className="space-y-1">
                <h2 className="truncate font-display text-[2.3rem] tracking-[-0.08em] text-teal-deep md:text-[3rem]">
                  {pageTitle}
                </h2>
                <p className="text-sm text-[color:var(--foreground)]/60">
                  /{pageSlug} · {chapterName} · shared header + page artboard + shared footer
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-11 items-center gap-3 rounded-full border border-[color:var(--line)] bg-white/70 px-4 text-sm font-medium text-[color:var(--foreground)]/80">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)]/55">
                  Page
                </span>
                <select
                  className="bg-transparent text-sm font-medium text-[color:var(--foreground)] outline-none"
                  onChange={(event) => {
                    router.push(`/admin/chapter?page=${event.target.value}`);
                  }}
                  value={pageId}
                >
                  {availablePages.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
              </label>
              <a
                className="button-link ghost"
                href={livePageHref}
                rel="noreferrer"
                target="_blank"
              >
                Open live page
              </a>
              <button
                className="button-link secondary"
                onClick={() => void saveDraft()}
                type="button"
              >
                Save draft
              </button>
              <button
                className="button-link primary"
                onClick={() => void publishPage()}
                type="button"
              >
                Publish
              </button>
              {showsLocalLiveHref ? (
                <p className="w-full text-right text-[0.7rem] font-medium tracking-[0.02em] text-[color:var(--foreground)]/55">
                  Live route: <span className="font-mono text-[color:var(--foreground)]/75">{livePageHref}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-[1rem] border border-[color:var(--line)] bg-white/65 px-3 py-2.5">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)]/55">
                  Status
                </span>
                <span className="text-sm font-medium text-[color:var(--foreground)]">{workbenchStatus.label}</span>
              </div>
              <div className="inline-flex items-center gap-3 rounded-[1rem] border border-[color:var(--line)] bg-white/65 px-3 py-2.5">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)]/55">
                  Live source
                </span>
                <span className="text-sm font-medium text-[color:var(--foreground)]/75">
                  {isPublished
                    ? liveRenderSource === "builder"
                      ? "Builder snapshot"
                      : "Legacy HTML"
                    : "Draft only"}
                </span>
              </div>
              <div className="inline-flex items-center gap-3 rounded-[1rem] border border-[color:var(--line)] bg-white/65 px-3 py-2.5">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)]/55">
                  Selection
                </span>
                <span className="text-sm font-medium text-[color:var(--foreground)]/75">
                  {selectedNode
                    ? `Page / ${getBuilderNodeLabel(selectedNode)}`
                    : "Page"}
                </span>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-1 rounded-[1rem] border border-[color:var(--line)] bg-white/65 p-1">
              <button
                className={getViewportButtonClassName(viewportMode === "desktop")}
                onClick={() => setViewportMode("desktop")}
                type="button"
              >
                Desktop canvas
              </button>
              <button
                className={getViewportButtonClassName(viewportMode === "mobile")}
                onClick={() => setViewportMode("mobile")}
                type="button"
              >
                Mobile preview
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid flex-1 items-start xl:grid-cols-[284px_minmax(0,1fr)_360px]">
        <aside className="site-panel relative z-20 hidden rounded-none xl:block xl:border-0 xl:border-r xl:border-[color:var(--line)]">
          <div className="space-y-5 px-4 py-4">
            <div className="space-y-1">
              <p className="field-label">Layers</p>
              <p className="text-sm leading-6 text-[color:var(--foreground)]/60">
                Page elements only. Header and footer chrome are shared across pages.
              </p>
            </div>

            <div className="rounded-[1rem] border border-[color:var(--line)] bg-white/60 p-2.5">
              <button
                className={getLayerButtonClassName(selection.nodeId == null)}
                onClick={() => setSelection({ surface: "page", nodeId: null })}
                type="button"
              >
                <span className="flex items-center gap-2 font-medium">
                  <span className={`h-2 w-2 rounded-full ${getToneSwatchClassName(artboard.background.tone)}`} />
                  Page
                </span>
                <span className="rounded-full bg-white/80 px-2 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--foreground)]/55">
                  {artboard.nodes.length}
                </span>
              </button>

              <div className="mt-2 space-y-1">
                {artboard.nodes.map((node) => (
                  <button
                    className={`group flex w-full items-center justify-between rounded-[0.78rem] px-3 py-2 text-left text-sm transition ${
                      node.id === selection.nodeId
                        ? "bg-white text-teal-deep shadow-[inset_0_0_0_1px_var(--teal-deep)]"
                        : "text-[color:var(--foreground)]/70 hover:bg-white/70 hover:text-[color:var(--foreground)]"
                    }`}
                    key={node.id}
                    onClick={() => setSelection({ surface: "page", nodeId: node.id })}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{getBuilderNodeLabel(node)}</span>
                      <span className="mt-0.5 block text-[0.62rem] font-medium uppercase tracking-[0.14em] text-[color:var(--foreground)]/40 group-hover:text-[color:var(--foreground)]/60">
                        x {node.desktop.x} · y {node.desktop.y}
                      </span>
                    </span>
                    <span className="ml-3 rounded-full bg-white/80 px-2 py-1 text-[0.62rem] uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
                      {node.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1rem] border border-dashed border-[color:var(--teal-deep)]/30 bg-[color:var(--teal-deep)]/5 p-3">
              <p className="field-label">Add to page</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["hero", "text", "image", "button", "quote", "spacer"] as const).map((type) => (
                  <button
                    className="button-link primary justify-center px-3 py-2 text-sm capitalize"
                    key={type}
                    onClick={() => addNode(type)}
                    type="button"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="relative min-w-0 overflow-x-auto overflow-y-visible bg-[color:rgba(255,250,242,0.6)]">
          {isMixedPublishedBuilderState ? (
            <div className="px-5 pt-5 md:px-6">
              <div className="rounded-[1rem] border border-amber-300 bg-amber-100/70 px-4 py-3 text-sm font-medium text-amber-900">
                This page is published, but the live site is still serving legacy HTML because no published builder snapshot exists yet. Publish again to push the builder version live.
              </div>
            </div>
          ) : null}
          {publishNotice ? (
            <div className="px-5 pt-5 md:px-6">
              <div
                className={`rounded-[1rem] border px-4 py-3 text-sm font-medium ${
                  publishNotice.tone === "success"
                    ? "border-emerald-400 bg-emerald-100/70 text-emerald-900"
                    : "border-orange-400 bg-orange-100/70 text-orange-900"
                }`}
              >
                {publishNotice.message}
              </div>
            </div>
          ) : null}

          {viewportMode === "desktop" ? (
            <div className="px-4 py-5 pb-12 md:px-5">
              <div className="mx-auto w-max min-w-full space-y-6">
                <div className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/80 p-4 shadow-[0_24px_80px_rgba(17,40,84,0.08)]">
                  <div className="flex items-center justify-between gap-3 pb-3">
                    <div>
                      <p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-teal-deep">
                        <span className={`h-2 w-2 rounded-full ${getToneSwatchClassName(artboard.background.tone)}`} />
                        Page artboard
                      </p>
                      <p className="mt-1 text-sm font-medium text-[color:var(--foreground)]/75">
                        {artboard.nodes.length} node{artboard.nodes.length === 1 ? "" : "s"} · {artboard.minHeight}px tall
                      </p>
                    </div>
                    <span className="rounded-full border border-[color:var(--line)] bg-white/70 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]/60">
                      {artboard.background.tone}
                    </span>
                  </div>

                  <div className="relative overflow-hidden rounded-[1rem] border border-[color:var(--line)] bg-[color:rgba(255,250,242,0.85)] p-8">
                    <div
                      className="relative mx-auto overflow-hidden rounded-[0.35rem] border border-slate-200/90 bg-white shadow-[0_34px_90px_rgba(17,40,84,0.16)]"
                      data-builder-surface-stage="page"
                      onClick={(event) => {
                        if (event.target === event.currentTarget) {
                          setSelection({ surface: "page", nodeId: null });
                        }
                      }}
                      style={{
                        backgroundImage: `${artboard.background.color}, linear-gradient(rgba(17,40,84,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(17,40,84,0.06) 1px, transparent 1px)`,
                        backgroundSize: "auto, 24px 24px, 24px 24px",
                        minHeight: `${artboard.minHeight}px`,
                        width: `${DESKTOP_CANVAS_WIDTH}px`,
                      }}
                    >
                      {artboard.nodes.length === 0 ? (
                        <div className="absolute inset-8 flex items-center justify-center rounded-[0.6rem] border border-dashed border-slate-300/80 bg-white/50 text-sm font-medium text-slate-500">
                          Add elements to the page artboard from the Layers panel.
                        </div>
                      ) : null}
                      {artboard.nodes.map((node) => {
                        const selected = selection.nodeId === node.id;

                        return (
                          <div
                            className={`absolute ${selected ? "z-30" : ""}`}
                            key={node.id}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelection({ surface: "page", nodeId: node.id });
                              setDragState({
                                type: "move",
                                nodeId: node.id,
                                startX: event.clientX,
                                startY: event.clientY,
                                originX: node.desktop.x,
                                originY: node.desktop.y,
                                originWidth: node.desktop.width,
                                originHeight: node.type === "spacer" ? node.height : node.desktop.height,
                              });
                            }}
                            style={{
                              left: `${node.desktop.x}px`,
                              top: `${node.desktop.y}px`,
                              width: `${node.desktop.width}px`,
                              height: node.type === "spacer" ? `${node.height}px` : `${node.desktop.height}px`,
                              zIndex: node.desktop.zIndex,
                            }}
                          >
                            {selected ? (
                              <div
                                className="absolute -top-10 left-0 z-30 flex items-center gap-2 rounded-[0.65rem] border border-[color:var(--teal-deep)] bg-white/95 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-teal-deep shadow-[0_16px_34px_rgba(17,40,84,0.14)]"
                                onMouseDown={(event) => event.stopPropagation()}
                              >
                                <span>{node.type}</span>
                                <button
                                  className="text-[color:var(--foreground)]/65 transition hover:text-teal-deep"
                                  onClick={duplicateSelectedNode}
                                  type="button"
                                >
                                  Duplicate
                                </button>
                                <button
                                  className="text-[color:var(--foreground)]/65 transition hover:text-teal-deep"
                                  onClick={() => nudgeLayer(-1)}
                                  type="button"
                                >
                                  Back
                                </button>
                                <button
                                  className="text-[color:var(--foreground)]/65 transition hover:text-teal-deep"
                                  onClick={() => nudgeLayer(1)}
                                  type="button"
                                >
                                  Forward
                                </button>
                                <button
                                  className="text-[#ce0037] transition hover:text-[#a8002a]"
                                  onClick={deleteSelectedNode}
                                  type="button"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}

                            <button
                              className={`relative h-full w-full rounded-[1.2rem] text-left transition ${
                                selected
                                  ? "shadow-[0_0_0_2px_var(--teal-deep),0_0_0_5px_rgba(168,0,42,0.12),0_22px_42px_rgba(17,40,84,0.16)]"
                                  : "hover:shadow-[0_18px_36px_rgba(17,40,84,0.10)]"
                              }`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelection({ surface: "page", nodeId: node.id });
                              }}
                              type="button"
                            >
                              <div className="pointer-events-none h-full w-full">
                                <BuilderNodeView mode="editor" node={node} tone={artboard.background.tone} />
                              </div>
                            </button>

                            <button
                              aria-label={`Resize ${getBuilderNodeLabel(node)}`}
                              className="absolute bottom-2 right-2 z-30 h-4 w-4 rounded-[0.3rem] border border-white bg-[#ce0037] shadow-[0_10px_18px_rgba(206,0,55,0.28)]"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setDragState({
                                  type: "resize",
                                  nodeId: node.id,
                                  startX: event.clientX,
                                  startY: event.clientY,
                                  originX: node.desktop.x,
                                  originY: node.desktop.y,
                                  originWidth: node.desktop.width,
                                  originHeight: node.type === "spacer" ? node.height : node.desktop.height,
                                });
                              }}
                              type="button"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-center px-5 py-6 pb-10 md:px-6">
              <div className="w-full max-w-[430px] rounded-[2rem] border border-[color:var(--line)] bg-white/90 p-3 shadow-[0_30px_80px_rgba(17,40,84,0.14)]">
                <div className="mb-3 flex items-center justify-center">
                  <div className="h-1.5 w-20 rounded-full bg-[color:var(--line-strong)]" />
                </div>
                <div className="overflow-hidden rounded-[1.6rem] border border-[color:var(--line)] bg-[var(--background)]">
                  <BuilderPageRenderer
                    chapter={{
                      name: chapterName,
                      contactEmail: null,
                      contactPhone: null,
                    }}
                    chrome={builderChromeState.draft}
                    doc={draft}
                    embedded
                    forceViewport="mobile"
                  />
                </div>
              </div>
            </div>
          )}
        </main>

        <aside className="site-panel relative z-20 hidden rounded-none xl:block xl:border-0 xl:border-l xl:border-[color:var(--line)]">
          <div className="space-y-4 px-4 py-4">
            <div className="space-y-1">
              <p className="field-label">Inspector</p>
              <p className="text-sm leading-6 text-[color:var(--foreground)]/60">
                Select a page node for layout and content controls, or edit shared footer content below.
              </p>
            </div>

            {selectedNode ? (
              <div className="space-y-3 rounded-[1.1rem] border border-[color:var(--line)] bg-white/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="field-label">Inspector</p>
                    <p className="mt-1 text-sm font-semibold text-teal-deep">
                      {getBuilderNodeLabel(selectedNode)}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-[0.64rem] uppercase tracking-[0.16em] text-[color:var(--foreground)]/55">
                    {selectedNode.type}
                  </span>
                </div>

                <InspectorSection kicker="Page" title="Layout">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InspectorField>
                      <FieldLabel>X</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) => ({
                            ...node,
                            desktop: {
                              ...node.desktop,
                              x: Number.parseInt(event.target.value, 10) || node.desktop.x,
                            },
                          }))
                        }
                        type="number"
                        value={selectedNode.desktop.x}
                      />
                    </InspectorField>
                    <InspectorField>
                      <FieldLabel>Y</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) => ({
                            ...node,
                            desktop: {
                              ...node.desktop,
                              y: Number.parseInt(event.target.value, 10) || node.desktop.y,
                            },
                          }))
                        }
                        type="number"
                        value={selectedNode.desktop.y}
                      />
                    </InspectorField>
                    <InspectorField>
                      <FieldLabel>Width</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) => ({
                            ...node,
                            desktop: {
                              ...node.desktop,
                              width: Number.parseInt(event.target.value, 10) || node.desktop.width,
                            },
                          }))
                        }
                        type="number"
                        value={selectedNode.desktop.width}
                      />
                    </InspectorField>
                    <InspectorField>
                      <FieldLabel>Height</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) => {
                            const nextHeight =
                              Number.parseInt(event.target.value, 10) ||
                              (node.type === "spacer" ? node.height : node.desktop.height);

                            if (node.type === "spacer") {
                              return {
                                ...node,
                                height: nextHeight,
                                desktop: {
                                  ...node.desktop,
                                  height: nextHeight,
                                },
                              };
                            }

                            return {
                              ...node,
                              desktop: {
                                ...node.desktop,
                                height: nextHeight,
                              },
                            };
                          })
                        }
                        type="number"
                        value={selectedNode.type === "spacer" ? selectedNode.height : selectedNode.desktop.height}
                      />
                    </InspectorField>
                  </div>

                  {"align" in selectedNode ? (
                    <InspectorField>
                      <FieldLabel>Align</FieldLabel>
                      <select
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            "align" in node
                              ? {
                                  ...node,
                                  align: event.target.value as BuilderNodeV2 & { align: never }["align"],
                                }
                              : node,
                          )
                        }
                        value={selectedNode.align}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </InspectorField>
                  ) : null}
                </InspectorSection>

                <InspectorSection kicker={selectedNode.type} title="Content">
                {selectedNode.type === "hero" ? (
                  <>
                    <InspectorField>
                      <FieldLabel>Eyebrow</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            node.type === "hero"
                              ? {
                                  ...node,
                                  eyebrow: event.target.value,
                                }
                              : node,
                          )
                        }
                        type="text"
                        value={selectedNode.eyebrow}
                      />
                    </InspectorField>
                    <InspectorField>
                      <FieldLabel>Title</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            node.type === "hero"
                              ? {
                                  ...node,
                                  title: event.target.value,
                                }
                              : node,
                          )
                        }
                        type="text"
                        value={selectedNode.title}
                      />
                    </InspectorField>
                    <InspectorField>
                      <FieldLabel>Body</FieldLabel>
                      <textarea
                        className="field-input field-textarea"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            node.type === "hero"
                              ? {
                                  ...node,
                                  body: event.target.value,
                                }
                              : node,
                          )
                        }
                        value={selectedNode.body}
                      />
                    </InspectorField>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InspectorField>
                        <FieldLabel>Button label</FieldLabel>
                        <input
                          className="field-input"
                          onChange={(event) =>
                            updateNode(selectedNode.id, (node) =>
                              node.type === "hero"
                                ? {
                                    ...node,
                                    buttonLabel: event.target.value,
                                  }
                                : node,
                            )
                          }
                          type="text"
                          value={selectedNode.buttonLabel ?? ""}
                        />
                      </InspectorField>
                      <InspectorField>
                        <FieldLabel>Button href</FieldLabel>
                        <input
                          className="field-input"
                          onChange={(event) =>
                            updateNode(selectedNode.id, (node) =>
                              node.type === "hero"
                                ? {
                                    ...node,
                                    buttonHref: event.target.value,
                                  }
                                : node,
                            )
                          }
                          type="text"
                          value={selectedNode.buttonHref ?? ""}
                        />
                      </InspectorField>
                    </div>
                  </>
                ) : null}

                {selectedNode.type === "text" ? (
                  <>
                    <InspectorField>
                      <FieldLabel>Title</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            node.type === "text"
                              ? {
                                  ...node,
                                  title: event.target.value,
                                }
                              : node,
                          )
                        }
                        type="text"
                        value={selectedNode.title ?? ""}
                      />
                    </InspectorField>
                    <InspectorField>
                      <FieldLabel>Body</FieldLabel>
                      <textarea
                        className="field-input field-textarea"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            node.type === "text"
                              ? {
                                  ...node,
                                  body: event.target.value,
                                }
                              : node,
                          )
                        }
                        value={selectedNode.body}
                      />
                    </InspectorField>
                  </>
                ) : null}

                {selectedNode.type === "image" ? (
                  <>
                    <InspectorField>
                      <FieldLabel>Image URL</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            node.type === "image"
                              ? {
                                  ...node,
                                  src: event.target.value,
                                }
                              : node,
                          )
                        }
                        type="url"
                        value={selectedNode.src}
                      />
                    </InspectorField>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InspectorField>
                        <FieldLabel>Alt text</FieldLabel>
                        <input
                          className="field-input"
                          onChange={(event) =>
                            updateNode(selectedNode.id, (node) =>
                              node.type === "image"
                                ? {
                                    ...node,
                                    alt: event.target.value,
                                  }
                                : node,
                            )
                          }
                          type="text"
                          value={selectedNode.alt}
                        />
                      </InspectorField>
                      <InspectorField>
                        <FieldLabel>Fit</FieldLabel>
                        <select
                          className="field-input"
                          onChange={(event) =>
                            updateNode(selectedNode.id, (node) =>
                              node.type === "image"
                                ? {
                                    ...node,
                                    fit: event.target.value === "contain" ? "contain" : "cover",
                                  }
                                : node,
                            )
                          }
                          value={selectedNode.fit}
                        >
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                        </select>
                      </InspectorField>
                    </div>
                    <InspectorField>
                      <FieldLabel>Caption</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            node.type === "image"
                              ? {
                                  ...node,
                                  caption: event.target.value,
                                }
                              : node,
                          )
                        }
                        type="text"
                        value={selectedNode.caption ?? ""}
                      />
                    </InspectorField>
                    <button
                      className="button-link secondary"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      {isUploadingImage ? "Uploading..." : "Upload image"}
                    </button>
                  </>
                ) : null}

                {selectedNode.type === "button" ? (
                  <div className="grid gap-3">
                    <InspectorField>
                      <FieldLabel>Label</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            node.type === "button"
                              ? {
                                  ...node,
                                  label: event.target.value,
                                }
                              : node,
                          )
                        }
                        type="text"
                        value={selectedNode.label}
                      />
                    </InspectorField>
                    <InspectorField>
                      <FieldLabel>Href</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            node.type === "button"
                              ? {
                                  ...node,
                                  href: event.target.value,
                                }
                              : node,
                          )
                        }
                        type="text"
                        value={selectedNode.href}
                      />
                    </InspectorField>
                    <InspectorField>
                      <FieldLabel>Tone</FieldLabel>
                      <select
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            node.type === "button"
                              ? {
                                  ...node,
                                  tone: event.target.value === "secondary" ? "secondary" : "primary",
                                }
                              : node,
                          )
                        }
                        value={selectedNode.tone}
                      >
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                      </select>
                    </InspectorField>
                  </div>
                ) : null}

                {selectedNode.type === "quote" ? (
                  <>
                    <InspectorField>
                      <FieldLabel>Quote</FieldLabel>
                      <textarea
                        className="field-input field-textarea"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            node.type === "quote"
                              ? {
                                  ...node,
                                  quote: event.target.value,
                                }
                              : node,
                          )
                        }
                        value={selectedNode.quote}
                      />
                    </InspectorField>
                    <InspectorField>
                      <FieldLabel>Attribution</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) =>
                            node.type === "quote"
                              ? {
                                  ...node,
                                  attribution: event.target.value,
                                }
                              : node,
                          )
                        }
                        type="text"
                        value={selectedNode.attribution}
                      />
                    </InspectorField>
                  </>
                ) : null}
                </InspectorSection>

                <InspectorSection kicker="Layer" title="Arrange">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="button-link secondary justify-center px-3 py-2 text-sm"
                      onClick={duplicateSelectedNode}
                      type="button"
                    >
                      Duplicate
                    </button>
                    <button
                      className="button-link secondary justify-center px-3 py-2 text-sm"
                      onClick={() => nudgeLayer(1)}
                      type="button"
                    >
                      Forward
                    </button>
                    <button
                      className="button-link secondary justify-center px-3 py-2 text-sm"
                      onClick={() => nudgeLayer(-1)}
                      type="button"
                    >
                      Back
                    </button>
                    <button
                      className="rounded-full border border-[#ce0037]/40 bg-[#ce0037]/10 px-3 py-2 text-sm font-semibold text-[#a8002a] transition hover:bg-[#ce0037]/18"
                      onClick={deleteSelectedNode}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </InspectorSection>
              </div>
            ) : (
              <div className="space-y-3 rounded-[1.1rem] border border-[color:var(--line)] bg-white/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="field-label">Surface</p>
                    <p className="mt-1 text-sm font-semibold text-teal-deep">
                      Page artboard
                    </p>
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-[0.64rem] uppercase tracking-[0.16em] text-[color:var(--foreground)]/55">
                    Page
                  </span>
                </div>

                <InspectorSection kicker="Footer" title="Footer content">
                  <InspectorField>
                    <FieldLabel>Footer heading</FieldLabel>
                    <input
                      className="field-input"
                      onChange={(event) =>
                        updateChromeDoc((chrome) => setFooterHeading(chrome, event.target.value))
                      }
                      type="text"
                      value={footerContent.heading}
                    />
                  </InspectorField>
                  <InspectorField>
                    <FieldLabel>Footer body</FieldLabel>
                    <textarea
                      className="field-input field-textarea"
                      onChange={(event) =>
                        updateChromeDoc((chrome) => setFooterBody(chrome, event.target.value))
                      }
                      value={footerContent.body}
                    />
                  </InspectorField>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InspectorField>
                      <FieldLabel>Footer CTA label</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateChromeDoc((chrome) => setFooterCtaLabel(chrome, event.target.value))
                        }
                        type="text"
                        value={footerContent.ctaLabel}
                      />
                    </InspectorField>
                    <InspectorField>
                      <FieldLabel>Footer CTA href</FieldLabel>
                      <input
                        className="field-input"
                        onChange={(event) =>
                          updateChromeDoc((chrome) => setFooterCtaHref(chrome, event.target.value))
                        }
                        type="text"
                        value={footerContent.ctaHref}
                      />
                    </InspectorField>
                  </div>
                  <InspectorField>
                    <FieldLabel>Footer legal</FieldLabel>
                    <textarea
                      className="field-input field-textarea"
                      onChange={(event) =>
                        updateChromeDoc((chrome) => setFooterLegal(chrome, event.target.value))
                      }
                      value={footerContent.legal}
                    />
                  </InspectorField>
                </InspectorSection>

                <InspectorSection kicker="Header" title="Header navigation">
                  <InspectorField>
                    <FieldLabel>Brand label</FieldLabel>
                    <input
                      className="field-input"
                      onChange={(event) =>
                        updateChromeDraft((currentState) => ({
                          ...currentState,
                          draft: {
                            ...currentState.draft,
                            brandLabel: event.target.value,
                          },
                        }))
                      }
                      type="text"
                      value={chromeDraft.brandLabel}
                    />
                  </InspectorField>
                  <InspectorField>
                    <FieldLabel>Brand href</FieldLabel>
                    <input
                      className="field-input"
                      onChange={(event) =>
                        updateChromeDraft((currentState) => ({
                          ...currentState,
                          draft: {
                            ...currentState.draft,
                            brandHref: event.target.value,
                          },
                        }))
                      }
                      type="text"
                      value={chromeDraft.brandHref}
                    />
                  </InspectorField>
                  <div className="space-y-2 rounded-[1rem] border border-[color:var(--line)] bg-white/60 p-3">
                    <FieldLabel>Navigation</FieldLabel>
                    {chromeDraft.navigationItems.map((item, index) => (
                      <div className="grid gap-2 sm:grid-cols-[1fr_1.2fr_auto]" key={`${item.href}-${index}`}>
                        <input
                          className="field-input"
                          onChange={(event) => setChromeNavItem(index, "label", event.target.value)}
                          placeholder="Label"
                          type="text"
                          value={item.label}
                        />
                        <input
                          className="field-input"
                          onChange={(event) => setChromeNavItem(index, "href", event.target.value)}
                          placeholder="/about"
                          type="text"
                          value={item.href}
                        />
                        <button
                          className="rounded-full border border-[color:var(--line)] bg-white/70 px-3 text-sm text-[color:var(--foreground)]/70 transition hover:bg-white hover:text-[color:var(--foreground)]"
                          onClick={() =>
                            updateChromeDraft((currentState) => ({
                              ...currentState,
                              draft: {
                                ...currentState.draft,
                                navigationItems: currentState.draft.navigationItems.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              },
                            }))
                          }
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      className="button-link secondary justify-center px-3 py-2 text-sm"
                      onClick={() =>
                        updateChromeDraft((currentState) => ({
                          ...currentState,
                          draft: {
                            ...currentState.draft,
                            navigationItems: [
                              ...currentState.draft.navigationItems,
                              {
                                label: "New link",
                                href: "/new-link",
                              },
                            ],
                          },
                        }))
                      }
                      type="button"
                    >
                      Add nav item
                    </button>
                  </div>
                </InspectorSection>

                <InspectorSection kicker={artboard.background.tone} title="Page surface">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InspectorField>
                    <FieldLabel>Min height</FieldLabel>
                    <input
                      className="field-input"
                      onChange={(event) =>
                        updateArtboard((current) => ({
                          ...current,
                          minHeight: Number.parseInt(event.target.value, 10) || current.minHeight,
                        }))
                      }
                      type="number"
                      value={artboard.minHeight}
                    />
                  </InspectorField>
                  <InspectorField>
                    <FieldLabel>Background tone</FieldLabel>
                    <select
                      className="field-input"
                      onChange={(event) =>
                        updateArtboard((current) => ({
                          ...current,
                          background: getBuilderSurfaceBackgroundPreset(
                            event.target.value as BuilderSectionTone,
                          ),
                        }))
                      }
                      value={artboard.background.tone}
                    >
                      {surfaceTones.map((tone) => (
                        <option key={tone} value={tone}>
                          {tone}
                        </option>
                      ))}
                    </select>
                  </InspectorField>
                </div>
                </InspectorSection>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
