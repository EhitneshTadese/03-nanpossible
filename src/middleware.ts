import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantCandidate, shouldBypassTenantRewrite } from "@/lib/routing";

const STATIC_FILE_PATTERN = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "wial.org";
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";
  const tenantCandidate = getTenantCandidate(hostname, siteDomain);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-wial-host", hostname);

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    shouldBypassTenantRewrite(pathname) ||
    pathname.startsWith("/sites") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    STATIC_FILE_PATTERN.test(pathname)
  ) {
    if (tenantCandidate) {
      requestHeaders.set("x-wial-tenant", tenantCandidate);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  if (!tenantCandidate) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  requestHeaders.set("x-wial-tenant", tenantCandidate);

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/sites/${tenantCandidate}${pathname}`;

  return NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
