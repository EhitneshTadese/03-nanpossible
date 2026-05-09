export type AccessibilityTextSize = "default" | "large" | "xl";
export type AccessibilityContrast = "default" | "dark" | "invert";
export type AccessibilityLineHeight = "default" | "relaxed";

export type AccessibilityPreferences = {
  textSize: AccessibilityTextSize;
  contrast: AccessibilityContrast;
  lineHeight: AccessibilityLineHeight;
  reduceMotion: boolean;
  highlightLinks: boolean;
  textSpacing: boolean;
  dyslexiaFriendly: boolean;
  hideImages: boolean;
  largeCursor: boolean;
};

export type AccessibilityShortcutEvent = {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
};

export const ACCESSIBILITY_STORAGE_KEY = "wial-a11y-prefs";
export const ACCESSIBILITY_EVENT_NAME = "wial-a11y-prefs-change";

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  textSize: "default",
  contrast: "default",
  lineHeight: "default",
  reduceMotion: false,
  highlightLinks: false,
  textSpacing: false,
  dyslexiaFriendly: false,
  hideImages: false,
  largeCursor: false,
};

const TEXT_SIZE_CLASSES = [
  "text-scale-default",
  "text-scale-large",
  "text-scale-xl",
] as const;
const CONTRAST_CLASSES = [
  "contrast-default",
  "contrast-dark",
  "contrast-invert",
  "contrast-high",
] as const;
const LINE_HEIGHT_CLASSES = [
  "line-height-default",
  "line-height-relaxed",
] as const;
const REDUCE_MOTION_CLASS = "reduce-motion";
const HIGHLIGHT_LINKS_CLASS = "highlight-links";
const TEXT_SPACING_CLASS = "text-spacing-relaxed";
const DYSLEXIA_FRIENDLY_CLASS = "dyslexia-friendly";
const HIDE_IMAGES_CLASS = "hide-images";
const LARGE_CURSOR_CLASS = "cursor-large";

function isTextSize(value: unknown): value is AccessibilityTextSize {
  return value === "default" || value === "large" || value === "xl";
}

function normalizeContrast(value: unknown): AccessibilityContrast {
  if (value === "dark" || value === "high") {
    return "dark";
  }

  if (value === "invert") {
    return "invert";
  }

  return DEFAULT_ACCESSIBILITY_PREFERENCES.contrast;
}

function isLineHeight(value: unknown): value is AccessibilityLineHeight {
  return value === "default" || value === "relaxed";
}

export function normalizeAccessibilityPreferences(
  value: unknown,
): AccessibilityPreferences {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  }

  const candidate = value as Partial<AccessibilityPreferences>;

  return {
    textSize: isTextSize(candidate.textSize)
      ? candidate.textSize
      : DEFAULT_ACCESSIBILITY_PREFERENCES.textSize,
    contrast: normalizeContrast(candidate.contrast),
    lineHeight: isLineHeight(candidate.lineHeight)
      ? candidate.lineHeight
      : DEFAULT_ACCESSIBILITY_PREFERENCES.lineHeight,
    reduceMotion:
      typeof candidate.reduceMotion === "boolean"
        ? candidate.reduceMotion
        : DEFAULT_ACCESSIBILITY_PREFERENCES.reduceMotion,
    highlightLinks:
      typeof candidate.highlightLinks === "boolean"
        ? candidate.highlightLinks
        : DEFAULT_ACCESSIBILITY_PREFERENCES.highlightLinks,
    textSpacing:
      typeof candidate.textSpacing === "boolean"
        ? candidate.textSpacing
        : DEFAULT_ACCESSIBILITY_PREFERENCES.textSpacing,
    dyslexiaFriendly:
      typeof candidate.dyslexiaFriendly === "boolean"
        ? candidate.dyslexiaFriendly
        : DEFAULT_ACCESSIBILITY_PREFERENCES.dyslexiaFriendly,
    hideImages:
      typeof candidate.hideImages === "boolean"
        ? candidate.hideImages
        : DEFAULT_ACCESSIBILITY_PREFERENCES.hideImages,
    largeCursor:
      typeof candidate.largeCursor === "boolean"
        ? candidate.largeCursor
        : DEFAULT_ACCESSIBILITY_PREFERENCES.largeCursor,
  };
}

