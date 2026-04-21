export const ACCESSIBILITY_MAIN_CONTENT_ID = "site-main-content";

export type AssistiveNavigationRoute = {
  href: string;
  label: string;
};

export type AssistiveNavigationTarget = AssistiveNavigationRoute & {
  aliases: string[];
  normalizedLabel: string;
};

export type VoiceNavigationAction =
  | { type: "open-menu" }
  | { type: "close-menu" }
  | { type: "navigate"; href: string; label: string }
  | { type: "scroll"; direction: "up" | "down" | "top" | "bottom" }
  | { type: "stop-listening" };

export type SpeechRecognitionResultAlternativeLike = {
  transcript: string;
};

export type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionResultAlternativeLike;
};

export type SpeechRecognitionResultListLike = {
  [index: number]: SpeechRecognitionResultLike;
  length: number;
};

export type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
};

export type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

export type SpeechRecognitionLike = EventTarget & {
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
};

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export type SpeechRecognitionSupportOptions = {
  SpeechRecognition?: unknown;
  isSecureContext?: boolean;
  webkitSpeechRecognition?: unknown;
};

export type ScreenReaderSupportOptions = {
  SpeechSynthesisUtterance?: unknown;
  speechSynthesis?: unknown;
};

const ROUTE_COMMAND_PREFIXES = [
  "go to ",
  "open ",
  "visit ",
];

function normalizeForMatching(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildRouteAliases(label: string) {
  const aliases = new Set<string>();
  const candidateLabels = [
    label,
    label.replaceAll("&", "and"),
    label.replaceAll("+", "plus"),
  ];

  for (const candidate of candidateLabels) {
    const normalized = normalizeForMatching(candidate);

    if (normalized) {
      aliases.add(normalized);
    }
  }

  for (const alias of [...aliases]) {
    if (alias.startsWith("open ")) {
      aliases.add(alias.slice("open ".length).trim());
    }

    if (alias.startsWith("view ")) {
      aliases.add(alias.slice("view ".length).trim());
    }

    if (alias.startsWith("update ")) {
      aliases.add(alias.slice("update ".length).trim());
    }
  }

  return [...aliases];
}

export function normalizeTranscript(value: string) {
  return normalizeForMatching(value);
}

export function sanitizeReadableText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

export function extractReadableText(root: ParentNode | null) {
  if (!root || !("cloneNode" in root)) {
    return "";
  }

  const clonedRoot = root.cloneNode(true) as Node & {
    querySelectorAll?: (selectors: string) => NodeListOf<Element>;
    textContent: string | null;
  };

  if (typeof clonedRoot.querySelectorAll === "function") {
    clonedRoot
      .querySelectorAll("script, style, noscript, [hidden], [aria-hidden='true']")
      .forEach((node: Element) => node.remove());
  }

  return sanitizeReadableText(clonedRoot.textContent ?? "");
}

export function buildAssistiveNavigationTargets(
  routes: AssistiveNavigationRoute[],
) {
  const deduped = new Map<string, AssistiveNavigationTarget>();

  for (const route of routes) {
    const aliases = buildRouteAliases(route.label);
    const normalizedLabel = aliases[0] ?? normalizeForMatching(route.label);

    if (!normalizedLabel) {
      continue;
    }

    const key = `${route.href}::${normalizedLabel}`;

    if (!deduped.has(key)) {
      deduped.set(key, {
        ...route,
        aliases,
        normalizedLabel,
      });
    }
  }

  return [...deduped.values()];
}

function findNavigationTarget(
  command: string,
  routes: AssistiveNavigationTarget[],
) {
  return (
    routes.find((route) => route.aliases.includes(command)) ??
    null
  );
}

export function matchVoiceNavigationCommand(
  transcript: string,
  routes: AssistiveNavigationTarget[],
): VoiceNavigationAction | null {
  const normalized = normalizeTranscript(transcript);

  if (!normalized) {
    return null;
  }

  if (
    normalized === "open accessibility menu" ||
    normalized === "open accessibility" ||
    normalized === "accessibility menu"
  ) {
    return { type: "open-menu" };
  }

  if (
    normalized === "close accessibility menu" ||
    normalized === "close accessibility"
  ) {
    return { type: "close-menu" };
  }

  if (
    normalized === "stop listening" ||
    normalized === "stop voice navigation" ||
    normalized === "turn off voice navigation" ||
    normalized === "disable voice navigation"
  ) {
    return { type: "stop-listening" };
  }

  if (
    normalized === "scroll up" ||
    normalized === "go up"
  ) {
    return { type: "scroll", direction: "up" };
  }

  if (
    normalized === "scroll down" ||
    normalized === "go down"
  ) {
    return { type: "scroll", direction: "down" };
  }

  if (
    normalized === "scroll top" ||
    normalized === "scroll to top" ||
    normalized === "go to top"
  ) {
    return { type: "scroll", direction: "top" };
  }

  if (
    normalized === "scroll bottom" ||
    normalized === "scroll to bottom" ||
    normalized === "go to bottom"
  ) {
    return { type: "scroll", direction: "bottom" };
  }

  if (
    normalized === "go home" ||
    normalized === "go to home" ||
    normalized === "open home"
  ) {
    return { type: "navigate", href: "/", label: "Home" };
  }

  const directMatch = findNavigationTarget(normalized, routes);

  if (directMatch) {
    return {
      type: "navigate",
      href: directMatch.href,
      label: directMatch.label,
    };
  }

  for (const prefix of ROUTE_COMMAND_PREFIXES) {
    if (!normalized.startsWith(prefix)) {
      continue;
    }

    const candidate = normalized.slice(prefix.length).trim();
    const route = findNavigationTarget(candidate, routes);

    if (route) {
      return {
        type: "navigate",
        href: route.href,
        label: route.label,
      };
    }
  }

  return null;
}

export function resolveSpeechRecognitionConstructor(
  options: SpeechRecognitionSupportOptions,
): SpeechRecognitionConstructor | null {
  if (typeof options.SpeechRecognition === "function") {
    return options.SpeechRecognition as SpeechRecognitionConstructor;
  }

  if (typeof options.webkitSpeechRecognition === "function") {
    return options.webkitSpeechRecognition as SpeechRecognitionConstructor;
  }

  return null;
}

export function isVoiceNavigationSupported(
  options: SpeechRecognitionSupportOptions,
) {
  return Boolean(
    options.isSecureContext &&
      resolveSpeechRecognitionConstructor(options),
  );
}

export function isScreenReaderSupported(
  options: ScreenReaderSupportOptions,
) {
  return Boolean(
    options.speechSynthesis &&
      typeof options.SpeechSynthesisUtterance === "function",
  );
}
