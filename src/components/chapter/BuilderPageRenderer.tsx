import React from "react";
import {
  createDefaultChapterBuilderChrome,
  getFooterContent,
  sortBuilderNodesForMobile,
} from "@/lib/builder-page";
import type {
  BuilderArtboardV2,
  BuilderNodeV2,
  BuilderPageDocV2,
  BuilderSectionTone,
  BuilderSurfaceDocV2,
  BuilderTextAlign,
  ChapterBuilderChromeV1,
  ChapterRecord,
} from "@/lib/types";

type BuilderPageRendererProps = {
  chapter: Pick<ChapterRecord, "name" | "contactEmail" | "contactPhone">;
  doc: BuilderPageDocV2;
  chrome: ChapterBuilderChromeV1 | null;
  embedded?: boolean;
  forceViewport?: "desktop" | "mobile";
};

type SurfaceKind = "header" | "page" | "footer";

type BuilderNodeViewProps = {
  node: BuilderNodeV2;
  tone: BuilderSectionTone;
  mode: "public" | "editor";
};

function getTextAlignClassName(align: BuilderTextAlign) {
  switch (align) {
    case "center":
      return "items-center text-center";
    case "right":
      return "items-end text-right";
    default:
      return "items-start text-left";
  }
}

function getSurfaceTheme(tone: BuilderSectionTone) {
  const dark = tone === "ink";

  return {
    dark,
    shellClassName: dark ? "text-white" : "text-slate-950",
    mutedClassName: dark ? "text-white/68" : "text-slate-600",
    quietClassName: dark ? "text-white/52" : "text-slate-500",
    dividerClassName: dark ? "border-white/12" : "border-slate-200/90",
    buttonPrimaryClassName: dark
      ? "bg-white text-slate-950 hover:bg-white/90"
      : "bg-[#ce0037] text-white shadow-[0_16px_34px_rgba(206,0,55,0.24)] hover:bg-[#b40030]",
    buttonSecondaryClassName: dark
      ? "border-white/16 text-white hover:bg-white/8"
      : "border-[#00778b]/30 text-[#112854] hover:border-[#00778b]/50 hover:bg-[#00778b]/8",
  };
}

function getNodeLabel(node: BuilderNodeV2) {
  switch (node.type) {
    case "hero":
      return node.title || "Hero";
    case "text":
      return node.title || "Text";
    case "image":
      return node.alt || "Image";
    case "button":
      return node.label || "Button";
    case "quote":
      return node.attribution || "Quote";
    case "spacer":
      return "Spacer";
  }
}

export function getBuilderNodeLabel(node: BuilderNodeV2) {
  return getNodeLabel(node);
}

function renderParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => <p key={paragraph}>{paragraph}</p>);
}

