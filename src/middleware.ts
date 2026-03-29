import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getTenantCandidateForRequest,
  shouldBypassTenantRewrite,
} from "@/lib/routing";
import { getChapterBySubdomain } from "@/lib/tenant";

const STATIC_FILE_PATTERN = /\.(.*)$/;
const CHAPTER_CACHE_TTL_MS = 60_000;
const PROTECTED_PATH_PATTERN = /^\/(admin|dashboard)(\/|$)/;

type CachedChapter = {
  expiresAt: number;
  value: Awaited<ReturnType<typeof getChapterBySubdomain>>;
};

const chapterCache = new Map<string, CachedChapter>();

async function getCachedChapter(subdomain: string) {
  const cached = chapterCache.get(subdomain);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const chapter = await getChapterBySubdomain(subdomain);
  chapterCache.set(subdomain, {
    expiresAt: Date.now() + CHAPTER_CACHE_TTL_MS,
    value: chapter,
  });

  return chapter;
}

function createUnauthorizedRedirect(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(redirectUrl);
}

async function hasAuthenticatedSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const response = NextResponse.next();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, response };
}

function applySupabaseCookies(
  target: NextResponse,
  source?: NextResponse | null,
) {
  if (!source) {
    return target;
  }

  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  return target;
}

export async function middleware(request: NextRequest) {
  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "wial.org";
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";
  const tenantCandidate = getTenantCandidateForRequest({
    hostname,
    siteDomain,
    searchChapter: request.nextUrl.searchParams.get("chapter"),
  });
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-wial-host", hostname);

  const chapter = tenantCandidate
    ? await getCachedChapter(tenantCandidate)
    : null;

  if (tenantCandidate && !chapter) {
    const notFoundUrl = request.nextUrl.clone();
    notFoundUrl.pathname = "/_not-found";
    notFoundUrl.search = "";
    return NextResponse.rewrite(notFoundUrl, { status: 404 });
  }

  if (chapter) {
    requestHeaders.set("x-wial-tenant", chapter.subdomain);
    requestHeaders.set("x-chapter-id", chapter.id);
    requestHeaders.set("x-chapter-subdomain", chapter.subdomain);
    requestHeaders.set("x-chapter-name", chapter.name);
    requestHeaders.set("x-chapter-language", chapter.language);
  }

  const authResult = PROTECTED_PATH_PATTERN.test(pathname)
    ? await hasAuthenticatedSession(request)
    : null;

  if (PROTECTED_PATH_PATTERN.test(pathname) && (!authResult || !authResult.user)) {
      return createUnauthorizedRedirect(request);
  }

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
    return applySupabaseCookies(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }),
      authResult?.response,
    );
  }

  if (!chapter) {
    return applySupabaseCookies(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }),
      authResult?.response,
    );
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/sites/${chapter.subdomain}${pathname}`;

  return applySupabaseCookies(
    NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    }),
    authResult?.response,
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
