import { navigationItems } from "@/lib/routing";
import type {
  BuilderArtboardV2,
  BuilderBlockV1,
  BuilderButtonTone,
  BuilderDesktopFrame,
  BuilderImageFit,
  BuilderNodeV2,
  BuilderPageDocV1,
  BuilderPageDocV2,
  BuilderPageStateV2,
  BuilderSectionBackgroundV1,
  BuilderSectionTone,
  BuilderSectionV1,
  BuilderSurfaceDocV2,
  BuilderTextAlign,
  ChapterBuilderChromeStateV1,
  ChapterBuilderChromeV1,
  ContentPageRecord,
  NavigationItem,
  PageEditorKind,
} from "@/lib/types";

const DEFAULT_ARTBOARD_WIDTH = 1120;
const MIN_SURFACE_HEIGHT = 120;
const MIN_ARTBOARD_HEIGHT = 720;
const MAX_SURFACE_HEIGHT = 3200;
const MIN_BLOCK_WIDTH = 80;
const MAX_BLOCK_WIDTH = 1120;
const MIN_BLOCK_HEIGHT = 48;
const MAX_BLOCK_HEIGHT = 900;
const MAX_BLOCKS_PER_SURFACE = 40;
const MAX_SECTIONS = 24;
const MAX_NAV_ITEMS = 8;
const WIAL_LIVE_ASSETS = {
  hero: "https://wial.org/wp-content/uploads/2025/12/yaswanthh.jpg",
  action: "https://wial.org/wp-content/uploads/2025/12/home-img-1.jpg",
  certification: "https://wial.org/wp-content/uploads/2025/12/home-img-3.jpg",
};

const sectionBackgrounds: Record<BuilderSectionTone, BuilderSectionBackgroundV1> = {
  canvas: {
    tone: "canvas",
    color: "linear-gradient(180deg, rgba(248,250,252,0.98), rgba(238,242,246,0.96))",
    accent: "rgba(0,119,139,0.10)",
  },
  warm: {
    tone: "warm",
    color: "linear-gradient(135deg, rgba(255,248,239,0.98), rgba(252,244,233,0.94))",
    accent: "rgba(255,172,33,0.18)",
  },
  mint: {
    tone: "mint",
    color: "linear-gradient(135deg, rgba(234,249,245,0.98), rgba(246,255,251,0.94))",
    accent: "rgba(42,193,167,0.18)",
  },
  blush: {
    tone: "blush",
    color: "linear-gradient(135deg, rgba(255,242,246,0.98), rgba(255,249,251,0.94))",
    accent: "rgba(206,0,55,0.16)",
  },
  ink: {
    tone: "ink",
    color: "linear-gradient(135deg, rgba(23,31,36,1), rgba(36,44,51,0.96))",
    accent: "rgba(255,255,255,0.16)",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toTrimmedString(value: unknown, fallback = "", maxLength = 2000) {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim().slice(0, maxLength);
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const nextValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(nextValue)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(nextValue)));
}

function toTextAlign(value: unknown, fallback: BuilderTextAlign = "left"): BuilderTextAlign {
  if (value === "left" || value === "center" || value === "right") {
    return value;
  }

  return fallback;
}

function toButtonTone(value: unknown, fallback: BuilderButtonTone = "primary"): BuilderButtonTone {
  return value === "secondary" ? "secondary" : fallback;
}

function toImageFit(value: unknown, fallback: BuilderImageFit = "cover"): BuilderImageFit {
  return value === "contain" ? "contain" : fallback;
}

function toSectionTone(
  value: unknown,
  fallback: BuilderSectionTone = "canvas",
): BuilderSectionTone {
  if (
    value === "canvas" ||
    value === "warm" ||
    value === "mint" ||
    value === "blush" ||
    value === "ink"
  ) {
    return value;
  }

  return fallback;
}

function getBackgroundByTone(tone: BuilderSectionTone) {
  return sectionBackgrounds[tone];
}

