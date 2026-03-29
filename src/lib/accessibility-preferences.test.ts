import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  hasCustomAccessibilityPreferences,
  normalizeAccessibilityPreferences,
} from "@/lib/accessibility-preferences";

describe("accessibility preferences", () => {
  it("falls back to defaults for invalid persisted data", () => {
    expect(
      normalizeAccessibilityPreferences({
        textSize: "huge",
        contrast: "loud",
        reduceMotion: "yes",
      }),
    ).toEqual(DEFAULT_ACCESSIBILITY_PREFERENCES);
  });

  it("preserves valid preference values", () => {
    expect(
      normalizeAccessibilityPreferences({
        textSize: "xl",
        contrast: "high",
        reduceMotion: true,
      }),
    ).toEqual({
      textSize: "xl",
      contrast: "high",
      reduceMotion: true,
    });
  });

  it("detects when any non-default preference is active", () => {
    expect(hasCustomAccessibilityPreferences(DEFAULT_ACCESSIBILITY_PREFERENCES)).toBe(
      false,
    );
    expect(
      hasCustomAccessibilityPreferences({
        ...DEFAULT_ACCESSIBILITY_PREFERENCES,
        contrast: "high",
      }),
    ).toBe(true);
  });
});
