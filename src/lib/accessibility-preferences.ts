export type AccessibilityTextSize = "default" | "large" | "xl";
export type AccessibilityContrast = "default" | "high";

export type AccessibilityPreferences = {
  textSize: AccessibilityTextSize;
  contrast: AccessibilityContrast;
  reduceMotion: boolean;
};

export const ACCESSIBILITY_STORAGE_KEY = "wial-a11y-prefs";
export const ACCESSIBILITY_EVENT_NAME = "wial-a11y-prefs-change";

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  textSize: "default",
  contrast: "default",
  reduceMotion: false,
};

const TEXT_SIZE_CLASSES = [
  "text-scale-default",
  "text-scale-large",
  "text-scale-xl",
] as const;
const CONTRAST_CLASSES = [
  "contrast-default",
  "contrast-high",
] as const;
const REDUCE_MOTION_CLASS = "reduce-motion";

function isTextSize(value: unknown): value is AccessibilityTextSize {
  return value === "default" || value === "large" || value === "xl";
}

function isContrast(value: unknown): value is AccessibilityContrast {
  return value === "default" || value === "high";
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
    contrast: isContrast(candidate.contrast)
      ? candidate.contrast
      : DEFAULT_ACCESSIBILITY_PREFERENCES.contrast,
    reduceMotion:
      typeof candidate.reduceMotion === "boolean"
        ? candidate.reduceMotion
        : DEFAULT_ACCESSIBILITY_PREFERENCES.reduceMotion,
  };
}

export function hasCustomAccessibilityPreferences(
  preferences: AccessibilityPreferences,
) {
  return (
    preferences.textSize !== DEFAULT_ACCESSIBILITY_PREFERENCES.textSize ||
    preferences.contrast !== DEFAULT_ACCESSIBILITY_PREFERENCES.contrast ||
    preferences.reduceMotion !==
      DEFAULT_ACCESSIBILITY_PREFERENCES.reduceMotion
  );
}

export function applyAccessibilityPreferencesToRoot(
  root: HTMLElement,
  preferences: AccessibilityPreferences,
) {
  root.classList.remove(...TEXT_SIZE_CLASSES);
  root.classList.remove(...CONTRAST_CLASSES);
  root.classList.remove(REDUCE_MOTION_CLASS);

  root.classList.add(
    preferences.textSize === "large"
      ? "text-scale-large"
      : preferences.textSize === "xl"
        ? "text-scale-xl"
        : "text-scale-default",
  );
  root.classList.add(
    preferences.contrast === "high" ? "contrast-high" : "contrast-default",
  );

  if (preferences.reduceMotion) {
    root.classList.add(REDUCE_MOTION_CLASS);
  }
}

export function readAccessibilityPreferencesFromRoot(root: HTMLElement) {
  return normalizeAccessibilityPreferences({
    textSize: root.classList.contains("text-scale-xl")
      ? "xl"
      : root.classList.contains("text-scale-large")
        ? "large"
        : "default",
    contrast: root.classList.contains("contrast-high") ? "high" : "default",
    reduceMotion: root.classList.contains(REDUCE_MOTION_CLASS),
  });
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
  const reduceMotionClass = JSON.stringify(REDUCE_MOTION_CLASS);

  return `(function () {
    try {
      var root = document.documentElement;
      var defaults = ${defaults};
      var storageKey = ${storageKey};
      var textSizeClasses = ${textSizeClasses};
      var contrastClasses = ${contrastClasses};
      var reduceMotionClass = ${reduceMotionClass};

      function normalize(candidate) {
        if (!candidate || typeof candidate !== "object") {
          return defaults;
        }

        var textSize =
          candidate.textSize === "large" || candidate.textSize === "xl"
            ? candidate.textSize
            : defaults.textSize;
        var contrast =
          candidate.contrast === "high" ? "high" : defaults.contrast;
        var reduceMotion =
          typeof candidate.reduceMotion === "boolean"
            ? candidate.reduceMotion
            : defaults.reduceMotion;

        return {
          textSize: textSize,
          contrast: contrast,
          reduceMotion: reduceMotion,
        };
      }

      function apply(preferences) {
        for (var i = 0; i < textSizeClasses.length; i += 1) {
          root.classList.remove(textSizeClasses[i]);
        }

        for (var j = 0; j < contrastClasses.length; j += 1) {
          root.classList.remove(contrastClasses[j]);
        }

        root.classList.remove(reduceMotionClass);

        root.classList.add(
          preferences.textSize === "large"
            ? "text-scale-large"
            : preferences.textSize === "xl"
              ? "text-scale-xl"
              : "text-scale-default"
        );
        root.classList.add(
          preferences.contrast === "high" ? "contrast-high" : "contrast-default"
        );

        if (preferences.reduceMotion) {
          root.classList.add(reduceMotionClass);
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