function createId(prefix: string) {
  const fallback = Math.random().toString(36).slice(2, 10);

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${fallback}`;
}

function sanitizeDesktopFrame(value: unknown, fallback: BuilderDesktopFrame): BuilderDesktopFrame {
  const record = isRecord(value) ? value : {};

  return {
    x: clampNumber(record.x, fallback.x, 0, 1400),
    y: clampNumber(record.y, fallback.y, 0, 4800),
    width: clampNumber(record.width, fallback.width, MIN_BLOCK_WIDTH, MAX_BLOCK_WIDTH),
    height: clampNumber(record.height, fallback.height, MIN_BLOCK_HEIGHT, MAX_BLOCK_HEIGHT),
    zIndex: clampNumber(record.zIndex, fallback.zIndex, 0, 128),
  };
}

function sanitizeNode(value: unknown, index: number): BuilderNodeV2 | null {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }

  const fallbackFrame: BuilderDesktopFrame = {
    x: 60,
    y: 60 + index * 40,
    width: 420,
    height: 200,
    zIndex: index,
  };
  const desktop = sanitizeDesktopFrame(value.desktop, fallbackFrame);
  const id = toTrimmedString(value.id, createId("node"), 60);

  switch (value.type) {
    case "hero":
      return {
        id,
        type: "hero",
        desktop,
        eyebrow: toTrimmedString(value.eyebrow, ""),
        title: toTrimmedString(value.title, "Untitled hero", 240),
        body: toTrimmedString(value.body, "", 3000),
        buttonLabel: toTrimmedString(value.buttonLabel, "", 120) || undefined,
        buttonHref: toTrimmedString(value.buttonHref, "", 500) || undefined,
        align: toTextAlign(value.align),
      };
    case "text":
      return {
        id,
        type: "text",
        desktop,
        title: toTrimmedString(value.title, "", 240) || undefined,
        body: toTrimmedString(value.body, "", 5000),
        align: toTextAlign(value.align),
      };
    case "image":
      return {
        id,
        type: "image",
        desktop,
        src: toTrimmedString(value.src, ""),
        alt: toTrimmedString(value.alt, ""),
        caption: toTrimmedString(value.caption, "", 300) || undefined,
        fit: toImageFit(value.fit),
      };
    case "button":
      return {
        id,
        type: "button",
        desktop,
        label: toTrimmedString(value.label, "Button", 120),
        href: toTrimmedString(value.href, "#", 500) || "#",
        tone: toButtonTone(value.tone),
        align: toTextAlign(value.align, "center"),
      };
    case "quote":
      return {
        id,
        type: "quote",
        desktop,
        quote: toTrimmedString(value.quote, "Quote", 1200),
        attribution: toTrimmedString(value.attribution, "", 240),
        align: toTextAlign(value.align),
      };
    case "spacer":
      return {
        id,
        type: "spacer",
        desktop: {
          ...desktop,
          height: clampNumber(value.height, desktop.height, 48, 420),
        },
        height: clampNumber(value.height, desktop.height, 48, 420),
      };
    default:
      return null;
  }
}

function sanitizeSection(value: unknown, index: number): BuilderSectionV1 | null {
  if (!isRecord(value)) {
    return null;
  }

  const tone = toSectionTone(
    value.background && isRecord(value.background) ? value.background.tone : value.tone,
  );
  const background = getBackgroundByTone(tone);
  const rawBlocks = Array.isArray(value.blocks) ? value.blocks.slice(0, MAX_BLOCKS_PER_SURFACE) : [];
  const blocks = rawBlocks
    .map((block, blockIndex) => sanitizeNode(block, blockIndex))
    .filter((block): block is BuilderBlockV1 => Boolean(block));

  return {
    id: toTrimmedString(value.id, createId("section"), 60),
    name: toTrimmedString(value.name, `Section ${index + 1}`, 120) || `Section ${index + 1}`,
    minHeight: clampNumber(value.minHeight, 560, MIN_SURFACE_HEIGHT, MAX_SURFACE_HEIGHT),
    paddingTop: clampNumber(value.paddingTop, 64, 0, 220),
    paddingBottom: clampNumber(value.paddingBottom, 64, 0, 220),
    background,
    blocks,
  };
}

function sanitizeV1Doc(value: unknown, fallbackTitle = "Untitled page"): BuilderPageDocV1 | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawSections = Array.isArray(value.sections) ? value.sections.slice(0, MAX_SECTIONS) : [];
  const sections = rawSections
    .map((section, index) => sanitizeSection(section, index))
    .filter((section): section is BuilderSectionV1 => Boolean(section));

  return {
    schemaVersion: 1,
    title: toTrimmedString(value.title, fallbackTitle, 200) || fallbackTitle,
    sections,
  };
}

function sanitizeSurface(value: unknown, fallback: BuilderSurfaceDocV2): BuilderSurfaceDocV2 {
  const record = isRecord(value) ? value : {};
  const tone = toSectionTone(
    record.background && isRecord(record.background) ? record.background.tone : fallback.background.tone,
    fallback.background.tone,
  );
  const rawNodes = Array.isArray(record.nodes) ? record.nodes.slice(0, MAX_BLOCKS_PER_SURFACE) : [];
  const nodes = rawNodes
    .map((node, index) => sanitizeNode(node, index))
    .filter((node): node is BuilderNodeV2 => Boolean(node));

  return {
    minHeight: clampNumber(record.minHeight, fallback.minHeight, MIN_SURFACE_HEIGHT, MAX_SURFACE_HEIGHT),
    background: getBackgroundByTone(tone),
    nodes,
  };
}

function sanitizeArtboard(value: unknown, fallback: BuilderArtboardV2): BuilderArtboardV2 {
  const record = isRecord(value) ? value : {};
  const surface = sanitizeSurface(record, fallback);

  return {
    width: clampNumber(record.width, fallback.width, 900, DEFAULT_ARTBOARD_WIDTH),
    minHeight: clampNumber(record.minHeight, fallback.minHeight, MIN_ARTBOARD_HEIGHT, MAX_SURFACE_HEIGHT),
    background: surface.background,
    nodes: surface.nodes,
  };
}

function sanitizeV2Doc(value: unknown, fallbackTitle = "Untitled page"): BuilderPageDocV2 | null {
  if (!isRecord(value) || (!isRecord(value.artboard) && value.schemaVersion !== 2)) {
    return null;
  }

  const fallback = createDefaultBuilderPageDoc({
    chapterName: "",
    pageTitle: fallbackTitle,
  });

  return {
    schemaVersion: 2,
    title: toTrimmedString(value.title, fallbackTitle, 200) || fallbackTitle,
    artboard: sanitizeArtboard(value.artboard, fallback.artboard),
  };
}

function getSectionHeight(section: BuilderSectionV1) {
  const contentBottom = section.blocks.reduce((maxValue, block) => {
    const blockBottom =
      block.desktop.y + (block.type === "spacer" ? block.height : block.desktop.height);
    return Math.max(maxValue, blockBottom);
  }, 0);

  return Math.max(
    section.minHeight,
    section.paddingTop + contentBottom + section.paddingBottom,
  );
}

export function upgradeBuilderPageDocV1(doc: BuilderPageDocV1): BuilderPageDocV2 {
  const nodes: BuilderNodeV2[] = [];
  let surfaceOffset = 0;
  let maxBottom = 0;

  for (const section of doc.sections) {
    const sectionHeight = getSectionHeight(section);

    for (const block of section.blocks) {
      const topOffset = surfaceOffset + section.paddingTop + block.desktop.y;
      const nextNode: BuilderNodeV2 = {
        ...block,
        desktop: {
          ...block.desktop,
          y: topOffset,
        },
      };

      nodes.push(nextNode);
      maxBottom = Math.max(
        maxBottom,
        topOffset + (block.type === "spacer" ? block.height : block.desktop.height),
      );
    }

    surfaceOffset += sectionHeight;
  }

  return {
    schemaVersion: 2,
    title: doc.title,
    artboard: {
      width: DEFAULT_ARTBOARD_WIDTH,
      minHeight: Math.max(MIN_ARTBOARD_HEIGHT, surfaceOffset || maxBottom + 120),
      background: doc.sections[0]?.background ?? getBackgroundByTone("canvas"),
      nodes,
    },
  };
}

function sanitizePageDoc(value: unknown, fallbackTitle = "Untitled page"): BuilderPageDocV2 | null {
  if (!isRecord(value)) {
    return null;
  }

  const v2Doc = sanitizeV2Doc(value, fallbackTitle);

  if (v2Doc) {
    return v2Doc;
  }

  const v1Doc = sanitizeV1Doc(value, fallbackTitle);
  return v1Doc ? upgradeBuilderPageDocV1(v1Doc) : null;
}

function getDefaultNavigationItems(): NavigationItem[] {
  return [
    { href: "/", label: "Home" },
    ...navigationItems.slice(0, MAX_NAV_ITEMS - 1),
  ];
}

function sanitizeNavigationItems(value: unknown, fallback: NavigationItem[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .slice(0, MAX_NAV_ITEMS)
    .map((item) => {
      const record = isRecord(item) ? item : {};
      const label = toTrimmedString(record.label, "", 60);
      const href = toTrimmedString(record.href, "", 240);

      if (!label || !href) {
        return null;
      }

      return { label, href };
    })
    .filter((item): item is NavigationItem => Boolean(item));
}

function createDefaultSurface(
  tone: BuilderSectionTone,
  minHeight: number,
  nodes: BuilderNodeV2[] = [],
): BuilderSurfaceDocV2 {
  return {
    minHeight,
    background: getBackgroundByTone(tone),
    nodes,
  };
}

export function createDefaultBuilderPageDoc(input: {
  chapterName: string;
  pageTitle: string;
}): BuilderPageDocV2 {
  return {
    schemaVersion: 2,
    title: input.pageTitle,
    artboard: {
      width: DEFAULT_ARTBOARD_WIDTH,
      minHeight: 1160,
      background: getBackgroundByTone("canvas"),
      nodes: [
        {
          id: createId("node"),
          type: "image",
          desktop: {
            x: 0,
            y: 0,
            width: 1120,
            height: 520,
            zIndex: 0,
          },
          src: WIAL_LIVE_ASSETS.hero,
          alt: "Action Learning workshop",
          fit: "cover",
        },
        {
          id: createId("node"),
          type: "hero",
          desktop: {
            x: 56,
            y: 64,
            width: 470,
            height: 332,
            zIndex: 1,
          },
          eyebrow: "Action Learning",
          title: input.pageTitle === "Home" ? "What is Action Learning?" : input.pageTitle,
          body:
            "Action Learning is a practical way of thinking, doing business, and developing leaders while teams work on real problems.",
          align: "left",
          buttonLabel: "Read more",
          buttonHref: "/action-learning",
        },
        {
          id: createId("node"),
          type: "text",
          desktop: {
            x: 70,
            y: 610,
            width: 430,
            height: 270,
            zIndex: 2,
          },
          title: "WIAL is the world's leading certifying body for Action Learning",
          body:
            "Use this starter canvas as a live-page shaped draft. Move the cards, swap imagery, and tune copy in the inspector while the public page stays untouched until publish.",
          align: "left",
        },
        {
          id: createId("node"),
          type: "image",
          desktop: {
            x: 560,
            y: 610,
            width: 230,
            height: 210,
            zIndex: 3,
          },
          src: WIAL_LIVE_ASSETS.action,
          alt: "Action Learning card",
          fit: "cover",
          caption: "Action Learning",
        },
        {
          id: createId("node"),
          type: "image",
          desktop: {
            x: 820,
            y: 610,
            width: 230,
            height: 210,
            zIndex: 4,
          },
          src: WIAL_LIVE_ASSETS.certification,
          alt: "Certification card",
          fit: "cover",
          caption: "Certification",
        },
        {
          id: createId("node"),
          type: "quote",
          desktop: {
            x: 560,
            y: 870,
            width: 490,
            height: 190,
            zIndex: 5,
          },
          quote: "Solve urgent challenges while developing leaders, teams, and organizations.",
          attribution: "WIAL Action Learning",
          align: "left",
        },
      ],
    },
  };
}

export function createDefaultChapterBuilderChrome(input: {
  chapterName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}): ChapterBuilderChromeV1 {
  const footerText = [
    `${input.chapterName} chapter site`,
    input.contactEmail ? `Email: ${input.contactEmail}` : "",
    input.contactPhone ? `Phone: ${input.contactPhone}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    schemaVersion: 1,
    brandLabel: input.chapterName,
    brandHref: "/",
    navigationItems: getDefaultNavigationItems(),
    footerLegal: `${input.chapterName} chapter site on the shared WIAL platform.`,
    header: createDefaultSurface("canvas", 132),
    footer: createDefaultSurface("warm", 240, [
      {
        id: createId("node"),
        type: "text",
        desktop: {
          x: 70,
          y: 64,
          width: 520,
          height: 140,
          zIndex: 0,
        },
        title: "Stay connected",
        body:
          footerText ||
          "Add contact details, local chapter notes, chapter programs, or supporting footer content.",
        align: "left",
      },
      {
        id: createId("node"),
        type: "button",
        desktop: {
          x: 760,
          y: 94,
          width: 230,
          height: 86,
          zIndex: 1,
        },
        label: "Contact chapter",
        href: "/contact",
        tone: "primary",
        align: "center",
      },
    ]),
  };
}

