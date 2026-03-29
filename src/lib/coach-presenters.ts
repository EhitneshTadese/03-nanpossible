import type { CertificationLevel, CoachRecord } from "@/lib/types";

export function getCoachInitials(name: string) {
  const words = name.trim().split(/\s+/).slice(0, 2);

  return words.map((word) => word.slice(0, 1).toUpperCase()).join("") || "W";
}

export function formatCoachLocation(
  coach: Pick<CoachRecord, "locationCity" | "locationCountry">,
) {
  return [coach.locationCity, coach.locationCountry].filter(Boolean).join(", ");
}

export function getCertificationBadgeTone(level: CertificationLevel | null) {
  switch (level) {
    case "CALC":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "PALC":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "SALC":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "MALC":
      return "bg-violet-100 text-violet-700 border-violet-200";
    default:
      return "bg-stone-100 text-stone-700 border-stone-200";
  }
}
