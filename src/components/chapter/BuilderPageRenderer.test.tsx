import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createBuilderNode,
  createDefaultChapterBuilderChrome,
  createInitialBuilderPageState,
  setFooterBody,
  setFooterCtaHref,
  setFooterCtaLabel,
  setFooterHeading,
  setFooterLegal,
} from "@/lib/builder-page";
import { BuilderNodeView, BuilderPageRenderer } from "./BuilderPageRenderer";

describe("BuilderPageRenderer", () => {
  it("renders a full-page builder composition with shared chrome", () => {
    const state = createInitialBuilderPageState({
      pageTitle: "About",
      chapterName: "WIAL Mexico",
    });
    const chrome = createDefaultChapterBuilderChrome({
      chapterName: "WIAL Mexico",
      contactEmail: "mexico@wial.org",
    });

    const html = renderToStaticMarkup(
      <BuilderPageRenderer
        chapter={{
          name: "WIAL Mexico",
          contactEmail: "mexico@wial.org",
          contactPhone: null,
        }}
        chrome={chrome}
        doc={state.draft}
      />,
    );

    expect(html).toContain('data-builder-page=""');
    expect(html).toContain('data-builder-surface="header"');
    expect(html).toContain('data-builder-surface="page"');
    expect(html).toContain('data-builder-surface="footer"');
    expect(html).not.toContain("data-builder-section");
    expect(html).toContain("WIAL Mexico");
  });

  it("renders footer heading, body, CTA, and legal from derived content", () => {
    const state = createInitialBuilderPageState({
      pageTitle: "Home",
      chapterName: "WIAL Mexico",
    });
    let chrome = createDefaultChapterBuilderChrome({
      chapterName: "WIAL Mexico",
    });

    chrome = setFooterHeading(chrome, "Stay in touch");
    chrome = setFooterBody(chrome, "Reach out to the chapter team for collaborations.");
    chrome = setFooterCtaLabel(chrome, "Email us");
    chrome = setFooterCtaHref(chrome, "/contact-us");
    chrome = setFooterLegal(chrome, "All rights reserved WIAL Mexico.");

    const html = renderToStaticMarkup(
      <BuilderPageRenderer
        chapter={{ name: "WIAL Mexico", contactEmail: null, contactPhone: null }}
        chrome={chrome}
        doc={state.draft}
      />,
    );

    expect(html).toContain("Stay in touch");
    expect(html).toContain("Reach out to the chapter team");
    expect(html).toContain("Email us");
    expect(html).toContain('href="/contact-us"');
    expect(html).toContain("All rights reserved WIAL Mexico.");
    // Footer CTA uses the site primary button class
    expect(html).toContain("button-link");
  });

  it("does not render legacy freeform footer nodes beyond the structured slots", () => {
    const state = createInitialBuilderPageState({
      pageTitle: "Home",
      chapterName: "WIAL Mexico",
    });
    const baseChrome = createDefaultChapterBuilderChrome({
      chapterName: "WIAL Mexico",
    });

    const legacyChrome = {
      ...baseChrome,
      footer: {
        ...baseChrome.footer,
        nodes: [
          ...baseChrome.footer.nodes,
          {
            id: "legacy-extra-quote",
            type: "quote" as const,
            desktop: { x: 30, y: 260, width: 400, height: 160, zIndex: 9 },
            quote: "EXTRA_LEGACY_QUOTE_MARKER",
            attribution: "Legacy author",
            align: "left" as const,
          },
          {
            id: "legacy-extra-image",
            type: "image" as const,
            desktop: { x: 500, y: 260, width: 300, height: 160, zIndex: 10 },
            src: "https://example.com/legacy.png",
            alt: "EXTRA_LEGACY_IMAGE_ALT",
            fit: "cover" as const,
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      <BuilderPageRenderer
        chapter={{ name: "WIAL Mexico", contactEmail: null, contactPhone: null }}
        chrome={legacyChrome}
        doc={state.draft}
      />,
    );

    expect(html).not.toContain("EXTRA_LEGACY_QUOTE_MARKER");
    expect(html).not.toContain("EXTRA_LEGACY_IMAGE_ALT");
  });

  it("renders light-surface nodes with an explicit dark foreground", () => {
    const hero = createBuilderNode("hero");

    if (hero.type !== "hero") {
      throw new Error("unexpected node type");
    }

    const html = renderToStaticMarkup(
      <BuilderNodeView mode="editor" node={hero} tone="canvas" />,
    );

    expect(html).toContain("text-slate-950");
    expect(html).not.toContain("justify-center gap-5 items-start text-left text-white");
  });

  it("renders ink-surface nodes with an explicit light foreground", () => {
    const quote = createBuilderNode("quote");

    if (quote.type !== "quote") {
      throw new Error("unexpected node type");
    }

    const html = renderToStaticMarkup(
      <BuilderNodeView mode="editor" node={quote} tone="ink" />,
    );

    expect(html).toContain("text-white");
  });
});