export function createInitialBuilderChromeState(input: {
  chapterName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}): ChapterBuilderChromeStateV1 {
  return {
    schemaVersion: 1,
    draft: createDefaultChapterBuilderChrome(input),
    published: null,
  };
}

export function parseChapterBuilderChromeState(
  value: unknown,
  fallback: {
    chapterName: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
  },
): ChapterBuilderChromeStateV1 | null {
  const root =
    isRecord(value) && isRecord(value.builderChrome) ? value.builderChrome : value;

  if (!isRecord(root) || root.schemaVersion !== 1) {
    return null;
  }

  const fallbackDraft = createDefaultChapterBuilderChrome(fallback);
  const draftRecord = sanitizeChromeDoc(root.draft, fallbackDraft);
  const publishedRecord =
    root.published == null ? null : sanitizeChromeDoc(root.published, draftRecord);

  return {
    schemaVersion: 1,
    draft: draftRecord,
    published: publishedRecord,
  };
}

function sanitizeChromeDoc(value: unknown, fallback: ChapterBuilderChromeV1): ChapterBuilderChromeV1 {
  const record = isRecord(value) ? value : {};

  return {
    schemaVersion: 1,
    brandLabel: toTrimmedString(record.brandLabel, fallback.brandLabel, 120) || fallback.brandLabel,
    brandHref: toTrimmedString(record.brandHref, fallback.brandHref, 240) || fallback.brandHref,
    navigationItems: sanitizeNavigationItems(record.navigationItems, fallback.navigationItems),
    footerLegal:
      toTrimmedString(record.footerLegal, fallback.footerLegal, 280) || fallback.footerLegal,
    header: sanitizeSurface(record.header, fallback.header),
    footer: sanitizeSurface(record.footer, fallback.footer),
  };
}