export function hasCustomAccessibilityPreferences(
  preferences: AccessibilityPreferences,
) {
  return (
    preferences.textSize !== DEFAULT_ACCESSIBILITY_PREFERENCES.textSize ||
    preferences.contrast !== DEFAULT_ACCESSIBILITY_PREFERENCES.contrast ||
    preferences.lineHeight !== DEFAULT_ACCESSIBILITY_PREFERENCES.lineHeight ||
    preferences.reduceMotion !==
      DEFAULT_ACCESSIBILITY_PREFERENCES.reduceMotion ||
    preferences.highlightLinks !==
      DEFAULT_ACCESSIBILITY_PREFERENCES.highlightLinks ||
    preferences.textSpacing !== DEFAULT_ACCESSIBILITY_PREFERENCES.textSpacing ||
    preferences.dyslexiaFriendly !==
      DEFAULT_ACCESSIBILITY_PREFERENCES.dyslexiaFriendly ||
    preferences.hideImages !== DEFAULT_ACCESSIBILITY_PREFERENCES.hideImages ||
    preferences.largeCursor !== DEFAULT_ACCESSIBILITY_PREFERENCES.largeCursor
  );
}

export function applyAccessibilityPreferencesToRoot(
  root: HTMLElement,
  preferences: AccessibilityPreferences,
) {
  root.classList.remove(...TEXT_SIZE_CLASSES);
  root.classList.remove(...CONTRAST_CLASSES);
  root.classList.remove(...LINE_HEIGHT_CLASSES);
  root.classList.remove(REDUCE_MOTION_CLASS);
  root.classList.remove(HIGHLIGHT_LINKS_CLASS);
  root.classList.remove(TEXT_SPACING_CLASS);
  root.classList.remove(DYSLEXIA_FRIENDLY_CLASS);
  root.classList.remove(HIDE_IMAGES_CLASS);
  root.classList.remove(LARGE_CURSOR_CLASS);

  root.classList.add(
    preferences.textSize === "large"
      ? "text-scale-large"
      : preferences.textSize === "xl"
        ? "text-scale-xl"
        : "text-scale-default",
  );
  root.classList.add(
    preferences.contrast === "dark"
      ? "contrast-dark"
      : preferences.contrast === "invert"
        ? "contrast-invert"
        : "contrast-default",
  );
  root.classList.add(
    preferences.lineHeight === "relaxed"
      ? "line-height-relaxed"
      : "line-height-default",
  );

  if (preferences.reduceMotion) {
    root.classList.add(REDUCE_MOTION_CLASS);
  }

  if (preferences.highlightLinks) {
    root.classList.add(HIGHLIGHT_LINKS_CLASS);
  }

  if (preferences.textSpacing) {
    root.classList.add(TEXT_SPACING_CLASS);
  }

  if (preferences.dyslexiaFriendly) {
    root.classList.add(DYSLEXIA_FRIENDLY_CLASS);
  }

  if (preferences.hideImages) {
    root.classList.add(HIDE_IMAGES_CLASS);
  }

  if (preferences.largeCursor) {
    root.classList.add(LARGE_CURSOR_CLASS);
  }
}

