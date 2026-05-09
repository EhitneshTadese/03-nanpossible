import { describe, expect, it } from "vitest";
import { sanitizeContentPageHtml } from "./content-html";

describe("sanitizeContentPageHtml", () => {
  it("removes unsafe tags and attributes", () => {
    expect(
      sanitizeContentPageHtml(
        '<p>Hello</p><script>alert(1)</script><img src="https://example.com/x.png" onerror="alert(1)" alt="x" />',
      ),
    ).toBe('<p>Hello</p><img src="https://example.com/x.png" alt="x" />');
  });

  it("preserves supported image width and link attributes", () => {
    expect(
      sanitizeContentPageHtml(
        '<p><a href="https://example.com" target="_blank" rel="noreferrer">Read more</a></p><img src="https://example.com/x.png" alt="Hero" width="640" />',
      ),
    ).toContain('width="640"');
  });
});