export type BuilderFooterContent = {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  legal: string;
};

const FOOTER_TEXT_NODE_ID = "footer-content-text";
const FOOTER_BUTTON_NODE_ID = "footer-content-button";

const FOOTER_TEXT_DEFAULT_FRAME: BuilderDesktopFrame = {
  x: 70,
  y: 64,
  width: 520,
  height: 140,
  zIndex: 0,
};

const FOOTER_BUTTON_DEFAULT_FRAME: BuilderDesktopFrame = {
  x: 760,
  y: 94,
  width: 230,
  height: 86,
  zIndex: 1,
};

function findFirstTextNode(nodes: BuilderNodeV2[]) {
  return nodes.find((node): node is BuilderNodeV2 & { type: "text" } => node.type === "text");
}

function findFirstButtonNode(nodes: BuilderNodeV2[]) {
  return nodes.find((node): node is BuilderNodeV2 & { type: "button" } => node.type === "button");
}

export function getFooterContent(chrome: ChapterBuilderChromeV1): BuilderFooterContent {
  const textNode = findFirstTextNode(chrome.footer.nodes);
  const buttonNode = findFirstButtonNode(chrome.footer.nodes);

  return {
    heading: textNode?.title ?? "",
    body: textNode?.body ?? "",
    ctaLabel: buttonNode?.label ?? "",
    ctaHref: buttonNode?.href ?? "",
    legal: chrome.footerLegal ?? "",
  };
}

