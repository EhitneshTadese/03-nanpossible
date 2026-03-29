import pages from "@/content/pages.json";
import {
  getCertificationHubContent,
  getCertificationLmsUrl,
  getTrackDocuments,
} from "@/lib/certification";
import type {
  CertificationLevel,
  CertificationTrackKey,
  ContentPageRecord,
} from "@/lib/types";

export type SiteChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const contentPages = pages as ContentPageRecord[];

function getGlobalPage(slug: string) {
  return contentPages.find((page) => page.chapterId === null && page.slug === slug) ?? null;
}

function inferTrackKey(query: string): CertificationTrackKey | null {
  const normalized = query.toLowerCase();

  if (normalized.includes("calc")) return "calc";
  if (normalized.includes("palc")) return "palc";
  if (normalized.includes("salc")) return "salc";
  if (normalized.includes("malc")) return "malc";

  return null;
}

function levelFromTrack(track: CertificationTrackKey): CertificationLevel {
  switch (track) {
    case "calc":
      return "CALC";
    case "palc":
      return "PALC";
    case "salc":
      return "SALC";
    case "malc":
      return "MALC";
  }
}

export function buildSiteAssistantContext() {
  const certification = getCertificationHubContent();
  const about = getGlobalPage("about");
  const resources = getGlobalPage("resources");
  const contact = getGlobalPage("contact");

  const trackSummaries = certification.tracks
    .map((track) => {
      const docs = getTrackDocuments(track.key);
      const renewal = certification.recertification.find(
        (rule) => rule.track === track.key,
      );
      const lmsUrl = getCertificationLmsUrl(track.level) ?? "Not configured";

      return [
        `${track.level} (${track.title})`,
        `Summary: ${track.summary}`,
        `Eligibility: ${track.eligibility.join(" | ")}`,
        `Requirements: ${track.requirements.join(" | ")}`,
        `Renewal validity: ${renewal?.validity ?? "See packet"}`,
        `Renewal obligations: ${renewal?.annualRequirements.join(" | ") ?? "See packet"}`,
        `Application form: ${docs.application?.href ?? "Not available"}`,
        `Requirements packet: ${docs.requirements?.href ?? "Not available"}`,
        `Renewal packet: ${docs.recertification?.href ?? "Not available"}`,
        `LMS link: ${lmsUrl}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "WIAL assistant context",
    "The assistant answers questions about WIAL certification, recertification, forms, badges, resources, contact, and LMS entry points.",
    `About WIAL: ${about?.bodyRichtext.heroIntro ?? ""}`,
    `Resources page summary: ${resources?.bodyRichtext.heroIntro ?? ""}`,
    `Contact page summary: ${contact?.bodyRichtext.heroIntro ?? ""}`,
    "Direct contact: info@wial.org | P.O. Box 7601 #83791, Washington, DC 20044",
    "Certification hub anchors: /certification#calc, #palc, #salc, #malc, #progression, #recertification, #forms, #lms",
    trackSummaries,
  ].join("\n\n");
}

export function buildFallbackAssistantReply(query: string) {
  const normalized = query.trim().toLowerCase();
  const certification = getCertificationHubContent();
  const trackKey = inferTrackKey(normalized);

  if (!normalized) {
    return "Ask me about CALC, PALC, SALC, MALC, renewal requirements, application forms, LMS access, or Credly badges.";
  }

  if (normalized.includes("contact") || normalized.includes("email")) {
    return [
      "For certification help, contact WIAL at `info@wial.org`.",
      "You can also use `/contact` for the shared WIAL contact route.",
    ].join("\n\n");
  }

  if (normalized.includes("lms") || normalized.includes("course") || normalized.includes("portal")) {
    if (trackKey) {
      const level = levelFromTrack(trackKey);
      const lmsUrl = getCertificationLmsUrl(level);
      return [
        `${level} uses WIAL's existing external LMS rather than a duplicated in-site course system.`,
        lmsUrl ? `Open LMS: ${lmsUrl}` : "The level-specific LMS link is not configured yet.",
        "You can also review the public certification hub at `/certification#lms`.",
      ].join("\n\n");
    }

    return [
      "WIAL keeps the current LMS external. The website links to it but does not replace it.",
      `Open LMS: ${getCertificationLmsUrl("CALC") ?? "https://wialportal.org/"}`,
      "For level-specific guidance, see `/certification#lms`.",
    ].join("\n\n");
  }

  if (trackKey) {
    const track = certification.tracks.find((entry) => entry.key === trackKey);
    const docs = getTrackDocuments(trackKey);
    const renewal = certification.recertification.find((entry) => entry.track === trackKey);

    if (!track || !renewal) {
      return "I couldn’t load that certification track right now. Try the public hub at `/certification` or contact `info@wial.org`.";
    }

    if (
      normalized.includes("renew") ||
      normalized.includes("recert") ||
      normalized.includes("expire")
    ) {
      return [
        `${track.level} is valid for ${renewal.validity}.`,
        `Current renewal requirements: ${renewal.annualRequirements.join(" ")}`,
        docs.recertification
          ? `Renewal packet: ${docs.recertification.href}`
          : "Renewal details are in the current certification packet.",
        renewal.expiredPolicy?.length
          ? `Expired credential policy: ${renewal.expiredPolicy.join(" ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    if (
      normalized.includes("apply") ||
      normalized.includes("application") ||
      normalized.includes("form") ||
      normalized.includes("requirements")
    ) {
      return [
        `${track.level} overview: ${track.summary}`,
        `Eligibility: ${track.eligibility.join(" ")}`,
        `Application expectations: ${track.requirements.join(" ")}`,
        docs.application ? `Application form: ${docs.application.href}` : "",
        docs.requirements ? `Requirements packet: ${docs.requirements.href}` : "",
        `More detail: /certification#${track.anchor}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    return [
      `${track.level}: ${track.summary}`,
      `Next step: ${track.progressionLabel}`,
      docs.requirements ? `Requirements packet: ${docs.requirements.href}` : "",
      docs.application ? `Application form: ${docs.application.href}` : "",
      `Certification hub section: /certification#${track.anchor}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (normalized.includes("credly") || normalized.includes("badge")) {
    return [
      "WIAL uses public Credly badge links on coach profiles.",
      "When a coach adds a public Credly badge URL, the platform tries to pull the public badge image for directory display and falls back to the Credly link if the image cannot be resolved.",
      "You can review badge-related guidance from the certification hub at `/certification`.",
    ].join("\n\n");
  }

  if (normalized.includes("resource") || normalized.includes("library")) {
    return [
      "The public resources page is at `/resources`.",
      "It currently highlights verified WIAL-hosted materials, including brochures, articles, and case studies.",
    ].join("\n\n");
  }

  return [
    "I can help with CALC, PALC, SALC, MALC, recertification, application forms, LMS links, Credly badges, and general WIAL certification questions.",
    "Start with `/certification` for the full hub, or ask something specific like “How do I renew PALC?” or “Where is the CALC application form?”",
    "If you need direct help, contact `info@wial.org`.",
  ].join("\n\n");
}

