import { describe, expect, it } from "vitest";
import { createDefaultChapterBuilderChrome, createInitialBuilderPageState } from "./builder-page";
import {
  buildChapterConfigUpdatePayload,
  buildDraftUpdatePayload,
  buildPublishUpdatePayload,
} from "./content-page-editor";

describe("content-page-editor", () => {
  it("builds legacy draft payloads without using body_json", () => {
    expect(
      buildDraftUpdatePayload(
        {
          builderState: null,
        },
        {
          editorKind: "legacy",
          bodyJson: {
            type: "doc",
          },
        },
      ),
    ).toEqual({
      body_json: null,
      body_richtext: {
        type: "doc",
      },
    });
  });

  it("preserves the published builder snapshot while saving a new draft", () => {
    const published = createInitialBuilderPageState({
      pageTitle: "About",
      chapterName: "WIAL USA",
    });
    published.published = published.draft;

    const nextDraft = createInitialBuilderPageState({
      pageTitle: "About",
      chapterName: "WIAL USA",
    });

    const payload = buildDraftUpdatePayload(
      {
        builderState: published,
      },
      {
        editorKind: "builder",
        bodyJson: nextDraft,
      },
    );

    expect(payload.body_json).toMatchObject({
      editorKind: "builder",
      published: published.published,
    });
  });

  it("publishes builder drafts by snapshotting the draft and exporting html with chrome", () => {
    const state = createInitialBuilderPageState({
      pageTitle: "Contact",
      chapterName: "WIAL Brazil",
    });
    const chrome = {
      schemaVersion: 1 as const,
      draft: createDefaultChapterBuilderChrome({
        chapterName: "WIAL Brazil",
        contactEmail: "brazil@wial.org",
      }),
      published: null,
    };

    const payload = buildPublishUpdatePayload(
      {
        builderState: null,
      },
      {
        editorKind: "builder",
        bodyJson: state,
        chromeState: chrome,
        published: true,
      },
    );

    expect(payload.published).toBe(true);
    expect(payload.body_json?.editorKind).toBe("builder");
    expect(payload.body_json?.published?.schemaVersion).toBe(2);
    expect(payload.body_json?.published?.title).toBe(state.draft.title);
    expect(payload.body_json?.published?.artboard.nodes).toHaveLength(
      state.draft.artboard.nodes.length,
    );
    expect(payload.body_html).toContain('data-builder-surface="header"');
    expect(payload.body_html).toContain('data-builder-surface="page"');
  });

  it("builds a chapter config payload with builder chrome", () => {
    const config = buildChapterConfigUpdatePayload(
      {
        name: "WIAL USA",
        contactEmail: "usa@wial.org",
        contactPhone: null,
        config: {},
      },
      {
        schemaVersion: 1,
        draft: createDefaultChapterBuilderChrome({
          chapterName: "WIAL USA",
          contactEmail: "usa@wial.org",
        }),
        published: null,
      },
    );

    expect(config).toMatchObject({
      builderChrome: {
        schemaVersion: 1,
      },
    });
  });

  it("publishes legacy payloads with body_html and body_richtext", () => {
    expect(
      buildPublishUpdatePayload(
        {
          builderState: null,
        },
        {
          editorKind: "legacy",
          bodyJson: { type: "doc" },
          bodyHtml: "<p>Hello</p>",
          published: true,
        },
      ),
    ).toEqual({
      body_json: null,
      body_richtext: { type: "doc" },
      body_html: "<p>Hello</p>",
      published: true,
    });
  });
});