function ensureFooterTextNode(chrome: ChapterBuilderChromeV1): {
  nodes: BuilderNodeV2[];
  textIndex: number;
} {
  const nodes = [...chrome.footer.nodes];
  const index = nodes.findIndex((node) => node.type === "text");

  if (index >= 0) {
    return { nodes, textIndex: index };
  }

  const nextNode: BuilderNodeV2 = {
    id: FOOTER_TEXT_NODE_ID,
    type: "text",
    desktop: FOOTER_TEXT_DEFAULT_FRAME,
    title: "",
    body: "",
    align: "left",
  };
  nodes.push(nextNode);
  return { nodes, textIndex: nodes.length - 1 };
}

function ensureFooterButtonNode(chrome: ChapterBuilderChromeV1): {
  nodes: BuilderNodeV2[];
  buttonIndex: number;
} {
  const nodes = [...chrome.footer.nodes];
  const index = nodes.findIndex((node) => node.type === "button");

  if (index >= 0) {
    return { nodes, buttonIndex: index };
  }

  const nextNode: BuilderNodeV2 = {
    id: FOOTER_BUTTON_NODE_ID,
    type: "button",
    desktop: FOOTER_BUTTON_DEFAULT_FRAME,
    label: "Button",
    href: "#",
    tone: "primary",
    align: "center",
  };
  nodes.push(nextNode);
  return { nodes, buttonIndex: nodes.length - 1 };
}