export function readAccessibilityPreferencesFromRoot(root: HTMLElement) {
  return normalizeAccessibilityPreferences({
    textSize: root.classList.contains("text-scale-xl")
      ? "xl"
      : root.classList.contains("text-scale-large")
        ? "large"
        : "default",
    contrast: root.classList.contains("contrast-invert")
      ? "invert"
      : root.classList.contains("contrast-dark") ||
          root.classList.contains("contrast-high")
        ? "dark"
        : "default",
    lineHeight: root.classList.contains("line-height-relaxed")
      ? "relaxed"
      : "default",
    reduceMotion: root.classList.contains(REDUCE_MOTION_CLASS),
    highlightLinks: root.classList.contains(HIGHLIGHT_LINKS_CLASS),
    textSpacing: root.classList.contains(TEXT_SPACING_CLASS),
    dyslexiaFriendly: root.classList.contains(DYSLEXIA_FRIENDLY_CLASS),
    hideImages: root.classList.contains(HIDE_IMAGES_CLASS),
    largeCursor: root.classList.contains(LARGE_CURSOR_CLASS),
  });
}

export function isAccessibilityMenuShortcut(
  event: AccessibilityShortcutEvent,
) {
  return (
    event.key.toLowerCase() === "u" &&
    !event.altKey &&
    !event.shiftKey &&
    (event.ctrlKey || event.metaKey)
  );
}

export function readAccessibilityPreferencesFromStorage(
  storage?: Storage | null,
) {
  if (!storage) {
    return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  }

  try {
    const raw = storage.getItem(ACCESSIBILITY_STORAGE_KEY);

    if (!raw) {
      return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
    }

    return normalizeAccessibilityPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  }
}

export function getAccessibilityStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function writeAccessibilityPreferencesToStorage(
  preferences: AccessibilityPreferences,
  storage?: Storage | null,
) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage is optional. Fail silently and keep the session-local DOM state.
  }
}

export function clearAccessibilityPreferencesFromStorage(
  storage?: Storage | null,
) {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(ACCESSIBILITY_STORAGE_KEY);
  } catch {
    // Storage is optional. Fail silently and keep the session-local DOM state.
  }
}

export function dispatchAccessibilityPreferencesEvent(
  preferences: AccessibilityPreferences,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AccessibilityPreferences>(ACCESSIBILITY_EVENT_NAME, {
      detail: preferences,
    }),
  );
}

