import { describe, expect, it } from "vitest";
import { getWorkbenchStatusCopy } from "./workbench";

describe("getWorkbenchStatusCopy", () => {
  it("surfaces unsaved and saving states", () => {
    expect(getWorkbenchStatusCopy("dirty").label).toBe("Unsaved changes");
    expect(getWorkbenchStatusCopy("saving").label).toBe("Saving draft...");
  });

  it("marks saved and error states", () => {
    expect(getWorkbenchStatusCopy("saved", { lastSavedAt: "2026-04-20T15:10:00.000Z" }).label).toMatch(
      /^Saved/,
    );
    expect(getWorkbenchStatusCopy("error").label).toBe("Save failed");
  });
});