function withFooterNodes(
  chrome: ChapterBuilderChromeV1,
  nodes: BuilderNodeV2[],
): ChapterBuilderChromeV1 {
  return {
    ...chrome,
    footer: {
      ...chrome.footer,
      nodes,
    },
  };
}

export function setFooterHeading(
  chrome: ChapterBuilderChromeV1,
  value: string,
): ChapterBuilderChromeV1 {
  const { nodes, textIndex } = ensureFooterTextNode(chrome);
  const target = nodes[textIndex];

  if (target.type !== "text") {
    return chrome;
  }

  nodes[textIndex] = {
    ...target,
    title: value,
  };

  return withFooterNodes(chrome, nodes);
}

export function setFooterBody(
  chrome: ChapterBuilderChromeV1,
  value: string,
): ChapterBuilderChromeV1 {
  const { nodes, textIndex } = ensureFooterTextNode(chrome);
  const target = nodes[textIndex];

  if (target.type !== "text") {
    return chrome;
  }

  nodes[textIndex] = {
    ...target,
    body: value,
  };

  return withFooterNodes(chrome, nodes);
}

export function setFooterCtaLabel(
  chrome: ChapterBuilderChromeV1,
  value: string,
): ChapterBuilderChromeV1 {
  const { nodes, buttonIndex } = ensureFooterButtonNode(chrome);
  const target = nodes[buttonIndex];

  if (target.type !== "button") {
    return chrome;
  }

  nodes[buttonIndex] = {
    ...target,
    label: value,
  };

  return withFooterNodes(chrome, nodes);
}

export function setFooterCtaHref(
  chrome: ChapterBuilderChromeV1,
  value: string,
): ChapterBuilderChromeV1 {
  const { nodes, buttonIndex } = ensureFooterButtonNode(chrome);
  const target = nodes[buttonIndex];

  if (target.type !== "button") {
    return chrome;
  }

  nodes[buttonIndex] = {
    ...target,
    href: value,
  };

  return withFooterNodes(chrome, nodes);
}

export function setFooterLegal(
  chrome: ChapterBuilderChromeV1,
  value: string,
): ChapterBuilderChromeV1 {
  return {
    ...chrome,
    footerLegal: value,
  };
}

