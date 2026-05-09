import { describe, expect, it } from "vitest";
import {
  buildAssistiveNavigationTargets,
  isScreenReaderSupported,
  isVoiceNavigationSupported,
  matchVoiceNavigationCommand,
  normalizeTranscript,
  sanitizeReadableText,
} from "@/lib/accessibility-assistive-tools";

describe("accessibility assistive tools", () => {
  it("normalizes transcripts into a command-friendly token stream", () => {
    expect(normalizeTranscript(" Open   Accessibility Menu! ")).toBe(
      "open accessibility menu",
    );
    expect(normalizeTranscript("Users & Roles")).toBe("users and roles");
  });

  it("sanitizes readable text for browser narration", () => {
    expect(
      sanitizeReadableText(" Welcome   to\u00a0WIAL \n\n certification ! "),
    ).toBe("Welcome to WIAL certification!");
  });

  it("matches visible navigation labels and their aliases", () => {
    const routes = buildAssistiveNavigationTargets([
      { href: "/certification", label: "Certification" },
      { href: "/admin/global/users", label: "Users & roles" },
      { href: "/account", label: "Open account" },
    ]);

    expect(matchVoiceNavigationCommand("go to certification", routes)).toEqual({
      type: "navigate",
      href: "/certification",
      label: "Certification",
    });

    expect(matchVoiceNavigationCommand("open users and roles", routes)).toEqual({
      type: "navigate",
      href: "/admin/global/users",
      label: "Users & roles",
    });

    expect(matchVoiceNavigationCommand("open account", routes)).toEqual({
      type: "navigate",
      href: "/account",
      label: "Open account",
    });
  });

  it("matches built-in non-route commands", () => {
    const routes = buildAssistiveNavigationTargets([
      { href: "/about", label: "About WIAL" },
    ]);

    expect(matchVoiceNavigationCommand("scroll to bottom", routes)).toEqual({
      type: "scroll",
      direction: "bottom",
    });

    expect(matchVoiceNavigationCommand("open accessibility menu", routes)).toEqual({
      type: "open-menu",
    });

    expect(matchVoiceNavigationCommand("turn off voice navigation", routes)).toEqual({
      type: "stop-listening",
    });
  });

  it("returns null when a transcript does not match a supported command", () => {
    const routes = buildAssistiveNavigationTargets([
      { href: "/about", label: "About WIAL" },
    ]);

    expect(matchVoiceNavigationCommand("book a meeting", routes)).toBeNull();
  });

  it("checks voice navigation support with secure-context gating", () => {
    expect(
      isVoiceNavigationSupported({
        SpeechRecognition: function SpeechRecognition() {},
        isSecureContext: true,
      }),
    ).toBe(true);

    expect(
      isVoiceNavigationSupported({
        SpeechRecognition: function SpeechRecognition() {},
        isSecureContext: false,
      }),
    ).toBe(false);
  });

  it("checks screen reader support from synthesis primitives", () => {
    expect(
      isScreenReaderSupported({
        SpeechSynthesisUtterance: function SpeechSynthesisUtterance() {},
        speechSynthesis: {},
      }),
    ).toBe(true);

    expect(
      isScreenReaderSupported({
        SpeechSynthesisUtterance: undefined,
        speechSynthesis: {},
      }),
    ).toBe(false);
  });
});
