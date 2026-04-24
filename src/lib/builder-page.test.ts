import { describe, expect, it } from "vitest";
import {
  createBuilderBlock,
  createBuilderSection,
  createDefaultChapterBuilderChrome,
  createInitialBuilderPageState,
  getFooterContent,
  getPageEditorKind,
  getPublishedPageEditorKind,
  parseBuilderPageState,
  parseChapterBuilderChromeState,
  serializeBuilderPageToHtml,
  sortBuilderNodesForMobile,
  upgradeBuilderPageDocV1,
} from "./builder-page";

describe("builder-page", () => {
  it("parses a builder page state and detects editor kinds", () => {
    const state = createInitialBuilderPageState({
      pageTitle: "About",
      chapterName: "WIAL USA",
    });

    expect(parseBuilderPageState(state)).not.toBeNull();
    expect(getPageEditorKind(state)).toBe("builder");
    expect(getPublishedPageEditorKind(state, true)).toBe("legacy");
  });

  it("upgrades v1 section docs into a single v2 artboard", () => {
    const heroSection = createBuilderSection("Hero", {
      seedBlock: "hero",
      sectionIndex: 0,
    });
    const storySection = createBuilderSection("Story", {
      seedBlock: "text",
      sectionIndex: 1,
    });

    const upgraded = upgradeBuilderPageDocV1({
      schemaVersion: 1,
      title: "About",
      sections: [heroSection, storySection],
    });

    expect(upgraded.schemaVersion).toBe(2);
    expect(upgraded.artboard.nodes).toHaveLength(2);
    expect(upgraded.artboard.nodes[1]!.desktop.y).toBeGreaterThan(
      upgraded.artboard.nodes[0]!.desktop.y,
    );
  });

  it("treats published builder snapshots as the public render source", () => {
    const state = createInitialBuilderPageState({
      pageTitle: "Contact",
      chapterName: "WIAL Chicago",
    });
    state.published = state.draft;

    expect(getPublishedPageEditorKind(state, true)).toBe("builder");
  });

  it("sorts mobile nodes deterministically by y then x then layer", () => {
    const left = createBuilderBlock("text", 0);
    const right = createBuilderBlock("button", 1);
    const top = createBuilderBlock("quote", 2);

    left.id = "left";
    left.desktop.x = 40;
    left.desktop.y = 160;
    left.desktop.zIndex = 2;

    right.id = "right";
    right.desktop.x = 460;
    right.desktop.y = 160;
    right.desktop.zIndex = 1;

    top.id = "top";
    top.desktop.x = 320;
    top.desktop.y = 80;
    top.desktop.zIndex = 7;

    expect(sortBuilderNodesForMobile([left, right, top]).map((node) => node.id)).toEqual([
      "top",
      "left",
      "right",
    ]);
  });

  it("parses chapter builder chrome from config", () => {
    const parsed = parseChapterBuilderChromeState(
      {
        builderChrome: {
          schemaVersion: 1,
          draft: createDefaultChapterBuilderChrome({
            chapterName: "WIAL USA",
            contactEmail: "usa@wial.org",
          }),
          published: null,
        },
      },
      {
        chapterName: "WIAL USA",
        contactEmail: "usa@wial.org",
      },
    );

    expect(parsed?.draft.brandLabel).toBe("WIAL USA");
    expect(parsed?.draft.navigationItems[0]?.label).toBe("Home");
  });

  it("parses legacy chrome with four footer nodes and returns structured footer content", () => {
    const baseChrome = createDefaultChapterBuilderChrome({
      chapterName: "WIAL USA",
      contactEmail: "usa@wial.org",
    });

    const legacy = {
      ...baseChrome,
      footerLegal: "Legacy fine print.",
      footer: {
        ...baseChrome.footer,
        nodes: [
          {
            id: "legacy-text",
            type: "text" as const,
            desktop: { x: 20, y: 20, width: 500, height: 140, zIndex: 0 },
            title: "Connect with us",
            body: "Body copy for footer.",
            align: "left" as const,
          },
          {
            id: "legacy-button",
            type: "button" as const,
            desktop: { x: 600, y: 40, width: 220, height: 80, zIndex: 1 },
            label: "Contact us",
            href: "/contact",
            tone: "primary" as const,
            align: "center" as const,
          },
          {
            id: "legacy-image",
            type: "image" as const,
            desktop: { x: 20, y: 180, width: 280, height: 160, zIndex: 2 },
            src: "https://example.com/a.jpg",
            alt: "extra",
            fit: "cover" as const,
          },
          {
            id: "legacy-quote",
            type: "quote" as const,
            desktop: { x: 320, y: 180, width: 400, height: 160, zIndex: 3 },
            quote: "Extra quote",
            attribution: "Author",
            align: "left" as const,
          },
        ],
      },
    };

    const parsed = parseChapterBuilderChromeState(
      {
        builderChrome: {
          schemaVersion: 1,
          draft: legacy,
          published: null,
        },
      },
      {
        chapterName: "WIAL USA",
        contactEmail: "usa@wial.org",
      },
    );

    expect(parsed).not.toBeNull();
    expect(parsed!.draft.footer.nodes).toHaveLength(4);

    const footer = getFooterContent(parsed!.draft);
    expect(footer.heading).toBe("Connect with us");
    expect(footer.body).toBe("Body copy for footer.");
    expect(footer.ctaLabel).toBe("Contact us");
    expect(footer.ctaHref).toBe("/contact");
    expect(footer.legal).toBe("Legacy fine print.");
  });

  it("serializes every node type into semantic html without section shells", () => {
    const hero = createBuilderBlock("hero", 0);
    const text = createBuilderBlock("text", 1);
    const image = createBuilderBlock("image", 2);
    const button = createBuilderBlock("button", 3);
    const quote = createBuilderBlock("quote", 4);
    const spacer = createBuilderBlock("spacer", 5);

    if (hero.type !== "hero" || text.type !== "text" || image.type !== "image") {
      throw new Error("unexpected node type");
    }
    if (button.type !== "button" || quote.type !== "quote" || spacer.type !== "spacer") {
      throw new Error("unexpected node type");
    }

    hero.title = "Hero title";
    hero.body = "Hero body";
    hero.buttonLabel = "Talk to us";
    hero.buttonHref = "/contact";

    text.title = "Text title";
    text.body = "Paragraph one\n\nParagraph two";

    image.src = "https://example.com/hero.jpg";
    image.alt = "Hero image";
    image.caption = "Photo caption";

    button.label = "Open form";
    button.href = "/form";

    quote.quote = "Action learning changes teams.";
    quote.attribution = "Coach quote";

    spacer.height = 120;

    const html = serializeBuilderPageToHtml(
      {
        schemaVersion: 2,
        title: "All blocks",
        artboard: {
          width: 1120,
          minHeight: 860,
          background: hero.desktop.zIndex >= 0
            ? createDefaultChapterBuilderChrome({ chapterName: "WIAL USA" }).header.background
            : createDefaultChapterBuilderChrome({ chapterName: "WIAL USA" }).header.background,
          nodes: [hero, text, image, button, quote, spacer],
        },
      },
      createDefaultChapterBuilderChrome({
        chapterName: "WIAL USA",
        contactEmail: "usa@wial.org",
      }),
    );

    expect(html).toContain('data-builder-surface="header"');
    expect(html).toContain('data-builder-surface="page"');
    expect(html).toContain('data-builder-surface="footer"');
    expect(html).toContain('data-builder-node="hero"');
    expect(html).toContain("<h1>Hero title</h1>");
    expect(html).toContain('data-builder-node="text"');
    expect(html).toContain("<h2>Text title</h2>");
    expect(html).toContain('data-builder-node="image"');
    expect(html).toContain('src="https://example.com/hero.jpg"');
    expect(html).toContain('data-builder-node="button"');
    expect(html).toContain(">Open form<");
    expect(html).toContain('data-builder-node="quote"');
    expect(html).toContain("Coach quote");
    expect(html).toContain('data-builder-node="spacer"');
    expect(html).toContain('height:120px');
    expect(html).not.toContain("data-builder-section");
  });
});
