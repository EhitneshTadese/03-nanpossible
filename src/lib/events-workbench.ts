import type { EventRecord } from "@/lib/types";

export type EventDraft = {
  id: string | null;
  chapterId: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  description: string;
  published: boolean;
};

export function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function createEmptyEventDraft(chapterId: string): EventDraft {
  return {
    id: null,
    chapterId,
    title: "",
    startAt: "",
    endAt: "",
    location: "",
    description: "",
    published: false,
  };
}

export function createEventDraft(event: EventRecord): EventDraft {
  return {
    id: event.id,
    chapterId: event.chapterId,
    title: event.title,
    startAt: toDateTimeLocalValue(event.startAt),
    endAt: toDateTimeLocalValue(event.endAt),
    location: event.location ?? "",
    description: event.description ?? "",
    published: event.published,
  };
}

export function normalizeEventDraftForSave(draft: EventDraft) {
  const title = draft.title.trim();
  const startAt = draft.startAt.trim();
  const endAt = draft.endAt.trim();
  const location = draft.location.trim();
  const description = draft.description.trim();

  if (!draft.chapterId || !title || !startAt) {
    return {
      ok: false,
      error: "missing-fields",
    } as const;
  }

  const startAtDate = new Date(startAt);

  if (Number.isNaN(startAtDate.getTime())) {
    return {
      ok: false,
      error: "missing-fields",
    } as const;
  }

  const endAtDate = endAt ? new Date(endAt) : null;

  if (endAtDate && Number.isNaN(endAtDate.getTime())) {
    return {
      ok: false,
      error: "missing-fields",
    } as const;
  }

  return {
    ok: true,
    payload: {
      eventId: draft.id,
      chapterId: draft.chapterId,
      title,
      startAt: startAtDate.toISOString(),
      endAt: endAtDate ? endAtDate.toISOString() : null,
      location: location || null,
      description: description || null,
      published: draft.published,
    },
  } as const;
}

export function buildEventPreviewList(
  draft: EventDraft,
  events: EventRecord[],
) {
  const normalized = normalizeEventDraftForSave(draft);
  const visibleEvents = draft.id
    ? events.filter((event) => event.id !== draft.id)
    : [...events];

  if (!normalized.ok) {
    return visibleEvents.sort((left, right) => left.startAt.localeCompare(right.startAt));
  }

  const draftEvent: EventRecord = {
    id: draft.id ?? "draft-preview",
    chapterId: draft.chapterId,
    title: normalized.payload.title,
    startAt: normalized.payload.startAt,
    endAt: normalized.payload.endAt,
    location: normalized.payload.location,
    description: normalized.payload.description,
    published: draft.published,
    createdAt: "",
    updatedAt: "",
  };

  return [...visibleEvents, draftEvent].sort((left, right) =>
    left.startAt.localeCompare(right.startAt),
  );
}
