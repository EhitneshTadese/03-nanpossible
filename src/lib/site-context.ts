import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { getTenantCandidate } from "@/lib/routing";
import { getChapterBySubdomain } from "@/lib/tenant";
import type { SiteContext } from "@/lib/types";

function normalizeHost(host: string | null) {
  return host?.split(":")[0].toLowerCase() ?? "localhost";
}

export async function getLayoutSiteContext(
  headerStore: Pick<ReadonlyHeaders, "get">,
): Promise<SiteContext> {
  const host = normalizeHost(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
  );
  const hintedTenant = headerStore.get("x-wial-tenant");
  const tenantCandidate =
    hintedTenant ??
    getTenantCandidate(host, process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "wial.org");

  if (!tenantCandidate) {
    return { isGlobal: true, tenant: null, host };
  }

  const tenant = await getChapterBySubdomain(tenantCandidate);

  if (!tenant) {
    return { isGlobal: true, tenant: null, host };
  }

  return { isGlobal: false, tenant, host };
}

export async function getGlobalSiteContext(): Promise<SiteContext> {
  return {
    isGlobal: true,
    tenant: null,
    host: process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "wial.org",
  };
}

export async function getTenantSiteContext(subdomain: string) {
  const tenant = await getChapterBySubdomain(subdomain);

  if (!tenant) {
    return null;
  }

  return {
    isGlobal: false,
    tenant,
    host: `${tenant.subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "wial.org"}`,
  } satisfies SiteContext;
}
