import type { CanonicalPageSlug, NavigationItem } from "@/lib/types";

export const navigationItems: NavigationItem[] = [
  { href: "/about", label: "About WIAL" },
  { href: "/certification", label: "Certification" },
  { href: "/resources", label: "Resources & Library" },
  { href: "/contact", label: "Contact" },
];

const aliasMap = new Map<string, string>([
  ["about-wial", "/about"],
  ["contact-us", "/contact"],
  ["library", "/resources"],
]);

const canonicalMap = new Map<string, CanonicalPageSlug>([
  ["", "home"],
  ["about", "about"],
  ["certification", "certification"],
  ["resources", "resources"],
  ["contact", "contact"],
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

export function shouldBypassTenantRewrite(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/")
  );
}
