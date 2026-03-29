import { describe, expect, it } from "vitest";
import { extractCredlyBadgeMetadataFromHtml } from "@/lib/credly";

describe("Credly badge metadata parsing", () => {
  it("extracts public badge image and title from page metadata", () => {
    const metadata = extractCredlyBadgeMetadataFromHtml(`
      <html>
        <head>
          <meta property="og:title" content="Master Coach Badge" />
          <meta property="og:image" content="https://images.credly.com/images/example/image.png" />
        </head>
      </html>
    `);

    expect(metadata.title).toBe("Master Coach Badge");
    expect(metadata.imageUrl).toBe(
      "https://images.credly.com/images/example/image.png",
    );
  });

  it("falls back to title tags when social metadata is missing", () => {
    const metadata = extractCredlyBadgeMetadataFromHtml(`
      <html>
        <head>
          <title>CALC Badge</title>
        </head>
      </html>
    `);

    expect(metadata.title).toBe("CALC Badge");
    expect(metadata.imageUrl).toBeNull();
  });
});

