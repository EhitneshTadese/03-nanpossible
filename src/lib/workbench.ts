export type WorkbenchSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function formatWorkbenchTimestamp(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getWorkbenchStatusCopy(
  state: WorkbenchSaveState,
  options: {
    lastSavedAt?: string | null;
  } = {},
) {
  switch (state) {
    case "dirty":
      return {
        label: "Unsaved changes",
        tone: "warning",
      } as const;
    case "saving":
      return {
        label: "Saving draft...",
        tone: "neutral",
      } as const;
    case "saved": {
      const formattedTime = formatWorkbenchTimestamp(options.lastSavedAt);

      return {
        label: formattedTime ? `Saved ${formattedTime}` : "Saved",
        tone: "success",
      } as const;
    }
    case "error":
      return {
        label: "Save failed",
        tone: "error",
      } as const;
    default:
      return {
        label: "Draft ready",
        tone: "neutral",
      } as const;
  }
}
