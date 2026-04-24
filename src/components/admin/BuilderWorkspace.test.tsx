import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createInitialBuilderChromeState,
  createInitialBuilderPageState,
} from "@/lib/builder-page";
import { BuilderWorkspace } from "./BuilderWorkspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

function renderWorkspace() {
  return renderToStaticMarkup(
    <BuilderWorkspace
      availablePages={[
        {
          id: "page-1",
          title: "About Mexico",
        },
      ]}
      chapterId="chapter-1"
      chapterName="Mexico"
      chapterSubdomain="mexico"
      initialHasPublishedBuilderSnapshot={false}
      initialChromeState={createInitialBuilderChromeState({
        chapterName: "Mexico",
        contactEmail: "mexico@wial.org",
      })}
      initialLiveRenderSource="legacy"
      initialState={createInitialBuilderPageState({
        pageTitle: "About Mexico",
        chapterName: "Mexico",
      })}
      pageId="page-1"
      pageSlug="about"
      pageTitle="About Mexico"
      published
    />,
  );
}

describe("BuilderWorkspace", () => {
  it("uses the fullscreen workspace itself as the vertical scroll container", () => {
    const html = renderWorkspace();

    expect(html).toContain("fixed inset-0");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("overscroll-contain");
    expect(html).not.toContain("h-full overflow-auto bg-[radial-gradient");
  });

  it("keeps the desktop canvas inside the center lane instead of bleeding under the side rails", () => {
    const html = renderWorkspace();

    expect(html).toContain("mx-auto w-max min-w-full space-y-6");
    expect(html).toContain("xl:grid-cols-[284px_minmax(0,1fr)_360px]");
    expect(html).not.toContain("min-w-[1240px]");
  });

  it("uses site-panel panels and the --background token for the editor shell", () => {
    const html = renderWorkspace();

    expect(html).toContain("site-panel");
    expect(html).toContain("bg-[var(--background)]");
  });

  it("lists only page nodes in the Layers panel and exposes no header/footer surface buttons", () => {
    const html = renderWorkspace();

    // No surface switcher buttons for header / footer
    expect(html).not.toContain(">Header<");
    expect(html).not.toContain(">Footer<");
    // No "Add to Header" / "Add to Footer" controls
    expect(html).not.toContain("Add to Header");
    expect(html).not.toContain("Add to Footer");
    // Layers panel advertises itself as page-only
    expect(html).toContain("Add to page");
  });

  it("renders footer content inputs in the inspector when nothing is selected", () => {
    // Start with an empty artboard so nothing is selected by default
    const emptyState = createInitialBuilderPageState({
      pageTitle: "About Mexico",
      chapterName: "Mexico",
    });
    emptyState.draft.artboard.nodes = [];

    const html = renderToStaticMarkup(
      <BuilderWorkspace
        availablePages={[{ id: "page-1", title: "About Mexico" }]}
        chapterId="chapter-1"
        chapterName="Mexico"
        chapterSubdomain="mexico"
        initialHasPublishedBuilderSnapshot={false}
        initialChromeState={createInitialBuilderChromeState({
          chapterName: "Mexico",
          contactEmail: "mexico@wial.org",
        })}
        initialLiveRenderSource="legacy"
        initialState={emptyState}
        pageId="page-1"
        pageSlug="about"
        pageTitle="About Mexico"
        published
      />,
    );

    expect(html).toContain("Footer heading");
    expect(html).toContain("Footer body");
    expect(html).toContain("Footer CTA label");
    expect(html).toContain("Footer CTA href");
    expect(html).toContain("Footer legal");
  });

  it("does not defer controlled builder input updates through startTransition", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/admin/BuilderWorkspace.tsx"), "utf8");

    expect(source).not.toContain("startTransition(() => {\n      setBuilderState");
    expect(source).not.toContain("startTransition(() => {\n        setBuilderChromeState");
  });
});