export function mergeBuilderChromeIntoConfig(
  config: Record<string, unknown> | null | undefined,
  state: ChapterBuilderChromeStateV1,
) {
  return {
    ...(config ?? {}),
    builderChrome: state,
  } satisfies Record<string, unknown>;
}

export function createBuilderNode(type: BuilderNodeV2["type"], index = 0): BuilderNodeV2 {
  const desktop = {
    x: 72 + (index % 3) * 48,
    y: 72 + index * 40,
    width: 420,
    height: 180,
    zIndex: index,
  };

  switch (type) {
    case "hero":
      return {
        id: createId("node"),
        type,
        desktop: {
          ...desktop,
          width: 620,
          height: 240,
        },
        eyebrow: "New section",
        title: "Hero title",
        body: "Add a concise headline and supporting copy.",
        align: "left",
        buttonLabel: "Learn more",
        buttonHref: "/contact",
      };
    case "text":
      return {
        id: createId("node"),
        type,
        desktop,
        title: "Text block",
        body: "Add a paragraph, story, or detail section.",
        align: "left",
      };
    case "image":
      return {
        id: createId("node"),
        type,
        desktop: {
          ...desktop,
          width: 360,
          height: 260,
        },
        src: "",
        alt: "",
        caption: "",
        fit: "cover",
      };
    case "button":
      return {
        id: createId("node"),
        type,
        desktop: {
          ...desktop,
          width: 240,
          height: 96,
        },
        label: "Button label",
        href: "/contact",
        tone: "primary",
        align: "center",
      };
    case "quote":
      return {
        id: createId("node"),
        type,
        desktop: {
          ...desktop,
          width: 440,
          height: 220,
        },
        quote: "Add a testimonial or highlight quote.",
        attribution: "Source",
        align: "left",
      };
    case "spacer":
      return {
        id: createId("node"),
        type,
        desktop: {
          ...desktop,
          width: 320,
          height: 96,
        },
        height: 96,
      };
  }
}

export function createBuilderBlock(type: BuilderNodeV2["type"], index = 0) {
  return createBuilderNode(type, index);
}

export function createBuilderSection(
  name: string,
  options: {
    tone?: BuilderSectionTone;
    seedBlock?: BuilderBlockV1["type"];
    sectionIndex?: number;
  } = {},
): BuilderSectionV1 {
  return {
    id: createId("section"),
    name,
    minHeight: 480,
    paddingTop: 56,
    paddingBottom: 56,
    background: getBackgroundByTone(options.tone ?? "canvas"),
    blocks: options.seedBlock
      ? [createBuilderBlock(options.seedBlock, options.sectionIndex ?? 0)]
      : [],
  };
}

export function createInitialBuilderPageState(input: {
  chapterName: string;
  pageTitle: string;
}): BuilderPageStateV2 {
  return {
    editorKind: "builder",
    schemaVersion: 2,
    draft: createDefaultBuilderPageDoc(input),
    published: null,
  };
}

export function parseBuilderPageState(value: unknown): BuilderPageStateV2 | null {
  if (!isRecord(value) || value.editorKind !== "builder") {
    return null;
  }

  const draft = sanitizePageDoc(value.draft ?? value, "Untitled page");

  if (!draft) {
    return null;
  }

  const published = value.published == null ? null : sanitizePageDoc(value.published, draft.title);

  return {
    editorKind: "builder",
    schemaVersion: 2,
    draft,
    published,
  };
}

export function getPageEditorKind(bodyJson: unknown): PageEditorKind {
  return parseBuilderPageState(bodyJson) ? "builder" : "legacy";
}

export function getPublishedPageEditorKind(bodyJson: unknown, pagePublished: boolean): PageEditorKind {
  const builderState = parseBuilderPageState(bodyJson);
  return builderState?.published && pagePublished ? "builder" : "legacy";
}

export function getBuilderDocForPublicPage(
  page: Pick<ContentPageRecord, "published" | "builderPublished">,
) {
  if (!page.published) {
    return null;
  }

  return page.builderPublished ?? null;
}

