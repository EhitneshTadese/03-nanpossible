import {
  certificationDocuments,
  certificationHero,
  certificationProgression,
  certificationRecertificationRules,
  certificationTracks,
  getCertificationDocumentsForTrack,
} from "@/content/certification-hub";
import type {
  CertificationDocument,
  CertificationLevel,
  CertificationTrack,
  CertificationTrackKey,
  LmsLinkConfig,
} from "@/lib/types";

const DEFAULT_LMS_URL = "https://wialportal.org/";

const levelKeyMap: Record<CertificationLevel, CertificationTrackKey> = {
  CALC: "calc",
  PALC: "palc",
  SALC: "salc",
  MALC: "malc",
};

export function getCertificationHubContent() {
  return {
    hero: certificationHero,
    progression: certificationProgression,
    tracks: certificationTracks,
    recertification: certificationRecertificationRules,
    documents: certificationDocuments,
  };
}

export function getLmsLinkConfig(): LmsLinkConfig {
  const globalUrl = process.env.NEXT_PUBLIC_WIAL_LMS_URL?.trim() || DEFAULT_LMS_URL;

  return {
    globalUrl,
    levelUrls: {
      calc: process.env.NEXT_PUBLIC_WIAL_LMS_CALC_URL?.trim() || globalUrl,
      palc: process.env.NEXT_PUBLIC_WIAL_LMS_PALC_URL?.trim() || globalUrl,
      salc: process.env.NEXT_PUBLIC_WIAL_LMS_SALC_URL?.trim() || globalUrl,
      malc: process.env.NEXT_PUBLIC_WIAL_LMS_MALC_URL?.trim() || globalUrl,
    },
  };
}

export function getCertificationLmsUrl(level: CertificationLevel) {
  const config = getLmsLinkConfig();
  return config.levelUrls[levelKeyMap[level]] ?? config.globalUrl;
}

export function getTrackDocuments(track: CertificationTrackKey) {
  return {
    requirements:
      getCertificationDocumentsForTrack(track, "requirements")[0] ?? null,
    application:
      getCertificationDocumentsForTrack(track, "application")[0] ?? null,
    recertification:
      getCertificationDocumentsForTrack(track, "recertification")[0] ?? null,
    extras: getCertificationDocumentsForTrack(track).filter(
      (document) =>
        document.kind !== "requirements" &&
        document.kind !== "application" &&
        document.kind !== "recertification",
    ),
  };
}

export function getCertificationTrack(track: CertificationTrackKey): CertificationTrack {
  const match = certificationTracks.find((entry) => entry.key === track);

  if (!match) {
    throw new Error(`Unknown certification track: ${track}`);
  }

  return match;
}

export function getGlobalCertificationDocuments() {
  return certificationDocuments.filter((document) => document.track === "global");
}

export function getDocumentTargetProps(document: CertificationDocument) {
  if (document.href.startsWith("/")) {
    return {};
  }

  return {
    rel: "noreferrer",
    target: "_blank",
  };
}

