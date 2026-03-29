import { describe, expect, it } from "vitest";
import { getContentPage } from "./content";

describe("getContentPage", () => {
  it("returns the global page when no tenant override exists", async () => {
    const page = await getContentPage({ slug: "about" });

    expect(page?.title).toBe("About WIAL");
  });

  it("prefers chapter overrides before falling back to global content", async () => {
    const page = await getContentPage({
      slug: "contact",
      chapterId: "22222222-2222-4222-8222-222222222222",
      tenantSubdomain: "usa",
    });

    expect(page?.title).toBe("Contact WIAL USA");
  });
});
