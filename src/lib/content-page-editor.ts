import {
  createInitialBuilderChromeState,
  createInitialBuilderPageState,
  mergeBuilderChromeIntoConfig,
  parseBuilderPageState,
  parseChapterBuilderChromeState,
  serializeBuilderPageToHtml,
} from "@/lib/builder-page";
import type {
  BuilderPageStateV2,
  ChapterRecord,
  ContentPageRecord,
} from "@/lib/types";

type ContentDraftInput =
  | {
      editorKind: "legacy";
      bodyJson: unknown;
    }
  | {
      editorKind: "builder";
      bodyJson: unknown;
      builderChrome?: unknown;
    };

type ContentPublishInput =
  | {
      editorKind: "legacy";
      bodyJson: unknown;
      bodyHtml: string;
      published: boolean;
    }
  | {
      editorKind: "builder";
      bodyJson: unknown;
      builderChrome?: unknown;
      published: boolean;
    };

export function createBuilderDraftState(pageTitle: string, chapterName: string) {
  return createInitialBuilderPageState({
    pageTitle,
    chapterName,
  });
}

export function createBuilderChromeDraftState(
  chapter: Pick<ChapterRecord, "name" | "contactEmail" | "contactPhone">,
) {
  return createInitialBuilderChromeState({
    chapterName: chapter.name,
    contactEmail: chapter.contactEmail,
    contactPhone: chapter.contactPhone,
  });
}

export function parseBuilderDraftState(value: unknown) {
  const state = parseBuilderPageState(value);

  if (!state) {
    throw new Error("invalid-builder-state");
  }

  return state;
}

export function parseBuilderChromeDraftState(
  chapter: Pick<ChapterRecord, "name" | "contactEmail" | "contactPhone">,
  value: unknown,
) {
  const state = parseChapterBuilderChromeState(value, {
    chapterName: chapter.name,
    contactEmail: chapter.contactEmail,
    contactPhone: chapter.contactPhone,
  });

  if (!state) {
    throw new Error("invalid-builder-chrome-state");
  }

  return state;
}

export function buildDraftUpdatePayload(
  page: Pick<ContentPageRecord, "builderState">,
  input: ContentDraftInput,
) {
  if (input.editorKind === "legacy") {
    return {
      body_json: null,
      body_richtext: input.bodyJson ?? null,
    };
  }

  const nextState = parseBuilderDraftState(input.bodyJson);

  return {
    body_json: {
      ...nextState,
      published: nextState.published ?? page.builderState?.published ?? null,
    } satisfies BuilderPageStateV2,
  };
}

export function buildChapterConfigUpdatePayload(
  chapter: Pick<ChapterRecord, "name" | "contactEmail" | "contactPhone" | "config">,
  value: unknown,
) {
  const nextState = parseBuilderChromeDraftState(chapter, value);
  return mergeBuilderChromeIntoConfig(chapter.config, nextState);
}

export function buildPublishUpdatePayload(
  page: Pick<ContentPageRecord, "builderState">,
  input: ContentPublishInput,
) {
  if (input.editorKind === "legacy") {
    return {
      body_json: null,
      body_richtext: input.bodyJson ?? null,
      body_html: input.bodyHtml,
      published: Boolean(input.published),
    };
  }

  const nextState = parseBuilderDraftState(input.bodyJson);
  const publishedDoc = nextState.draft;
  const chromeState = input.builderChrome
    ? parseChapterBuilderChromeState(input.builderChrome, {
        chapterName: "",
      })
    : null;

  return {
    body_json: {
      ...nextState,
      published: publishedDoc,
    } satisfies BuilderPageStateV2,
    body_html: serializeBuilderPageToHtml(publishedDoc, chromeState?.draft ?? null),
    published: Boolean(input.published),
  };
}