export function getAccessibilityBootScript() {
  const defaults = JSON.stringify(DEFAULT_ACCESSIBILITY_PREFERENCES);
  const storageKey = JSON.stringify(ACCESSIBILITY_STORAGE_KEY);
  const textSizeClasses = JSON.stringify(TEXT_SIZE_CLASSES);
  const contrastClasses = JSON.stringify(CONTRAST_CLASSES);
  const lineHeightClasses = JSON.stringify(LINE_HEIGHT_CLASSES);
  const reduceMotionClass = JSON.stringify(REDUCE_MOTION_CLASS);
  const highlightLinksClass = JSON.stringify(HIGHLIGHT_LINKS_CLASS);
  const textSpacingClass = JSON.stringify(TEXT_SPACING_CLASS);
  const dyslexiaFriendlyClass = JSON.stringify(DYSLEXIA_FRIENDLY_CLASS);
  const hideImagesClass = JSON.stringify(HIDE_IMAGES_CLASS);
  const largeCursorClass = JSON.stringify(LARGE_CURSOR_CLASS);

  return `(function () {
    try {
      var root = document.documentElement;
      var defaults = ${defaults};
      var storageKey = ${storageKey};
      var textSizeClasses = ${textSizeClasses};
      var contrastClasses = ${contrastClasses};
      var lineHeightClasses = ${lineHeightClasses};
      var reduceMotionClass = ${reduceMotionClass};
      var highlightLinksClass = ${highlightLinksClass};
      var textSpacingClass = ${textSpacingClass};
      var dyslexiaFriendlyClass = ${dyslexiaFriendlyClass};
      var hideImagesClass = ${hideImagesClass};
      var largeCursorClass = ${largeCursorClass};

      function normalize(candidate) {
        if (!candidate || typeof candidate !== "object") {
          return defaults;
        }

        var textSize =
          candidate.textSize === "large" || candidate.textSize === "xl"
            ? candidate.textSize
            : defaults.textSize;
        var contrast =
          candidate.contrast === "dark" || candidate.contrast === "high"
            ? "dark"
            : candidate.contrast === "invert"
              ? "invert"
              : defaults.contrast;
        var lineHeight =
          candidate.lineHeight === "relaxed"
            ? "relaxed"
            : defaults.lineHeight;
        var reduceMotion =
          typeof candidate.reduceMotion === "boolean"
            ? candidate.reduceMotion
            : defaults.reduceMotion;
        var highlightLinks =
          typeof candidate.highlightLinks === "boolean"
            ? candidate.highlightLinks
            : defaults.highlightLinks;
        var textSpacing =
          typeof candidate.textSpacing === "boolean"
            ? candidate.textSpacing
            : defaults.textSpacing;
        var dyslexiaFriendly =
          typeof candidate.dyslexiaFriendly === "boolean"
            ? candidate.dyslexiaFriendly
            : defaults.dyslexiaFriendly;
        var hideImages =
          typeof candidate.hideImages === "boolean"
            ? candidate.hideImages
            : defaults.hideImages;
        var largeCursor =
          typeof candidate.largeCursor === "boolean"
            ? candidate.largeCursor
            : defaults.largeCursor;

        return {
          textSize: textSize,
          contrast: contrast,
          lineHeight: lineHeight,
          reduceMotion: reduceMotion,
          highlightLinks: highlightLinks,
          textSpacing: textSpacing,
          dyslexiaFriendly: dyslexiaFriendly,
          hideImages: hideImages,
          largeCursor: largeCursor,
        };
      }

      function apply(preferences) {
        for (var i = 0; i < textSizeClasses.length; i += 1) {
          root.classList.remove(textSizeClasses[i]);
        }

        for (var j = 0; j < contrastClasses.length; j += 1) {
          root.classList.remove(contrastClasses[j]);
        }

        for (var k = 0; k < lineHeightClasses.length; k += 1) {
          root.classList.remove(lineHeightClasses[k]);
        }

        root.classList.remove(reduceMotionClass);
        root.classList.remove(highlightLinksClass);
        root.classList.remove(textSpacingClass);
        root.classList.remove(dyslexiaFriendlyClass);
        root.classList.remove(hideImagesClass);
        root.classList.remove(largeCursorClass);

        root.classList.add(
          preferences.textSize === "large"
            ? "text-scale-large"
            : preferences.textSize === "xl"
              ? "text-scale-xl"
              : "text-scale-default"
        );
        root.classList.add(
          preferences.contrast === "dark"
            ? "contrast-dark"
            : preferences.contrast === "invert"
              ? "contrast-invert"
              : "contrast-default"
        );
        root.classList.add(
          preferences.lineHeight === "relaxed"
            ? "line-height-relaxed"
            : "line-height-default"
        );

        if (preferences.reduceMotion) {
          root.classList.add(reduceMotionClass);
        }

        if (preferences.highlightLinks) {
          root.classList.add(highlightLinksClass);
        }

        if (preferences.textSpacing) {
          root.classList.add(textSpacingClass);
        }

        if (preferences.dyslexiaFriendly) {
          root.classList.add(dyslexiaFriendlyClass);
        }

        if (preferences.hideImages) {
          root.classList.add(hideImagesClass);
        }

        if (preferences.largeCursor) {
          root.classList.add(largeCursorClass);
        }
      }

      var nextPreferences = defaults;

      try {
        var raw = window.localStorage
          ? window.localStorage.getItem(storageKey)
          : null;

        if (raw) {
          nextPreferences = normalize(JSON.parse(raw));
        }
      } catch (error) {
        nextPreferences = defaults;
      }

      apply(nextPreferences);
    } catch (error) {
      // Keep the default classes already rendered on <html>.
    }
  })();`;
}