export function BuilderNodeView({
  node,
  tone,
  mode,
}: Readonly<BuilderNodeViewProps>) {
  const theme = getSurfaceTheme(tone);
  const isEditor = mode === "editor";
  const alignClassName =
    node.type === "image" || node.type === "spacer" ? "" : getTextAlignClassName(node.align);

  if (node.type === "hero") {
    const cardClassName = theme.dark
      ? "rounded-[1.6rem] border border-white/12 bg-slate-950/58 p-7 shadow-[0_26px_70px_rgba(0,0,0,0.28)] backdrop-blur"
      : "rounded-[1.6rem] border border-white/80 bg-white/[0.94] p-7 shadow-[0_28px_70px_rgba(17,40,84,0.16)] backdrop-blur";

    return (
      <div className={`flex h-full w-full flex-col justify-center gap-5 ${alignClassName} ${theme.shellClassName} ${cardClassName}`}>
        {node.eyebrow ? (
          <p className={`text-[0.72rem] font-semibold uppercase tracking-[0.28em] ${theme.dark ? "text-[#93b3fc]" : "text-[#93b3fc]"}`}>
            {node.eyebrow}
          </p>
        ) : null}
        <h1
          className={`font-display tracking-[-0.08em] ${
            isEditor ? "text-[3rem] leading-[0.92]" : "text-[3.3rem] leading-[0.9] md:text-[4.8rem]"
          }`}
        >
          {node.title}
        </h1>
        {node.body ? (
          <div className={`max-w-2xl space-y-4 text-lg leading-8 ${theme.mutedClassName}`}>
            {renderParagraphs(node.body)}
          </div>
        ) : null}
        {node.buttonLabel && node.buttonHref ? (
          <a
            className={`inline-flex min-h-12 items-center rounded-full px-6 py-3 text-sm font-semibold transition ${theme.buttonPrimaryClassName}`}
            href={node.buttonHref}
          >
            {node.buttonLabel}
          </a>
        ) : null}
      </div>
    );
  }

  if (node.type === "text") {
    const cardClassName = theme.dark
      ? "rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-6"
      : "rounded-[1.35rem] border border-white/70 bg-white/[0.78] p-6 shadow-[0_18px_44px_rgba(17,40,84,0.08)]";

    return (
      <div className={`flex h-full w-full flex-col justify-center gap-4 ${alignClassName} ${theme.shellClassName} ${cardClassName}`}>
        {node.title ? (
          <h2
            className={`font-display tracking-[-0.06em] ${
              isEditor ? "text-[2.1rem] leading-tight" : "text-[2.2rem] leading-tight md:text-[2.7rem]"
            }`}
          >
            {node.title}
          </h2>
        ) : null}
        <div className={`space-y-4 text-base leading-8 ${theme.mutedClassName}`}>
          {renderParagraphs(node.body)}
        </div>
      </div>
    );
  }

  if (node.type === "image") {
    return (
      <div className="flex h-full w-full flex-col gap-3">
        <div className="relative h-full overflow-hidden rounded-[1.35rem] border border-white/70 bg-[linear-gradient(135deg,#f8fafc_25%,#eef2f6_25%,#eef2f6_50%,#f8fafc_50%,#f8fafc_75%,#eef2f6_75%)] bg-[length:24px_24px] shadow-[0_26px_60px_rgba(17,40,84,0.12)]">
          {node.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={node.alt || "Builder image"}
              className={`h-full w-full ${node.fit === "contain" ? "object-contain" : "object-cover"}`}
              src={node.src}
            />
          ) : (
            <div className={`flex h-full items-center justify-center px-8 text-center text-sm font-medium ${theme.mutedClassName}`}>
              Add an image URL or upload a file.
            </div>
          )}
        </div>
        {node.caption ? (
          <p className={`text-sm leading-6 ${theme.quietClassName}`}>{node.caption}</p>
        ) : null}
      </div>
    );
  }

  if (node.type === "button") {
    return (
      <div className={`flex h-full w-full flex-col justify-center ${alignClassName} ${theme.shellClassName}`}>
        <a
          className={`inline-flex min-h-12 items-center rounded-sm border px-7 py-3 text-sm font-semibold uppercase tracking-[0.12em] transition ${
            node.tone === "secondary"
              ? theme.buttonSecondaryClassName
              : theme.buttonPrimaryClassName
          }`}
          href={node.href}
        >
          {node.label}
        </a>
      </div>
    );
  }

  if (node.type === "quote") {
    return (
      <div className={`flex h-full w-full flex-col justify-center gap-5 ${alignClassName} ${theme.shellClassName}`}>
        <p
          className={`font-display tracking-[-0.05em] ${
            isEditor ? "text-[2rem] leading-[1.12]" : "text-[2.2rem] leading-[1.08] md:text-[3rem]"
          }`}
        >
          &quot;{node.quote}&quot;
        </p>
        {node.attribution ? (
          <span className={`text-[0.72rem] font-semibold uppercase tracking-[0.26em] ${theme.quietClassName}`}>
            {node.attribution}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center">
      <div className={`h-px w-full border-t border-dashed ${theme.dividerClassName}`} />
    </div>
  );
}

function BuilderBrandBar({
  chrome,
  tone,
}: Readonly<{
  chrome: ChapterBuilderChromeV1;
  tone: BuilderSectionTone;
}>) {
  const theme = getSurfaceTheme(tone);

  return (
    <div className={`flex flex-col gap-5 border-b pb-6 md:flex-row md:items-center md:justify-between ${theme.dividerClassName}`}>
      <a
        className="flex items-center gap-3 text-left"
        href={chrome.brandHref || "/"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="WIAL logo"
          className="h-14 w-auto object-contain"
          src="/assets/logo.webp"
        />
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.7rem] tracking-[-0.07em]">WIAL</span>
          <span className={`mt-1 text-[0.66rem] font-semibold uppercase tracking-[0.2em] ${theme.quietClassName}`}>
            {chrome.brandLabel}
          </span>
        </span>
      </a>
      <nav className="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-semibold">
        {chrome.navigationItems.map((item) => (
          <a className={`transition hover:opacity-70 ${theme.mutedClassName}`} href={item.href} key={`${item.href}-${item.label}`}>
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

function DesktopSurface({
  kind,
  surface,
  tone,
  mode,
}: Readonly<{
  kind: SurfaceKind;
  surface: BuilderSurfaceDocV2 | BuilderArtboardV2;
  tone: BuilderSectionTone;
  mode: "public" | "editor";
}>) {
  return (
    <div
      className="relative mx-auto w-full max-w-[1120px]"
      data-builder-surface-stage={kind}
      style={{
        minHeight: `${surface.minHeight}px`,
      }}
    >
      {surface.nodes.map((node) => (
        <div
          className="absolute"
          key={node.id}
          style={{
            left: `${node.desktop.x}px`,
            top: `${node.desktop.y}px`,
            width: `${node.desktop.width}px`,
            height: node.type === "spacer" ? `${node.height}px` : `${node.desktop.height}px`,
            zIndex: node.desktop.zIndex,
          }}
        >
          <BuilderNodeView mode={mode} node={node} tone={tone} />
        </div>
      ))}
    </div>
  );
}

function MobileSurface({
  surface,
  tone,
  mode,
}: Readonly<{
  surface: BuilderSurfaceDocV2 | BuilderArtboardV2;
  tone: BuilderSectionTone;
  mode: "public" | "editor";
}>) {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7">
      {sortBuilderNodesForMobile(surface.nodes).map((node) => (
        <div key={node.id}>
          <BuilderNodeView mode={mode} node={node} tone={tone} />
        </div>
      ))}
    </div>
  );
}

function BuilderSurface({
  chrome,
  embedded,
  forceViewport,
  kind,
  mode,
  surface,
}: Readonly<{
  chrome: ChapterBuilderChromeV1;
  embedded: boolean;
  forceViewport?: "desktop" | "mobile";
  kind: Exclude<SurfaceKind, "footer">;
  mode: "public" | "editor";
  surface: BuilderSurfaceDocV2 | BuilderArtboardV2;
}>) {
  const tone = surface.background.tone;
  const theme = getSurfaceTheme(tone);
  const shellPadding = embedded ? "px-5 py-6 md:px-7 md:py-7" : "px-6 py-8 md:px-10 md:py-10";
  const shellClassName = kind === "page" ? "border-y border-black/5" : "border-b border-black/5";

  return (
    <section
      className={`${shellClassName} ${shellPadding} ${theme.shellClassName}`}
      data-builder-surface={kind}
      style={{
        backgroundImage: surface.background.color,
        boxShadow: `inset 0 1px 0 ${surface.background.accent}`,
      }}
    >
      <div className="mx-auto max-w-[1180px]">
        {kind === "header" ? <BuilderBrandBar chrome={chrome} tone={tone} /> : null}

        {forceViewport ? (
          forceViewport === "desktop" ? (
            <DesktopSurface kind={kind} mode={mode} surface={surface} tone={tone} />
          ) : (
            <MobileSurface mode={mode} surface={surface} tone={tone} />
          )
        ) : (
          <>
            <div className="hidden md:block">
              <DesktopSurface kind={kind} mode={mode} surface={surface} tone={tone} />
            </div>
            <div className="md:hidden">
              <MobileSurface mode={mode} surface={surface} tone={tone} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function BuilderFooter({
  chapter,
  chrome,
  embedded,
}: Readonly<{
  chapter: Pick<ChapterRecord, "name" | "contactEmail" | "contactPhone">;
  chrome: ChapterBuilderChromeV1;
  embedded: boolean;
}>) {
  const content = getFooterContent(chrome);
  const shellPadding = embedded ? "px-5 py-8 md:px-7 md:py-10" : "px-6 py-10 md:px-10 md:py-14";
  const legal =
    content.legal || `${chapter.name} chapter site on the shared WIAL platform.`;

  return (
    <section
      className={`border-t border-[color:var(--line)] bg-[var(--background)] text-[color:var(--foreground)] ${shellPadding}`}
      data-builder-surface="footer"
    >
      <div className="mx-auto grid max-w-[1180px] gap-8 md:grid-cols-[1.3fr_1fr] md:items-start">
        <div className="space-y-4">
          {content.heading ? (
            <h2 className="font-display text-3xl tracking-[-0.06em] text-teal-deep md:text-[2.4rem]">
              {content.heading}
            </h2>
          ) : null}
          {content.body ? (
            <div className="max-w-2xl space-y-3 text-base leading-7 text-[color:var(--foreground)]/75">
              {renderParagraphs(content.body)}
            </div>
          ) : null}
          {content.ctaLabel && content.ctaHref ? (
            <a className="button-link primary" href={content.ctaHref}>
              {content.ctaLabel}
            </a>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 border-t border-[color:var(--line)] pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <p className="font-display text-2xl tracking-[-0.06em] text-teal-deep">
            {chrome.brandLabel}
          </p>
          <p className="text-sm leading-6 text-[color:var(--foreground)]/60">{legal}</p>
        </div>
      </div>
    </section>
  );
}

export function BuilderPageRenderer({
  chapter,
  doc,
  chrome,
  embedded = false,
  forceViewport,
}: BuilderPageRendererProps) {
  const resolvedChrome =
    chrome ??
    createDefaultChapterBuilderChrome({
      chapterName: chapter.name,
      contactEmail: chapter.contactEmail,
      contactPhone: chapter.contactPhone,
    });

  return (
    <div
      className={embedded ? "bg-[#f7f3ec]" : "min-h-screen bg-[linear-gradient(180deg,#fffdf9,#f7f1e8)]"}
      data-builder-page=""
    >
      <BuilderSurface
        chrome={resolvedChrome}
        embedded={embedded}
        forceViewport={forceViewport}
        kind="header"
        mode={embedded ? "editor" : "public"}
        surface={resolvedChrome.header}
      />
      <BuilderSurface
        chrome={resolvedChrome}
        embedded={embedded}
        forceViewport={forceViewport}
        kind="page"
        mode={embedded ? "editor" : "public"}
        surface={doc.artboard}
      />
      <BuilderFooter chapter={chapter} chrome={resolvedChrome} embedded={embedded} />
    </div>
  );
}
