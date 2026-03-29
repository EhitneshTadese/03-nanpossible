import { describe, expect, it } from "vitest";
import {
  estimateMp3DurationSeconds,
  htmlToNarrationText,
  truncateNarrationText,
} from "@/lib/audio";

describe("audio helpers", () => {
  it("converts HTML into narration-friendly text with block spacing", () => {
    const html = `
      <section>
        <h2>About WIAL</h2>
        <p>Action Learning solves urgent problems.</p>
        <ul>
          <li>Leadership development</li>
          <li>Team performance</li>
        </ul>
      </section>
    `;

    expect(htmlToNarrationText(html)).toBe(
      "About WIAL\n\nAction Learning solves urgent problems.\n\n• Leadership development\n\n• Team performance",
    );
  });

  it("truncates narration at a clean sentence boundary when possible", () => {
    const text =
      "WIAL supports chapter growth worldwide. This sentence should stay. This sentence is intentionally very long so the helper trims after a clean stop instead of cutting in the middle.";

    expect(truncateNarrationText(text, 85)).toBe(
      "WIAL supports chapter growth worldwide. This sentence should stay.",
    );
  });

  it("estimates duration from mp3 byte length", () => {
    expect(estimateMp3DurationSeconds(128000)).toBe(8);
  });
});
