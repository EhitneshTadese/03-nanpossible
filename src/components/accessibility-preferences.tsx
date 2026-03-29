"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ACCESSIBILITY_EVENT_NAME,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  applyAccessibilityPreferencesToRoot,
  clearAccessibilityPreferencesFromStorage,
  dispatchAccessibilityPreferencesEvent,
  getAccessibilityStorage,
  hasCustomAccessibilityPreferences,
  readAccessibilityPreferencesFromRoot,
  readAccessibilityPreferencesFromStorage,
  writeAccessibilityPreferencesToStorage,
  type AccessibilityContrast,
  type AccessibilityPreferences,
  type AccessibilityTextSize,
} from "@/lib/accessibility-preferences";

type AccessibilityPreferencesProps = {
  variant: "desktop" | "mobile";
};

const textSizeOptions: Array<{
  value: AccessibilityTextSize;
  label: string;
}> = [
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
  { value: "xl", label: "Extra Large" },
];

const contrastOptions: Array<{
  value: AccessibilityContrast;
  label: string;
}> = [
  { value: "default", label: "Default" },
  { value: "high", label: "High Contrast" },
];

function AccessibilityIcon() {
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

export function AccessibilityPreferencesWidget({
  variant,
}: AccessibilityPreferencesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mobileTop, setMobileTop] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    DEFAULT_ACCESSIBILITY_PREFERENCES,
  );
  const [announcement, setAnnouncement] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const isMobile = variant === "mobile";
  const hasCustomSettings = hasCustomAccessibilityPreferences(preferences);
  const triggerLabel = hasCustomSettings
    ? "Accessibility preferences (custom settings active)"
    : "Accessibility preferences";

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

  function closePanel() {
    setIsOpen(false);
    window.requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }

  function handleTextSizeChange(textSize: AccessibilityTextSize) {
    syncPreferences({ ...preferences, textSize });
  }

  function handleContrastChange(contrast: AccessibilityContrast) {
    syncPreferences({ ...preferences, contrast });
  }

  function handleReduceMotionToggle() {
    syncPreferences({
      ...preferences,
      reduceMotion: !preferences.reduceMotion,
    });
  }

  function handleReset() {
    setAnnouncement("Preferences reset to defaults.");
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
    if (!announcement) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setAnnouncement("");
    }, 2500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [announcement]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const firstControl = panelRef.current?.querySelector<
        HTMLInputElement | HTMLButtonElement
      >("input:not([disabled]), button:not([disabled])");

      firstControl?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;

      if (!target || wrapperRef.current?.contains(target)) {
        return;
      }

      closePanel();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      closePanel();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isMobile) {
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      setMobileTop((rect?.bottom ?? 84) + 12);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isMobile, isOpen]);

  return (
    <div
      className={isMobile ? "relative md:hidden" : "relative hidden md:block"}
      ref={wrapperRef}
    >
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={triggerLabel}
        className="a11y-widget-trigger inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white/72 text-teal-deep shadow-[0_14px_34px_rgba(22,63,61,0.08)] transition hover:-translate-y-[1px] hover:bg-white"
        onClick={() => setIsOpen((value) => !value)}
        ref={triggerRef}
        type="button"
      >
        <span className="sr-only">{triggerLabel}</span>
        <AccessibilityIcon />
        {hasCustomSettings ? (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-background"
          />
        ) : null}
      </button>

      {isOpen ? (
        <div
          aria-label="Accessibility preferences"
          className={`a11y-widget-panel site-panel z-50 rounded-[1.7rem] border border-line bg-[rgba(255,250,242,0.98)] p-5 shadow-[0_26px_72px_rgba(22,63,61,0.16)] ${isMobile ? "fixed left-4 right-4" : "absolute right-0 top-[calc(100%+0.75rem)] w-[19.5rem]"}`}
          id={panelId}
          ref={panelRef}
          role="region"
          style={
            isMobile
              ? {
                  top: `${mobileTop ?? 96}px`,
                }
              : undefined
          }
          tabIndex={-1}
        >
          <div className="grid gap-5">
            <div className="grid gap-2">
              <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.18em] text-foreground/52">
                Site preferences
              </p>
              <h2 className="font-display text-[1.9rem] leading-none tracking-[-0.05em] text-teal-deep">
                Accessibility
              </h2>
              <p className="text-sm leading-6 text-foreground/72">
                Adjust text size, contrast, and motion instantly across the site.
              </p>
            </div>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-teal-deep">
                Text Size
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {textSizeOptions.map((option) => (
                  <label className="block" key={option.value}>
                    <input
                      checked={preferences.textSize === option.value}
                      className="peer sr-only"
                      name={`${panelId}-text-size`}
                      onChange={() => handleTextSizeChange(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span className="a11y-widget-option flex min-h-11 items-center justify-center rounded-full border border-line bg-white/72 px-3 py-2 text-center text-sm font-semibold text-teal-deep transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal peer-checked:border-teal peer-checked:bg-teal-deep peer-checked:text-white">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-teal-deep">
                Contrast
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {contrastOptions.map((option) => (
                  <label className="block" key={option.value}>
                    <input
                      checked={preferences.contrast === option.value}
                      className="peer sr-only"
                      name={`${panelId}-contrast`}
                      onChange={() => handleContrastChange(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span className="a11y-widget-option flex min-h-11 items-center justify-center rounded-full border border-line bg-white/72 px-3 py-2 text-center text-sm font-semibold text-teal-deep transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal peer-checked:border-teal peer-checked:bg-teal-deep peer-checked:text-white">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3">
              <span className="text-sm font-semibold text-teal-deep">
                Reduce Motion
              </span>
              <button
                aria-label="Reduce Motion"
                aria-checked={preferences.reduceMotion}
                className="a11y-widget-switch flex min-h-12 items-center justify-between gap-4 rounded-[1.25rem] border border-line bg-white/72 px-4 py-3 text-left transition hover:bg-white"
                onClick={handleReduceMotionToggle}
                role="switch"
                type="button"
              >
                <div className="grid gap-1">
                  <span className="text-sm font-semibold text-teal-deep">
                    {preferences.reduceMotion ? "On" : "Off"}
                  </span>
                  <span className="text-sm leading-6 text-foreground/72">
                    Turn off interface animations and transitions on this site.
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border border-line ${preferences.reduceMotion ? "bg-teal-deep" : "bg-background"}`}
                >
                  <span
                    className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_4px_12px_rgba(22,63,61,0.18)] transition ${preferences.reduceMotion ? "left-[calc(100%-1.45rem)]" : "left-[3px]"}`}
                  />
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                className="a11y-widget-reset text-sm font-semibold text-teal-deep underline decoration-accent/55 underline-offset-4"
                onClick={handleReset}
                type="button"
              >
                Reset to defaults
              </button>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/52">
                {hasCustomSettings ? "Custom active" : "Defaults active"}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
