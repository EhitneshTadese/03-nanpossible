"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ACCESSIBILITY_MAIN_CONTENT_ID,
  buildAssistiveNavigationTargets,
  extractReadableText,
  isScreenReaderSupported,
  isVoiceNavigationSupported,
  matchVoiceNavigationCommand,
  resolveSpeechRecognitionConstructor,
  type AssistiveNavigationRoute,
  type SpeechRecognitionErrorEventLike,
  type SpeechRecognitionLike,
} from "@/lib/accessibility-assistive-tools";
import {
  ACCESSIBILITY_EVENT_NAME,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  applyAccessibilityPreferencesToRoot,
  clearAccessibilityPreferencesFromStorage,
  dispatchAccessibilityPreferencesEvent,
  getAccessibilityStorage,
  hasCustomAccessibilityPreferences,
  isAccessibilityMenuShortcut,
  readAccessibilityPreferencesFromRoot,
  readAccessibilityPreferencesFromStorage,
  writeAccessibilityPreferencesToStorage,
  type AccessibilityContrast,
  type AccessibilityLineHeight,
  type AccessibilityPreferences,
} from "@/lib/accessibility-preferences";

type AccessibilityPreferencesProps = {
  navigationRoutes: AssistiveNavigationRoute[];
  variant: "desktop" | "mobile";
};

type ToggleRowProps = {
  active: boolean;
  description: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

type ContrastCycleRowProps = {
  contrast: AccessibilityContrast;
  onClick: () => void;
};

const CONTRAST_CYCLE: readonly AccessibilityContrast[] = [
  "default",
  "invert",
  "dark",
] as const;

function nextContrast(current: AccessibilityContrast): AccessibilityContrast {
  const index = CONTRAST_CYCLE.indexOf(current);
  const next = index === -1 ? 1 : (index + 1) % CONTRAST_CYCLE.length;
  return CONTRAST_CYCLE[next];
}

type SectionKey = "assistive" | "reading" | "motion" | "interface";
type ScreenReaderUnavailableReason = "unsupported" | "no-readable-content" | null;
type VoiceNavigationUnavailableReason =
  | "insecure-context"
  | "permission-denied"
  | "unsupported"
  | null;

type BrowserSpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: unknown;
    SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
    webkitSpeechRecognition?: unknown;
  };

function AccessibilityTriggerIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="7.15" fill="currentColor" r="1.35" />
      <path
        d="M8.75 9.9h6.5M12 9.9v7.35M9.5 17.35 12 13.5l2.5 3.85M10 9.9l-2.1 3.05M14 9.9l2.1 3.05"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M6 8h12M10 8v10M14 8v10M6 18h12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ContrastIcon({ mode }: { mode: AccessibilityContrast }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect
        x="4.5"
        y="5"
        width="15"
        height="10.5"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 15.5v3.2M8.75 19.2h6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      {mode === "invert" ? (
        <>
          <path
            d="M7.6 12.7 16.4 7.9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
          <circle cx="9.2" cy="11.9" r="1.55" fill="currentColor" />
          <circle
            cx="14.9"
            cy="8.85"
            r="1.55"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </>
      ) : mode === "dark" ? (
        <circle cx="12" cy="10.2" r="2.25" fill="currentColor" />
      ) : (
        <circle
          cx="12"
          cy="10.2"
          r="2.25"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      )}
    </svg>
  );
}

function MotionIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect
        x="5"
        y="5"
        width="5.2"
        height="14"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="13.8"
        y="5"
        width="5.2"
        height="14"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function LinksIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M9.8 14.2 6.6 17.4a3.3 3.3 0 1 1-4.65-4.65l3.1-3.1a3.3 3.3 0 0 1 4.65 0M14.2 9.8l3.2-3.2a3.3 3.3 0 1 1 4.65 4.65l-3.1 3.1a3.3 3.3 0 0 1-4.65 0M8.4 12h7.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SpacingIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 12h16M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function LineHeightIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 4v16M7 4l-2 2M7 4l2 2M7 20l-2-2M7 20l2-2M12 7h8M12 12h8M12 17h8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DyslexiaIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 5.5h5.4a5.2 5.2 0 0 1 0 10.4H5V5.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M14.5 5.5h4.5M17 5.5v13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect x="4" y="5.5" width="16" height="13" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1.4" fill="currentColor" />
      <path
        d="m6.8 16.6 3.8-3.8 2.6 2.6 3.4-3.8 3 4.9M18.6 6 6 18.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M5.6 4 18 13.4l-5.2.7 3.1 5.8-2.6 1.4-3.1-5.8L6.7 19V4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ScreenReaderIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.75 12h2.5M16.75 12h2.5M9.5 8.25v7.5M12 6.5v11M14.5 8.25v7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M7.75 7.5a5.5 5.5 0 0 0 0 9M16.25 7.5a5.5 5.5 0 0 1 0 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function VoiceNavigationIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4.5a2.5 2.5 0 0 1 2.5 2.5v4.4a2.5 2.5 0 1 1-5 0V7a2.5 2.5 0 0 1 2.5-2.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7.5 10.75a4.5 4.5 0 0 0 9 0M12 15.25v4.25M9.25 19.5h5.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ToggleSwitch({
  active,
  disabled = false,
}: {
  active: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
        active
          ? "bg-[var(--teal)]"
          : disabled
            ? "bg-[rgba(139,113,112,0.18)]"
            : "bg-[rgba(139,113,112,0.28)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          active ? "translate-x-[1.375rem]" : "translate-x-0.5"
        } ${disabled ? "opacity-75" : ""}`}
      />
    </span>
  );
}

function ToggleRow({
  active,
  description,
  disabled = false,
  icon,
  label,
  onClick,
}: ToggleRowProps) {
  return (
    <button
      aria-checked={active}
      aria-disabled={disabled}
      className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
        disabled
          ? "cursor-not-allowed border-[var(--line)]/70 bg-white/45 opacity-70"
          : active
            ? "border-[var(--teal)]/30 bg-[rgba(209,0,52,0.04)]"
            : "border-[var(--line)] bg-white/60 hover:border-[var(--teal)]/20 hover:bg-white"
      }`}
      disabled={disabled}
      onClick={onClick}
      role="switch"
      type="button"
    >
      <span
        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition ${
          active
            ? "bg-[var(--teal)] text-white"
            : "bg-[var(--surface)] text-[var(--teal-deep)]"
        } ${disabled ? "opacity-80" : ""}`}
      >
        <span className="h-5 w-5">{icon}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-semibold leading-tight text-[var(--foreground)]">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[var(--neutral)]">
          {description}
        </span>
      </span>
      <ToggleSwitch active={active} disabled={disabled} />
    </button>
  );
}

function ContrastCycleRow({ contrast, onClick }: ContrastCycleRowProps) {
  const active = contrast !== "default";
  const label = active ? getContrastLabel(contrast) : "Contrast +";
  const description = active
    ? "Tap again to cycle to the next contrast mode."
    : "Cycle through invert and dark contrast modes.";
  const stepIndex = Math.max(0, CONTRAST_CYCLE.indexOf(contrast));

  return (
    <button
      aria-label={`Contrast mode: ${label}. Tap to cycle.`}
      className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
        active
          ? "border-[var(--teal)]/30 bg-[rgba(209,0,52,0.04)]"
          : "border-[var(--line)] bg-white/60 hover:border-[var(--teal)]/20 hover:bg-white"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition ${
          active
            ? "bg-[var(--teal)] text-white"
            : "bg-[var(--surface)] text-[var(--teal-deep)]"
        }`}
      >
        <span className="h-5 w-5">
          <ContrastIcon mode={contrast} />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-semibold leading-tight text-[var(--foreground)]">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[var(--neutral)]">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="mt-2 flex flex-shrink-0 items-center gap-1"
      >
        {CONTRAST_CYCLE.map((_, index) => (
          <span
            key={index}
            className={`h-1.5 w-5 rounded-full transition ${
              index === stepIndex
                ? "bg-[var(--teal-deep)]"
                : "bg-[var(--line-strong)]"
            }`}
          />
        ))}
      </span>
    </button>
  );
}

function getContrastLabel(contrast: AccessibilityContrast) {
  switch (contrast) {
    case "dark":
      return "Dark Contrast";
    case "invert":
      return "Invert Colors";
    default:
      return "Light Contrast";
  }
}

function getVoiceNavigationDescription(
  unavailableReason: VoiceNavigationUnavailableReason,
  active: boolean,
  starting: boolean,
) {
  if (unavailableReason === "permission-denied") {
    return "Microphone access was blocked in this session. Refresh and allow microphone access to use voice navigation.";
  }

  if (unavailableReason === "insecure-context") {
    return "Voice navigation requires HTTPS or localhost before the browser will expose microphone controls.";
  }

  if (unavailableReason === "unsupported") {
    return "Speech recognition is not available in this browser.";
  }

  if (starting) {
    return "Starting the microphone so it can listen for menu, route, and scrolling commands.";
  }

  if (active) {
    return 'Listening for commands like "open accessibility menu", "go to certification", and "scroll down".';
  }

  return "Use your microphone to open routes, control the menu, and move around the page with voice commands.";
}

