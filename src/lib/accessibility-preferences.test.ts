import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  applyAccessibilityPreferencesToRoot,
  hasCustomAccessibilityPreferences,
  isAccessibilityMenuShortcut,
  normalizeAccessibilityPreferences,
  readAccessibilityPreferencesFromRoot,
} from "@/lib/accessibility-preferences";

function createMockRoot() {
  const classes = new Set<string>();

  return {
    classList: {
      add: (...tokens: string[]) => {
        for (const token of tokens) {
          classes.add(token);
        }
      },
      contains: (token: string) => classes.has(token),
      remove: (...tokens: string[]) => {
        for (const token of tokens) {
          classes.delete(token);
        }
      },
    },
  } as unknown as HTMLElement;
}

describe("accessibility preferences", () => {
  it("falls back to defaults for invalid persisted data", () => {
    expect(
      normalizeAccessibilityPreferences({
        textSize: "huge",
        contrast: "loud",
        lineHeight: "tall",
        reduceMotion: "yes",
        highlightLinks: "sometimes",
        textSpacing: "wide",
        dyslexiaFriendly: "sure",
        hideImages: "hide",
        largeCursor: "large",
      }),
    ).toEqual(DEFAULT_ACCESSIBILITY_PREFERENCES);
  });

  it("preserves valid preference values", () => {
    expect(
      normalizeAccessibilityPreferences({
        textSize: "xl",
        contrast: "invert",
        lineHeight: "relaxed",
        reduceMotion: true,
        highlightLinks: true,
        textSpacing: true,
        dyslexiaFriendly: true,
        hideImages: true,
        largeCursor: true,
      }),
    ).toEqual({
      textSize: "xl",
      contrast: "invert",
      lineHeight: "relaxed",
      reduceMotion: true,
      highlightLinks: true,
      textSpacing: true,
      dyslexiaFriendly: true,
      hideImages: true,
      largeCursor: true,
    });
  });

  it("detects when any non-default preference is active", () => {
    expect(hasCustomAccessibilityPreferences(DEFAULT_ACCESSIBILITY_PREFERENCES)).toBe(
      false,
    );
    expect(
      hasCustomAccessibilityPreferences({
        ...DEFAULT_ACCESSIBILITY_PREFERENCES,
        contrast: "dark",
      }),
    ).toBe(true);
  });

  it("maps the legacy high-contrast preference to dark contrast", () => {
    expect(
      normalizeAccessibilityPreferences({
        ...DEFAULT_ACCESSIBILITY_PREFERENCES,
        contrast: "high",
      }),
    ).toEqual({
      ...DEFAULT_ACCESSIBILITY_PREFERENCES,
      contrast: "dark",
    });
  });

  it("applies and reads back the expanded root classes", () => {
    const root = createMockRoot();

    applyAccessibilityPreferencesToRoot(root, {
      textSize: "xl",
      contrast: "dark",
      lineHeight: "relaxed",
      reduceMotion: true,
      highlightLinks: true,
      textSpacing: true,
      dyslexiaFriendly: true,
      hideImages: true,
      largeCursor: true,
    });

    expect(readAccessibilityPreferencesFromRoot(root)).toEqual({
      textSize: "xl",
      contrast: "dark",
      lineHeight: "relaxed",
      reduceMotion: true,
      highlightLinks: true,
      textSpacing: true,
      dyslexiaFriendly: true,
      hideImages: true,
      largeCursor: true,
    });
  });

  it("detects the accessibility menu shortcut on control and command", () => {
    expect(
      isAccessibilityMenuShortcut({
        key: "u",
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
      }),
    ).toBe(true);

    expect(
      isAccessibilityMenuShortcut({
        key: "U",
        ctrlKey: false,
        metaKey: true,
        altKey: false,
        shiftKey: false,
      }),
    ).toBe(true);

    expect(
      isAccessibilityMenuShortcut({
        key: "u",
        ctrlKey: true,
        metaKey: false,
        altKey: true,
        shiftKey: false,
      }),
    ).toBe(false);
  });
});
