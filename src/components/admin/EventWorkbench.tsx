"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { AdminWorkbench } from "@/components/admin/AdminWorkbench";
import { UpcomingEvents } from "@/components/chapter/UpcomingEvents";
import {
  buildEventPreviewList,
  createEmptyEventDraft,
  createEventDraft,
  type EventDraft,
} from "@/lib/events-workbench";
import { useEventCallback } from "@/lib/use-event";
import { getWorkbenchStatusCopy, type WorkbenchSaveState } from "@/lib/workbench";
import type { EventRecord } from "@/lib/types";

type EventWorkbenchProps = {
  chapterId: string;
  chapterSubdomain: string;
  initialEvents: EventRecord[];
  initialSelectedEventId?: string | null;
};

function draftsAreEqual(left: EventDraft, right: EventDraft) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function EventWorkbench({
  chapterId,
  chapterSubdomain,
  initialEvents,
  initialSelectedEventId = null,
}: EventWorkbenchProps) {
  const [events, setEvents] = useState(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialSelectedEventId ?? initialEvents[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<EventDraft>(() => {
    const selectedEvent =
      initialEvents.find((event) => event.id === initialSelectedEventId) ??
      initialEvents[0] ??
      null;

    return selectedEvent ? createEventDraft(selectedEvent) : createEmptyEventDraft(chapterId);
  });
  const [saveState, setSaveState] = useState<WorkbenchSaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const canonicalDraft = selectedEvent
    ? createEventDraft(selectedEvent)
    : createEmptyEventDraft(chapterId);
  const isDirty = !draftsAreEqual(draft, canonicalDraft);
  const effectiveSaveState: WorkbenchSaveState =
    saveState === "error" ? "error" : isDirty && saveState !== "saving" ? "dirty" : saveState;
  const saveStatus = getWorkbenchStatusCopy(effectiveSaveState, {
    lastSavedAt,
  });

  useEffect(() => {
    const nextSelectedEvent = events.find((event) => event.id === selectedEventId) ?? null;

    if (nextSelectedEvent) {
      setDraft(createEventDraft(nextSelectedEvent));
      setSaveState("idle");
      return;
    }

    setDraft(createEmptyEventDraft(chapterId));
    setSaveState("idle");
  }, [chapterId, events, selectedEventId]);

  const previewEvents = useMemo(() => buildEventPreviewList(draft, events), [draft, events]);

  const handleSave = useEventCallback(async () => {
    setNotice(null);
    setSaveState("saving");

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as {
        error?: string;
        event?: EventRecord;
        savedAt?: string;
      };

      if (!response.ok || !payload.event) {
        setSaveState("error");
        setNotice({
          message: payload.error ?? "WIAL could not save this event.",
          tone: "error",
        });
        return;
      }

      startTransition(() => {
        setEvents((currentEvents) => {
          const remainingEvents = currentEvents.filter(
            (event) => event.id !== payload.event?.id,
          );

          return [...remainingEvents, payload.event!].sort((left, right) =>
            left.startAt.localeCompare(right.startAt),
          );
        });
        setSelectedEventId(payload.event!.id);
        setLastSavedAt(payload.savedAt ?? new Date().toISOString());
        setSaveState("saved");
        setNotice({
          message: draft.id ? "Event updated." : "Event created.",
          tone: "success",
        });
      });
    } catch {
      setSaveState("error");
      setNotice({
        message: "WIAL could not save this event.",
        tone: "error",
      });
    }
  });

  const handleDelete = useEventCallback(async () => {
    if (!draft.id || !window.confirm("Delete this event?")) {
      return;
    }

    setNotice(null);
    setSaveState("saving");

    try {
      const response = await fetch("/api/events", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chapterId,
          eventId: draft.id,
        }),
      });
      const payload = (await response.json()) as {
        deletedEventId?: string;
        error?: string;
        savedAt?: string;
      };

      if (!response.ok || !payload.deletedEventId) {
        setSaveState("error");
        setNotice({
          message: payload.error ?? "WIAL could not delete this event.",
          tone: "error",
        });
        return;
      }

      startTransition(() => {
        setEvents((currentEvents) =>
          currentEvents.filter((event) => event.id !== payload.deletedEventId),
        );
        setSelectedEventId(null);
        setLastSavedAt(payload.savedAt ?? new Date().toISOString());
        setSaveState("saved");
        setNotice({
          message: "Event deleted.",
          tone: "success",
        });
      });
    } catch {
      setSaveState("error");
      setNotice({
        message: "WIAL could not delete this event.",
        tone: "error",
      });
    }
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") {
        return;
      }

      event.preventDefault();
      void handleSave();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  return (
    <AdminWorkbench
      actions={
        <>
          <button
            className="button-link secondary"
            onClick={() => {
              setNotice(null);
              setSelectedEventId(null);
            }}
            type="button"
          >
            New event
          </button>
          {draft.id ? (
            <button
              className="button-link secondary"
              onClick={() => void handleDelete()}
              type="button"
            >
              Delete
            </button>
          ) : null}
          <button className="button-link primary" onClick={() => void handleSave()} type="button">
            {draft.id ? "Save changes" : "Create event"}
          </button>
        </>
      }
      editLabel="Event form"
      editPane={
        <div className="space-y-5">
          {notice ? (
            <div className={`account-flash ${notice.tone === "success" ? "is-success" : "is-error"}`}>
              {notice.message}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="field-shell">
              <span className="field-label">Title</span>
              <input
                className="field-input"
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    title: event.target.value,
                  }))
                }
                type="text"
                value={draft.title}
              />
            </label>

            <label className="field-shell">
              <span className="field-label">Location</span>
              <input
                className="field-input"
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    location: event.target.value,
                  }))
                }
                type="text"
                value={draft.location}
              />
            </label>

            <label className="field-shell">
              <span className="field-label">Start</span>
              <input
                className="field-input"
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    startAt: event.target.value,
                  }))
                }
                required
                type="datetime-local"
                value={draft.startAt}
              />
            </label>

            <label className="field-shell">
              <span className="field-label">End</span>
              <input
                className="field-input"
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    endAt: event.target.value,
                  }))
                }
                type="datetime-local"
                value={draft.endAt}
              />
            </label>
          </div>

          <label className="field-shell">
            <span className="field-label">Description</span>
            <textarea
              className="field-textarea"
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  description: event.target.value,
                }))
              }
              rows={7}
              value={draft.description}
            />
          </label>

          <label className="coach-checkbox">
            <input
              checked={draft.published}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  published: event.target.checked,
                }))
              }
              type="checkbox"
            />
            <span>Show this event on the public chapter site</span>
          </label>
        </div>
      }
      eyebrow="Event workbench"
      liveHref={`/sites/${chapterSubdomain}`}
      previewLabel="Homepage preview"
      previewPane={
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-line/80 bg-white/62 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/42">
              Preview behavior
            </p>
            <p className="mt-2 text-sm leading-7 text-foreground/64">
              The card below uses the same `UpcomingEvents` rendering as the public chapter homepage.
            </p>
          </div>
          <div className="overflow-hidden rounded-[1.7rem] border border-line/70 bg-[rgba(255,252,248,0.88)]">
            <UpcomingEvents events={previewEvents} />
          </div>
        </div>
      }
      rail={
        <div className="space-y-4 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Scheduled events</p>
            <button
              className="rounded-full border border-line/80 bg-white/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/56 transition-colors hover:text-teal-deep"
              onClick={() => {
                setNotice(null);
                setSelectedEventId(null);
              }}
              type="button"
            >
              New
            </button>
          </div>

          <div className="grid gap-3">
            {events.map((event) => (
              <button
                className={`rounded-[1.25rem] border px-4 py-4 text-left transition-colors ${
                  selectedEventId === event.id
                    ? "border-teal/20 bg-white text-teal-deep shadow-[0_14px_36px_rgba(22,63,61,0.08)]"
                    : "border-line/75 bg-white/55 text-foreground/68 hover:bg-white/74 hover:text-teal-deep"
                }`}
                key={event.id}
                onClick={() => {
                  setNotice(null);
                  setSelectedEventId(event.id);
                }}
                type="button"
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-foreground/42">
                  {event.published ? "Published" : "Draft"}
                </p>
                <h3 className="mt-3 text-base font-semibold">{event.title}</h3>
                <p className="mt-2 text-sm text-foreground/58">
                  {new Date(event.startAt).toLocaleString()}
                </p>
              </button>
            ))}

            {events.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-line/75 bg-white/38 px-4 py-5 text-sm leading-7 text-foreground/64">
                No events are scheduled yet.
              </div>
            ) : null}
          </div>
        </div>
      }
      saveStatus={saveStatus}
      stageLabel={draft.published ? "Published event" : "Draft event"}
      stageTone={draft.published ? "success" : "warning"}
      subtitle="Manage event cards with the same public rendering used on the chapter homepage, while keeping form fields and storage unchanged."
      title={draft.title.trim() || (draft.id ? "Untitled event" : "New event")}
    />
  );
}