function getScreenReaderDescription(
  unavailableReason: ScreenReaderUnavailableReason,
  active: boolean,
) {
  if (unavailableReason === "unsupported") {
    return "Speech playback is not available in this browser.";
  }

  if (unavailableReason === "no-readable-content") {
    return "This page does not expose readable main content for browser narration.";
  }

  if (active) {
    return "Reading the current page content aloud in your browser until you stop it or navigate away.";
  }

  return "Read the current page content aloud using your browser's built-in speech playback.";
}

export function AccessibilityPreferencesWidget({
  navigationRoutes,
  variant,
}: AccessibilityPreferencesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isVariantActive, setIsVariantActive] = useState(true);
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    DEFAULT_ACCESSIBILITY_PREFERENCES,
  );
  const [announcement, setAnnouncement] = useState("");
  const [screenReaderActive, setScreenReaderActive] = useState(false);
  const [voiceNavigationActive, setVoiceNavigationActive] = useState(false);
  const [voiceNavigationStarting, setVoiceNavigationStarting] = useState(false);
  const [screenReaderUnavailableReason, setScreenReaderUnavailableReason] =
    useState<ScreenReaderUnavailableReason>(null);
  const [voiceNavigationUnavailableReason, setVoiceNavigationUnavailableReason] =
    useState<VoiceNavigationUnavailableReason>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogId = useId();
  const isMobile = variant === "mobile";
  const prefersReducedMotion = useReducedMotion();
  const skipAnimation = prefersReducedMotion || preferences.reduceMotion;
  const hasCustomSettings = hasCustomAccessibilityPreferences(preferences);
  const assistiveToolsActive =
    screenReaderActive || voiceNavigationActive || voiceNavigationStarting;
  const triggerLabel = assistiveToolsActive
    ? hasCustomSettings
      ? "Accessibility preferences (custom settings and assistive tools active)"
      : "Accessibility preferences (assistive tools active)"
    : hasCustomSettings
      ? "Accessibility preferences (custom settings active)"
      : "Accessibility preferences";
  const screenReaderUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceNavigationEnabledRef = useRef(false);
  const voiceNavigationManualStopRef = useRef(false);
  const voiceNavigationRestartTimeoutRef = useRef<number | null>(null);
  const voiceNavigationAnnounceStartRef = useRef(false);
  const voiceNavigationUnavailableReasonRef =
    useRef<VoiceNavigationUnavailableReason>(null);
  const previousPathnameRef = useRef(pathname);
  const isOpenRef = useRef(isOpen);
  const navigationTargets = useMemo(
    () => buildAssistiveNavigationTargets(navigationRoutes),
    [navigationRoutes],
  );
  const navigationTargetsRef = useRef(navigationTargets);

  useEffect(() => {
    navigationTargetsRef.current = navigationTargets;
  }, [navigationTargets]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    voiceNavigationUnavailableReasonRef.current =
      voiceNavigationUnavailableReason;
  }, [voiceNavigationUnavailableReason]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setIsVariantActive(
        variant === "desktop" ? mediaQuery.matches : !mediaQuery.matches,
      );
    };

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, [variant]);

  function announce(message: string) {
    setAnnouncement(message);
  }

  function getSpeechWindow() {
    if (typeof window === "undefined") {
      return null;
    }

    return window as BrowserSpeechWindow;
  }

  function getSpeechLanguage() {
    if (typeof document === "undefined") {
      return "en-US";
    }

    return (
      document.documentElement.lang ||
      (typeof navigator !== "undefined" ? navigator.language : "") ||
      "en-US"
    );
  }

  function getVoiceNavigationBaseReason(): VoiceNavigationUnavailableReason {
    const speechWindow = getSpeechWindow();

    if (!speechWindow) {
      return "unsupported";
    }

    if (!speechWindow.isSecureContext) {
      return "insecure-context";
    }

    return isVoiceNavigationSupported({
      SpeechRecognition: speechWindow.SpeechRecognition,
      isSecureContext: speechWindow.isSecureContext,
      webkitSpeechRecognition: speechWindow.webkitSpeechRecognition,
    })
      ? null
      : "unsupported";
  }

  function getScreenReaderBaseReason(): ScreenReaderUnavailableReason {
    const speechWindow = getSpeechWindow();

    if (!speechWindow) {
      return "unsupported";
    }

    return isScreenReaderSupported({
      SpeechSynthesisUtterance: speechWindow.SpeechSynthesisUtterance,
      speechSynthesis: speechWindow.speechSynthesis,
    })
      ? null
      : "unsupported";
  }

  function refreshAssistiveAvailability() {
    const nextScreenReaderReason = getScreenReaderBaseReason();

    if (nextScreenReaderReason) {
      setScreenReaderUnavailableReason(nextScreenReaderReason);
    } else {
      const readableText = extractReadableText(
        document.getElementById(ACCESSIBILITY_MAIN_CONTENT_ID),
      );

      setScreenReaderUnavailableReason(
        readableText ? null : "no-readable-content",
      );
    }

    setVoiceNavigationUnavailableReason((current) => {
      if (current === "permission-denied") {
        return current;
      }

      return getVoiceNavigationBaseReason();
    });
  }

  function cancelVoiceNavigationRestart() {
    if (voiceNavigationRestartTimeoutRef.current != null) {
      window.clearTimeout(voiceNavigationRestartTimeoutRef.current);
      voiceNavigationRestartTimeoutRef.current = null;
    }
  }

  function stopScreenReader(message?: string) {
    const speechWindow = getSpeechWindow();

    if (speechWindow?.speechSynthesis) {
      speechWindow.speechSynthesis.cancel();
    }

    screenReaderUtteranceRef.current = null;
    setScreenReaderActive(false);

    if (message) {
      announce(message);
    }
  }

  function closePanel() {
    setIsOpen(false);

    window.requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }

  function stopVoiceNavigation(
    message?: string,
    options: { preserveReason?: boolean } = {},
  ) {
    cancelVoiceNavigationRestart();
    voiceNavigationEnabledRef.current = false;
    voiceNavigationManualStopRef.current = true;
    setVoiceNavigationStarting(false);
    setVoiceNavigationActive(false);

    const recognition = voiceRecognitionRef.current;

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          // Best effort cleanup for browser speech APIs.
        }
      }
    }

    if (!options.preserveReason) {
      setVoiceNavigationUnavailableReason((current) =>
        current === "permission-denied" ? current : getVoiceNavigationBaseReason(),
      );
    }

    if (message) {
      announce(message);
    }
  }

  function executeVoiceNavigationAction(
    transcript: string,
    action: ReturnType<typeof matchVoiceNavigationCommand>,
  ) {
    if (!action) {
      announce(
        `Voice navigation heard "${transcript.trim()}", but no supported command matched.`,
      );
      return;
    }

    switch (action.type) {
      case "open-menu":
        setIsOpen(true);
        announce("Voice navigation opened the accessibility menu.");
        return;
      case "close-menu":
        setIsOpen(false);
        announce("Voice navigation closed the accessibility menu.");
        return;
      case "navigate":
        setIsOpen(false);
        announce(`Voice navigation opened ${action.label}.`);
        router.push(action.href);
        return;
      case "scroll": {
        const behavior: ScrollBehavior =
          document.documentElement.classList.contains("reduce-motion")
            ? "auto"
            : "smooth";

        if (action.direction === "up") {
          window.scrollBy({ top: -420, behavior });
          announce("Voice navigation scrolled up.");
          return;
        }

        if (action.direction === "down") {
          window.scrollBy({ top: 420, behavior });
          announce("Voice navigation scrolled down.");
          return;
        }

        window.scrollTo({
          top:
            action.direction === "top"
              ? 0
              : document.documentElement.scrollHeight,
          behavior,
        });
        announce(
          action.direction === "top"
            ? "Voice navigation scrolled to the top."
            : "Voice navigation scrolled to the bottom.",
        );
        return;
      }
      case "stop-listening":
        stopVoiceNavigation("Voice navigation turned off.");
        return;
    }
  }

  function ensureVoiceRecognition() {
    const speechWindow = getSpeechWindow();

    if (!speechWindow) {
      return null;
    }

    const RecognitionConstructor = resolveSpeechRecognitionConstructor({
      SpeechRecognition: speechWindow.SpeechRecognition,
      isSecureContext: speechWindow.isSecureContext,
      webkitSpeechRecognition: speechWindow.webkitSpeechRecognition,
    });

    if (!RecognitionConstructor) {
      return null;
    }

    if (voiceRecognitionRef.current) {
      voiceRecognitionRef.current.lang = getSpeechLanguage();
      return voiceRecognitionRef.current;
    }

    const recognition = new RecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = getSpeechLanguage();

    recognition.onstart = () => {
      setVoiceNavigationStarting(false);
      setVoiceNavigationActive(true);

      if (voiceNavigationAnnounceStartRef.current) {
        announce(
          'Voice navigation is listening. Try commands like "go to certification" or "scroll down".',
        );
        voiceNavigationAnnounceStartRef.current = false;
      }
    };

    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];

        if (!result?.isFinal) {
          continue;
        }

        const transcript = result[0]?.transcript ?? "";
        const action = matchVoiceNavigationCommand(
          transcript,
          navigationTargetsRef.current,
        );

        executeVoiceNavigationAction(transcript, action);
        return;
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === "aborted") {
        return;
      }

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        voiceNavigationEnabledRef.current = false;
        voiceNavigationManualStopRef.current = true;
        setVoiceNavigationStarting(false);
        setVoiceNavigationActive(false);
        setVoiceNavigationUnavailableReason("permission-denied");
        announce(
          "Voice navigation could not access the microphone. Refresh and allow microphone access to try again.",
        );
        return;
      }

      if (event.error === "no-speech") {
        return;
      }

      voiceNavigationEnabledRef.current = false;
      voiceNavigationManualStopRef.current = true;
      setVoiceNavigationStarting(false);
      setVoiceNavigationActive(false);
      announce("Voice navigation stopped because speech recognition hit an error.");
    };

    recognition.onend = () => {
      setVoiceNavigationActive(false);
      setVoiceNavigationStarting(false);

      if (
        voiceNavigationEnabledRef.current &&
        !voiceNavigationManualStopRef.current &&
        voiceNavigationUnavailableReasonRef.current == null
      ) {
        cancelVoiceNavigationRestart();
        voiceNavigationRestartTimeoutRef.current = window.setTimeout(() => {
          const nextRecognition = voiceRecognitionRef.current;

          if (!nextRecognition || voiceNavigationManualStopRef.current) {
            return;
          }

          try {
            setVoiceNavigationStarting(true);
            nextRecognition.lang = getSpeechLanguage();
            nextRecognition.start();
          } catch {
            setVoiceNavigationStarting(false);
            setVoiceNavigationActive(false);
          }
        }, 320);
      }
    };

    voiceRecognitionRef.current = recognition;
    return recognition;
  }

  function startVoiceNavigation() {
    const unavailableReason = getVoiceNavigationBaseReason();

    if (unavailableReason) {
      setVoiceNavigationUnavailableReason(unavailableReason);
      announce(getVoiceNavigationDescription(unavailableReason, false, false));
      return;
    }

    setVoiceNavigationUnavailableReason(null);
    voiceNavigationEnabledRef.current = true;
    voiceNavigationManualStopRef.current = false;
    voiceNavigationAnnounceStartRef.current = true;

    const recognition = ensureVoiceRecognition();

    if (!recognition) {
      setVoiceNavigationUnavailableReason("unsupported");
      voiceNavigationEnabledRef.current = false;
      announce(getVoiceNavigationDescription("unsupported", false, false));
      return;
    }

    cancelVoiceNavigationRestart();
    setVoiceNavigationStarting(true);

    try {
      recognition.lang = getSpeechLanguage();
      recognition.start();
    } catch (error) {
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        setVoiceNavigationStarting(false);
        setVoiceNavigationActive(true);
        return;
      }

      voiceNavigationEnabledRef.current = false;
      voiceNavigationManualStopRef.current = true;
      setVoiceNavigationStarting(false);
      announce("Voice navigation could not start in this browser session.");
    }
  }

  function handleScreenReaderToggle() {
    if (screenReaderActive) {
      stopScreenReader("Screen reader stopped.");
      return;
    }

    const unavailableReason = getScreenReaderBaseReason();

    if (unavailableReason) {
      setScreenReaderUnavailableReason(unavailableReason);
      announce(getScreenReaderDescription(unavailableReason, false));
      return;
    }

    const speechWindow = getSpeechWindow();
    const readableText = extractReadableText(
      document.getElementById(ACCESSIBILITY_MAIN_CONTENT_ID),
    );

    if (!readableText) {
      setScreenReaderUnavailableReason("no-readable-content");
      announce(getScreenReaderDescription("no-readable-content", false));
      return;
    }

    if (!speechWindow?.SpeechSynthesisUtterance) {
      setScreenReaderUnavailableReason("unsupported");
      announce(getScreenReaderDescription("unsupported", false));
      return;
    }

    speechWindow.speechSynthesis.cancel();

    const utterance = new speechWindow.SpeechSynthesisUtterance(readableText);
    utterance.lang = getSpeechLanguage();
    utterance.onend = () => {
      screenReaderUtteranceRef.current = null;
      setScreenReaderActive(false);
      announce("Screen reader finished reading this page.");
    };
    utterance.onerror = () => {
      screenReaderUtteranceRef.current = null;
      setScreenReaderActive(false);
      announce("Screen reader stopped because speech playback failed.");
    };

    screenReaderUtteranceRef.current = utterance;
    setScreenReaderUnavailableReason(null);
    setScreenReaderActive(true);
    announce("Screen reader started reading the current page.");
    speechWindow.speechSynthesis.speak(utterance);
  }

  function syncPreferences(
    nextPreferences: AccessibilityPreferences,
    persistence: "write" | "clear" = "write",
  ) {
    setPreferences(nextPreferences);

    if (typeof document !== "undefined") {
      applyAccessibilityPreferencesToRoot(
        document.documentElement,
        nextPreferences,
      );
    }

    if (typeof window !== "undefined") {
      const storage = getAccessibilityStorage();

      if (persistence === "clear") {
        clearAccessibilityPreferencesFromStorage(storage);
      } else {
        writeAccessibilityPreferencesToStorage(nextPreferences, storage);
      }
    }

    dispatchAccessibilityPreferencesEvent(nextPreferences);
  }

  function updatePreference(
    updater: (current: AccessibilityPreferences) => AccessibilityPreferences,
    announcementLabel: string,
  ) {
    const nextPreferences = updater(preferences);
    syncPreferences(nextPreferences);
    announce(announcementLabel);
  }

  function handleTextSizeToggle() {
    updatePreference(
      (current) => ({
        ...current,
        textSize: current.textSize === "default" ? "xl" : "default",
      }),
      preferences.textSize === "default"
        ? "Bigger text enabled."
        : "Bigger text disabled.",
    );
  }

  function handleContrastChange(contrast: AccessibilityContrast) {
    updatePreference(
      (current) => ({
        ...current,
        contrast,
      }),
      `${getContrastLabel(contrast)} enabled.`,
    );
  }

  function handleLineHeightChange(lineHeight: AccessibilityLineHeight) {
    updatePreference(
      (current) => ({
        ...current,
        lineHeight,
      }),
      lineHeight === "relaxed"
        ? "Relaxed line height enabled."
        : "Relaxed line height disabled.",
    );
  }

  function handleReduceMotionToggle() {
    updatePreference(
      (current) => ({
        ...current,
        reduceMotion: !current.reduceMotion,
      }),
      preferences.reduceMotion
        ? "Pause animations disabled."
        : "Pause animations enabled.",
    );
  }

  function handleToggle<
    K extends keyof Pick<
      AccessibilityPreferences,
      | "highlightLinks"
      | "textSpacing"
      | "dyslexiaFriendly"
      | "hideImages"
      | "largeCursor"
    >,
  >(key: K, label: string) {
    updatePreference(
      (current) => ({
        ...current,
        [key]: !current[key],
      }),
      `${label} ${preferences[key] ? "disabled" : "enabled"}.`,
    );
  }

  function handleReset() {
    announce("All accessibility settings reset.");
    syncPreferences(DEFAULT_ACCESSIBILITY_PREFERENCES, "clear");
  }

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const rootPreferences = readAccessibilityPreferencesFromRoot(
      document.documentElement,
    );
    setPreferences(rootPreferences);

    if (typeof window === "undefined") {
      return;
    }

    const storedPreferences = readAccessibilityPreferencesFromStorage(
      getAccessibilityStorage(),
    );
    setPreferences(storedPreferences);
    applyAccessibilityPreferencesToRoot(
      document.documentElement,
      storedPreferences,
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePreferenceEvent = (event: Event) => {
      if (event instanceof CustomEvent) {
        setPreferences(event.detail as AccessibilityPreferences);
        return;
      }

      if (typeof document !== "undefined") {
        setPreferences(
          readAccessibilityPreferencesFromRoot(document.documentElement),
        );
      }
    };

    window.addEventListener(
      ACCESSIBILITY_EVENT_NAME,
      handlePreferenceEvent as EventListener,
    );

    return () => {
      window.removeEventListener(
        ACCESSIBILITY_EVENT_NAME,
        handlePreferenceEvent as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!isVariantActive) {
      setIsOpen(false);
      stopScreenReader();
      stopVoiceNavigation(undefined, { preserveReason: true });
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      refreshAssistiveAvailability();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVariantActive]);

  useEffect(() => {
    if (!isVariantActive) {
      return;
    }

    const handleShortcut = (event: KeyboardEvent) => {
      if (!isAccessibilityMenuShortcut(event)) {
        return;
      }

      event.preventDefault();
      setIsOpen((current) => !current);
    };

    document.addEventListener("keydown", handleShortcut);

    return () => {
      document.removeEventListener("keydown", handleShortcut);
    };
  }, [isVariantActive]);

  useEffect(() => {
    if (!announcement) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setAnnouncement("");
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [announcement]);

  useEffect(() => {
    if (!isVariantActive || !isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      closePanel();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isVariantActive]);

  useEffect(() => {
    if (!mounted || !isVariantActive) {
      return;
    }

    const didNavigate = previousPathnameRef.current !== pathname;
    previousPathnameRef.current = pathname;

    const frame = window.requestAnimationFrame(() => {
      refreshAssistiveAvailability();

      if (didNavigate && screenReaderUtteranceRef.current) {
        stopScreenReader("Screen reader stopped after navigation.");
      }

      if (voiceRecognitionRef.current) {
        voiceRecognitionRef.current.lang = getSpeechLanguage();
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, pathname, isVariantActive]);

  useEffect(() => {
    return () => {
      stopScreenReader();
      stopVoiceNavigation(undefined, { preserveReason: true });
      voiceRecognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = useMemo(
    () =>
      [
        {
          key: "assistive" as SectionKey,
          title: "Assistive Tools",
          rows: [
            {
              active: screenReaderActive,
              description: getScreenReaderDescription(
                screenReaderUnavailableReason,
                screenReaderActive,
              ),
              disabled: screenReaderUnavailableReason != null,
              icon: <ScreenReaderIcon />,
              label: "Screen Reader",
              onClick: handleScreenReaderToggle,
            },
            {
              active: voiceNavigationActive || voiceNavigationStarting,
              description: getVoiceNavigationDescription(
                voiceNavigationUnavailableReason,
                voiceNavigationActive,
                voiceNavigationStarting,
              ),
              disabled: voiceNavigationUnavailableReason != null,
              icon: <VoiceNavigationIcon />,
              label: "Voice Navigation",
              onClick: () => {
                if (voiceNavigationActive || voiceNavigationStarting) {
                  stopVoiceNavigation("Voice navigation turned off.");
                  return;
                }

                startVoiceNavigation();
              },
            },
          ],
        },
        {
          key: "reading" as SectionKey,
          title: "Reading",
          rows: [
            {
              active: preferences.textSize !== "default",
              description: "Increase page scale for easier reading.",
              icon: <TextIcon />,
              label: "Bigger Text",
              onClick: handleTextSizeToggle,
            },
            {
              active: preferences.textSpacing,
              description: "Add breathing room between letters and words.",
              icon: <SpacingIcon />,
              label: "Text Spacing",
              onClick: () => handleToggle("textSpacing", "Text spacing"),
            },
            {
              active: preferences.lineHeight === "relaxed",
              description: "Increase vertical rhythm for dense copy.",
              icon: <LineHeightIcon />,
              label: "Line Height",
              onClick: () =>
                handleLineHeightChange(
                  preferences.lineHeight === "relaxed" ? "default" : "relaxed",
                ),
            },
            {
              active: preferences.dyslexiaFriendly,
              description: "Switch to a simpler reading-focused font.",
              icon: <DyslexiaIcon />,
              label: "Dyslexia Friendly",
              onClick: () =>
                handleToggle("dyslexiaFriendly", "Dyslexia friendly mode"),
            },
          ],
        },
        {
          key: "motion" as SectionKey,
          title: "Motion & Contrast",
          rows: [
            {
              active: preferences.reduceMotion,
              description: "Pause transitions and interface animation.",
              icon: <MotionIcon />,
              label: "Pause Animations",
              onClick: handleReduceMotionToggle,
            },
          ],
        },
        {
          key: "interface" as SectionKey,
          title: "Interface",
          rows: [
            {
              active: preferences.highlightLinks,
              description: "Emphasize links and action buttons.",
              icon: <LinksIcon />,
              label: "Highlight Links",
              onClick: () => handleToggle("highlightLinks", "Highlight links"),
            },
            {
              active: preferences.hideImages,
              description: "Hide images while keeping layout intact.",
              icon: <ImageIcon />,
              label: "Hide Images",
              onClick: () => handleToggle("hideImages", "Hide images"),
            },
            {
              active: preferences.largeCursor,
              description: "Use a larger cursor across the site.",
              icon: <CursorIcon />,
              label: "Large Cursor",
              onClick: () => handleToggle("largeCursor", "Large cursor"),
            },
          ],
        },
      ] as const,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      preferences,
      screenReaderActive,
      screenReaderUnavailableReason,
      voiceNavigationActive,
      voiceNavigationStarting,
      voiceNavigationUnavailableReason,
    ],
  );

  const activeCount = sections
    .filter((section) => section.key !== "assistive")
    .reduce(
      (acc, section) => acc + section.rows.filter((row) => row.active).length,
      0,
    ) + (preferences.contrast !== "default" ? 1 : 0);

  const drawerTransition = skipAnimation
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 32 };

  const backdropTransition = skipAnimation
    ? { duration: 0 }
    : { duration: 0.18 };

  return (
    <div className={isMobile ? "lg:hidden" : "hidden lg:block"}>
      <button
        aria-controls={dialogId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={triggerLabel}
        className="a11y-widget-trigger inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white/80 text-[var(--teal-deep)] shadow-sm transition hover:-translate-y-[1px] hover:bg-white hover:shadow-md"
        onClick={() => setIsOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <span className="sr-only">{triggerLabel}</span>
        <AccessibilityTriggerIcon />
        {hasCustomSettings || assistiveToolsActive ? (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--teal)] ring-2 ring-[var(--background)]"
          />
        ) : null}
      </button>

      {mounted && isVariantActive
        ? createPortal(
            <AnimatePresence>
              {isOpen ? (
                <motion.div
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-[90] bg-[rgba(18,21,46,0.4)] backdrop-blur-sm"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  key="a11y-backdrop"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      closePanel();
                    }
                  }}
                  transition={backdropTransition}
                >
                  <motion.div
                    animate={{ x: 0 }}
                    aria-labelledby={`${dialogId}-title`}
                    aria-modal="true"
                    className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col border-l border-[var(--line)] bg-[var(--background)] shadow-[0_30px_90px_rgba(18,21,46,0.18)]"
                    exit={{ x: "100%" }}
                    id={dialogId}
                    initial={{ x: "100%" }}
                    key="a11y-drawer"
                    role="dialog"
                    transition={drawerTransition}
                  >
                    <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-5">
                      <div>
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--neutral)]">
                          Accessibility
                        </p>
                        <h2
                          className="mt-1 font-display text-[1.65rem] leading-tight tracking-[-0.03em] text-[var(--foreground)]"
                          id={`${dialogId}-title`}
                        >
                          Personalize your view
                        </h2>
                        <p className="mt-1 text-xs text-[var(--neutral)]">
                          Press{" "}
                          <kbd className="rounded border border-[var(--line)] bg-white px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold">
                            Ctrl+U
                          </kbd>{" "}
                          anytime
                        </p>
                      </div>
                      <button
                        aria-label="Close accessibility menu"
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--foreground)] transition hover:border-[var(--teal)]/40 hover:text-[var(--teal)]"
                        onClick={closePanel}
                        ref={closeButtonRef}
                        type="button"
                      >
                        <span className="h-4 w-4">
                          <CloseIcon />
                        </span>
                      </button>
                    </header>

                    <div className="flex-1 overflow-y-auto px-6 py-5">
                      {activeCount > 0 ? (
                        <div className="mb-5 flex items-center justify-between rounded-2xl border border-[var(--teal)]/20 bg-[rgba(209,0,52,0.04)] px-4 py-3">
                          <span className="text-xs font-semibold text-[var(--teal-deep)]">
                            {activeCount} setting{activeCount === 1 ? "" : "s"} active
                          </span>
                          <button
                            className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] transition hover:text-[var(--teal-deep)]"
                            onClick={handleReset}
                            type="button"
                          >
                            Reset all
                          </button>
                        </div>
                      ) : null}

                      <div className="space-y-6">
                        {sections.map((section) => (
                          <section key={section.key}>
                            <h3 className="mb-2.5 px-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--neutral)]">
                              {section.title}
                            </h3>
                            <div className="space-y-2">
                              {section.rows.map((row) => (
                                <ToggleRow
                                  active={row.active}
                                  description={row.description}
                                  disabled={"disabled" in row ? row.disabled : false}
                                  icon={row.icon}
                                  key={row.label}
                                  label={row.label}
                                  onClick={row.onClick}
                                />
                              ))}
                              {section.key === "motion" ? (
                                <ContrastCycleRow
                                  contrast={preferences.contrast}
                                  onClick={() =>
                                    handleContrastChange(
                                      nextContrast(preferences.contrast),
                                    )
                                  }
                                />
                              ) : null}
                            </div>
                          </section>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