export function sortBuilderNodesForMobile(nodes: BuilderNodeV2[]) {
  return [...nodes].sort((left, right) => {
    if (left.desktop.y !== right.desktop.y) {
      return left.desktop.y - right.desktop.y;
    }

    if (left.desktop.x !== right.desktop.x) {
      return left.desktop.x - right.desktop.x;
    }

    if (left.desktop.zIndex !== right.desktop.zIndex) {
      return left.desktop.zIndex - right.desktop.zIndex;
    }

    return left.id.localeCompare(right.id);
  });
}

export const sortBuilderBlocksForMobile = sortBuilderNodesForMobile;

export function getBuilderSurfaceBackgroundPreset(tone: BuilderSectionTone) {
  return getBackgroundByTone(tone);
}

export const getBuilderSectionBackgroundPreset = getBuilderSurfaceBackgroundPreset;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTextParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => `<p>${escapeHtml(segment).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function renderNodeToHtml(node: BuilderNodeV2) {
  switch (node.type) {
    case "hero":
      return [
        '<article data-builder-node="hero">',
        node.eyebrow ? `<p>${escapeHtml(node.eyebrow)}</p>` : "",
        `<h1>${escapeHtml(node.title)}</h1>`,
        node.body ? renderTextParagraphs(node.body) : "",
        node.buttonLabel && node.buttonHref
          ? `<p><a href="${escapeHtml(node.buttonHref)}">${escapeHtml(node.buttonLabel)}</a></p>`
          : "",
        "</article>",
      ]
        .filter(Boolean)
        .join("");
    case "text":
      return [
        '<article data-builder-node="text">',
        node.title ? `<h2>${escapeHtml(node.title)}</h2>` : "",
        renderTextParagraphs(node.body),
        "</article>",
      ].join("");
    case "image":
      return [
        '<figure data-builder-node="image">',
        `<img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}" />`,
        node.caption ? `<figcaption>${escapeHtml(node.caption)}</figcaption>` : "",
        "</figure>",
      ].join("");
    case "button":
      return `<p data-builder-node="button"><a href="${escapeHtml(node.href)}">${escapeHtml(node.label)}</a></p>`;
    case "quote":
      return [
        '<blockquote data-builder-node="quote">',
        `<p>${escapeHtml(node.quote)}</p>`,
        node.attribution ? `<cite>${escapeHtml(node.attribution)}</cite>` : "",
        "</blockquote>",
      ]
        .filter(Boolean)
        .join("");
    case "spacer":
      return `<div aria-hidden="true" data-builder-node="spacer" style="height:${node.height}px"></div>`;
  }
}

function renderSurfaceNodesToHtml(surface: BuilderSurfaceDocV2 | BuilderArtboardV2) {
  return sortBuilderNodesForMobile(surface.nodes).map(renderNodeToHtml).join("");
}

export function serializeBuilderPageToHtml(
  doc: BuilderPageDocV2,
  chrome?: ChapterBuilderChromeV1 | null,
) {
  const headerHtml = chrome
    ? [
        '<header data-builder-surface="header">',
        `<a href="${escapeHtml(chrome.brandHref)}">${escapeHtml(chrome.brandLabel)}</a>`,
        chrome.navigationItems.length
          ? `<nav><ul>${chrome.navigationItems
              .map(
                (item) =>
                  `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`,
              )
              .join("")}</ul></nav>`
          : "",
        renderSurfaceNodesToHtml(chrome.header),
        "</header>",
      ]
        .filter(Boolean)
        .join("")
    : "";

  const footerHtml = chrome
    ? [
        '<footer data-builder-surface="footer">',
        renderSurfaceNodesToHtml(chrome.footer),
        chrome.footerLegal ? `<p>${escapeHtml(chrome.footerLegal)}</p>` : "",
        "</footer>",
      ]
        .filter(Boolean)
        .join("")
    : "";

  return [
    headerHtml,
    `<main data-builder-surface="page">${renderSurfaceNodesToHtml(doc.artboard)}</main>`,
    footerHtml,
  ]
    .filter(Boolean)
    .join("");
}
