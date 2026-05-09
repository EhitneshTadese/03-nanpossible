import { describe, expect, it } from "vitest";
import {
  buildEventPreviewList,
  createEmptyEventDraft,
  normalizeEventDraftForSave,
} from "./events-workbench";
import type { EventRecord } from "./types";

describe("normalizeEventDraftForSave", () => {
  it("rejects incomplete event drafts", () => {
    expect(normalizeEventDraftForSave(createEmptyEventDraft("chapter-1")).ok).toBe(false);
  });

  it("normalizes valid event payloads", () => {
    const normalized = normalizeEventDraftForSave({
      id: null,
      chapterId: "chapter-1",
      title: " Action Learning Summit ",
      startAt: "2026-05-01T10:30",
      endAt: "2026-05-01T12:00",
      location: " Chicago ",
      description: " Hands-on workshop ",
      published: true,
    });

    expect(normalized.ok).toBe(true);

    if (normalized.ok) {
      expect(normalized.payload.title).toBe("Action Learning Summit");
      expect(normalized.payload.location).toBe("Chicago");
      expect(normalized.payload.description).toBe("Hands-on workshop");
      expect(normalized.payload.published).toBe(true);
    }
  });
});

describe("buildEventPreviewList", () => {
  it("injects the draft event into the public preview order", () => {
    const events: EventRecord[] = [
      {
        id: "2",
        chapterId: "chapter-1",
        title: "Later event",
        startAt: "2026-05-02T10:00:00.000Z",
        endAt: null,
        location: null,
        description: null,
        published: true,
        createdAt: "",
        updatedAt: "",
      },
    ];

    const previewEvents = buildEventPreviewList(
      {
        id: null,
        chapterId: "chapter-1",
        title: "Earlier draft",
        startAt: "2026-05-01T08:00",
        endAt: "",
        location: "",
        description: "",
        published: false,
      },
      events,
    );

    expect(previewEvents[0]?.title).toBe("Earlier draft");
    expect(previewEvents[1]?.title).toBe("Later event");
  });
});
