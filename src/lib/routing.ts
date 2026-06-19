import type { CanonicalPageSlug, NavigationItem } from "@/lib/types";

export const navigationItems: NavigationItem[] = [
  { href: "/about", label: "About WIAL" },
  { href: "/coaches", label: "Find a Coach" },  
  { href: "/certification", label: "Certification" },
  { href: "/clients", label: "Our Clients" },
  { href: "/contact", label: "Contact" },
];

const aliasMap = new Map<string, string>([
  ["about-wial", "/about"],
  ["contact-us", "/contact"],
  ["library", "/clients"],
]);

const canonicalMap = new Map<string, CanonicalPageSlug>([
  ["", "home"],
  ["about", "about"],
  ["certification", "certification"],
  ["clients", "clients"],
  ["contact", "contact"],
]);

export const reservedSubdomains = new Set([
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "staging",
  "dev",
  "test",
]);

export function normalizeSegments(segments?: string[]) {
  const joined = (segments ?? []).join("/").toLowerCase();

  if (aliasMap.has(joined)) {
    return {
      slug: null,
      redirectTo: aliasMap.get(joined) as string,
    };
  }

  if (!canonicalMap.has(joined)) {
    return null;
  }

  return {
    slug: canonicalMap.get(joined) as CanonicalPageSlug,
    redirectTo: null,
  };
}

export function normalizeChapterSlug(segment?: string | null) {
  const normalized = segment?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return {
      slug: "home",
      redirectTo: null,
    };
  }

  if (aliasMap.has(normalized)) {
    return {
      slug: null,
      redirectTo: aliasMap.get(normalized) as string,
    };
  }

  return {
    slug: normalized,
    redirectTo: null,
  };
}

export function getTenantCandidate(hostname: string, siteDomain = "wial.org") {
  const host = hostname.split(":")[0].toLowerCase();

  if (!host || host === "localhost" || host === "127.0.0.1") {
    return null;
  }

  if (host.endsWith(".localhost")) {
    return host.replace(".localhost", "");
  }

  if (host.endsWith(".lvh.me")) {
    return host.replace(".lvh.me", "");
  }

  if (host === siteDomain || host === `www.${siteDomain}`) {
    return null;
  }

  if (host.endsWith(`.${siteDomain}`)) {
    return host.replace(`.${siteDomain}`, "");
  }

  return null;
}

export function getTenantCandidateForRequest(options: {
  hostname: string;
  siteDomain?: string;
  searchChapter?: string | null;
}) {
  const hostCandidate = getTenantCandidate(options.hostname, options.siteDomain);

  if (hostCandidate) {
    return hostCandidate;
  }

  const host = options.hostname.split(":")[0].toLowerCase();

  if (
    (host === "localhost" || host === "127.0.0.1") &&
    options.searchChapter?.trim()
  ) {
    return options.searchChapter.trim().toLowerCase();
  }

  return null;
}

export function isValidSubdomain(value: string) {
  return /^[a-z0-9-]{2,30}$/.test(value);
}

export function isReservedSubdomain(value: string) {
  return reservedSubdomains.has(value);
}

export function shouldBypassTenantRewrite(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/reset-password" ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/")
  );
}
