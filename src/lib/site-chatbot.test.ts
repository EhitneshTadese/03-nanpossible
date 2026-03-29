import { describe, expect, it } from "vitest";
import { buildFallbackAssistantReply } from "@/lib/site-chatbot";

describe("site chatbot fallback", () => {
  it("returns CALC application guidance for application questions", () => {
    const reply = buildFallbackAssistantReply("Where is the CALC application form?");

    expect(reply).toContain("/downloads/certification/calc-application.doc");
    expect(reply).toContain("/certification#calc");
  });

  it("returns renewal guidance for PALC renewal questions", () => {
    const reply = buildFallbackAssistantReply("How do I renew PALC?");

    expect(reply).toContain("valid for 2 years");
    expect(reply).toContain("10 hours");
  });

  it("returns the LMS fallback link for LMS questions", () => {
    const reply = buildFallbackAssistantReply("Where is the LMS?");

    expect(reply).toContain("wialportal.org");
  });
});

