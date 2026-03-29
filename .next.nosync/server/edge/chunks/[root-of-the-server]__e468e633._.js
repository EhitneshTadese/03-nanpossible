(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__e468e633._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/src/lib/routing.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getTenantCandidate",
    ()=>getTenantCandidate,
    "getTenantCandidateForRequest",
    ()=>getTenantCandidateForRequest,
    "isReservedSubdomain",
    ()=>isReservedSubdomain,
    "isValidSubdomain",
    ()=>isValidSubdomain,
    "navigationItems",
    ()=>navigationItems,
    "normalizeChapterSlug",
    ()=>normalizeChapterSlug,
    "normalizeSegments",
    ()=>normalizeSegments,
    "reservedSubdomains",
    ()=>reservedSubdomains,
    "shouldBypassTenantRewrite",
    ()=>shouldBypassTenantRewrite
]);
const navigationItems = [
    {
        href: "/coaches",
        label: "Find a Coach"
    },
    {
        href: "/about",
        label: "About WIAL"
    },
    {
        href: "/certification",
        label: "Certification"
    },
    {
        href: "/resources",
        label: "Resources & Library"
    },
    {
        href: "/contact",
        label: "Contact"
    }
];
const aliasMap = new Map([
    [
        "about-wial",
        "/about"
    ],
    [
        "contact-us",
        "/contact"
    ],
    [
        "library",
        "/resources"
    ]
]);
const canonicalMap = new Map([
    [
        "",
        "home"
    ],
    [
        "about",
        "about"
    ],
    [
        "certification",
        "certification"
    ],
    [
        "resources",
        "resources"
    ],
    [
        "contact",
        "contact"
    ]
]);
const reservedSubdomains = new Set([
    "www",
    "api",
    "admin",
    "app",
    "mail",
    "staging",
    "dev",
    "test"
]);
function normalizeSegments(segments) {
    const joined = (segments ?? []).join("/").toLowerCase();
    if (aliasMap.has(joined)) {
        return {
            slug: null,
            redirectTo: aliasMap.get(joined)
        };
    }
    if (!canonicalMap.has(joined)) {
        return null;
    }
    return {
        slug: canonicalMap.get(joined),
        redirectTo: null
    };
}
function normalizeChapterSlug(segment) {
    const normalized = segment?.trim().toLowerCase() ?? "";
    if (!normalized) {
        return {
            slug: "home",
            redirectTo: null
        };
    }
    if (aliasMap.has(normalized)) {
        return {
            slug: null,
            redirectTo: aliasMap.get(normalized)
        };
    }
    return {
        slug: normalized,
        redirectTo: null
    };
}
function getTenantCandidate(hostname, siteDomain = "wial.org") {
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
function getTenantCandidateForRequest(options) {
    const hostCandidate = getTenantCandidate(options.hostname, options.siteDomain);
    if (hostCandidate) {
        return hostCandidate;
    }
    const host = options.hostname.split(":")[0].toLowerCase();
    if ((host === "localhost" || host === "127.0.0.1") && options.searchChapter?.trim()) {
        return options.searchChapter.trim().toLowerCase();
    }
    return null;
}
function isValidSubdomain(value) {
    return /^[a-z0-9-]{2,30}$/.test(value);
}
function isReservedSubdomain(value) {
    return reservedSubdomains.has(value);
}
function shouldBypassTenantRewrite(pathname) {
    return pathname === "/login" || pathname === "/register" || pathname === "/auth" || pathname.startsWith("/auth/") || pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/account" || pathname.startsWith("/account/");
}
}),
"[project]/src/content/chapters.json (json)", ((__turbopack_context__) => {

__turbopack_context__.v(JSON.parse("[{\"id\":\"11111111-1111-4111-8111-111111111111\",\"name\":\"WIAL Global\",\"subdomain\":\"global\",\"locale\":\"en\",\"status\":\"active\",\"contactEmail\":\"info@wial.org\",\"themeJson\":{\"accent\":\"#c8642f\",\"surface\":\"#fffaf2\",\"tone\":\"global\"},\"tagline\":\"The shared standard for Action Learning chapters worldwide.\"},{\"id\":\"22222222-2222-4222-8222-222222222222\",\"name\":\"WIAL USA\",\"subdomain\":\"usa\",\"locale\":\"en-US\",\"status\":\"active\",\"contactEmail\":\"usa@wial.org\",\"themeJson\":{\"accent\":\"#205c59\",\"surface\":\"#fffaf2\",\"tone\":\"chapter\"},\"tagline\":\"A seeded chapter record used to exercise tenant routing before DNS cutover.\"}]"));}),
"[project]/src/lib/supabase-admin.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createServiceRoleSupabaseClient",
    ()=>createServiceRoleSupabaseClient,
    "hasSupabaseServiceRoleConfig",
    ()=>hasSupabaseServiceRoleConfig
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [middleware-edge] (ecmascript) <locals>");
;
function hasSupabaseServiceRoleConfig() {
    return Boolean(("TURBOPACK compile-time value", "https://rwrwrtrbyrgvnvedvbsm.supabase.co") && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function createServiceRoleSupabaseClient() {
    const url = ("TURBOPACK compile-time value", "https://rwrwrtrbyrgvnvedvbsm.supabase.co");
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
        return null;
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        global: {
            fetch: (input, init)=>fetch(input, {
                    ...init,
                    signal: AbortSignal.timeout(8000)
                })
        }
    });
}
}),
"[project]/src/lib/supabase.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createSupabaseContentClient",
    ()=>createSupabaseContentClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [middleware-edge] (ecmascript) <locals>");
;
function createSupabaseContentClient(options = {}) {
    const url = ("TURBOPACK compile-time value", "https://rwrwrtrbyrgvnvedvbsm.supabase.co");
    const anonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3cndydHJieXJndm52ZWR2YnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzI3NzEsImV4cCI6MjA5MDMwODc3MX0.Fja_5F6IA3-0UD-0mkY9xVt1w3mDn6XGzVYp6RPSL4M") ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const headers = options.tenantSubdomain ? {
        "x-wial-tenant": options.tenantSubdomain
    } : undefined;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(url, anonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        },
        global: {
            headers,
            fetch: (input, init)=>fetch(input, {
                    ...init,
                    signal: AbortSignal.timeout(5000)
                })
        }
    });
}
}),
"[project]/src/lib/tenant.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getChapterById",
    ()=>getChapterById,
    "getChapterBySubdomain",
    ()=>getChapterBySubdomain,
    "listChapters",
    ()=>listChapters
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$content$2f$chapters$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/src/content/chapters.json (json)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2d$admin$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase-admin.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [middleware-edge] (ecmascript)");
;
;
;
const chapterFixtures = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$content$2f$chapters$2e$json__$28$json$29$__["default"];
function mapChapterRow(row) {
    return {
        id: row.id,
        name: row.name,
        subdomain: row.subdomain,
        region: row.region,
        language: row.language ?? row.locale ?? "en",
        country: row.country,
        leadUserId: row.lead_user_id,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        description: row.description ?? row.tagline ?? null,
        logoUrl: row.logo_url,
        stripeAccountId: row.stripe_account_id,
        config: row.config ?? row.theme_json ?? {},
        status: row.status,
        locale: row.locale ?? row.language ?? "en",
        themeJson: row.theme_json ?? undefined,
        tagline: row.tagline ?? row.description ?? undefined
    };
}
function mapFixture(record) {
    return {
        id: String(record.id),
        name: String(record.name),
        subdomain: String(record.subdomain),
        region: typeof record.region === "string" ? record.region : null,
        language: typeof record.language === "string" ? record.language : typeof record.locale === "string" ? record.locale : "en",
        country: typeof record.country === "string" ? record.country : null,
        leadUserId: typeof record.leadUserId === "string" ? record.leadUserId : null,
        contactEmail: typeof record.contactEmail === "string" ? record.contactEmail : typeof record.contact_email === "string" ? record.contact_email : null,
        contactPhone: typeof record.contactPhone === "string" ? record.contactPhone : typeof record.contact_phone === "string" ? record.contact_phone : null,
        description: typeof record.description === "string" ? record.description : typeof record.tagline === "string" ? record.tagline : null,
        logoUrl: typeof record.logoUrl === "string" ? record.logoUrl : typeof record.logo_url === "string" ? record.logo_url : null,
        stripeAccountId: typeof record.stripeAccountId === "string" ? record.stripeAccountId : typeof record.stripe_account_id === "string" ? record.stripe_account_id : null,
        config: (typeof record.config === "object" && record.config !== null ? record.config : typeof record.themeJson === "object" && record.themeJson !== null ? record.themeJson : typeof record.theme_json === "object" && record.theme_json !== null ? record.theme_json : {}) ?? {},
        status: record.status === "active" || record.status === "draft" || record.status === "inactive" ? record.status : "draft",
        locale: typeof record.locale === "string" ? record.locale : undefined,
        themeJson: typeof record.themeJson === "object" && record.themeJson !== null ? record.themeJson : undefined,
        tagline: typeof record.tagline === "string" ? record.tagline : undefined
    };
}
const publicChapterColumns = [
    "id",
    "name",
    "subdomain",
    "locale",
    "status",
    "contact_email",
    "theme_json",
    "tagline"
].join(", ");
async function getChapterBySubdomain(subdomain) {
    const client = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createSupabaseContentClient"])({
        tenantSubdomain: subdomain
    });
    if (client) {
        try {
            const { data } = await client.from("chapters").select(publicChapterColumns).eq("subdomain", subdomain).eq("status", "active").maybeSingle();
            if (data) {
                return mapChapterRow(data);
            }
        } catch  {
        // fall through to fixtures
        }
    }
    const fallback = chapterFixtures.find((chapter)=>chapter.subdomain === subdomain && chapter.status === "active");
    return fallback ? mapFixture(fallback) : null;
}
async function getChapterById(id) {
    const client = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createSupabaseContentClient"])();
    if (client) {
        try {
            const { data } = await client.from("chapters").select(publicChapterColumns).eq("id", id).maybeSingle();
            if (data) {
                return mapChapterRow(data);
            }
        } catch  {
        // fall through to fixtures
        }
    }
    const fallback = chapterFixtures.find((chapter)=>chapter.id === id);
    return fallback ? mapFixture(fallback) : null;
}
async function listChapters() {
    const client = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2d$admin$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServiceRoleSupabaseClient"])();
    if (client) {
        const { data } = await client.from("chapters").select(publicChapterColumns).order("name", {
            ascending: true
        });
        if (data) {
            return data.map(mapChapterRow);
        }
    }
    return chapterFixtures.map(mapFixture).sort((left, right)=>left.name.localeCompare(right.name));
}
}),
"[project]/src/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$routing$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/routing.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$tenant$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/tenant.ts [middleware-edge] (ecmascript)");
;
;
;
;
const STATIC_FILE_PATTERN = /\.(.*)$/;
const CHAPTER_CACHE_TTL_MS = 60_000;
const PROTECTED_PATH_PATTERN = /^\/(admin|dashboard)(\/|$)/;
const chapterCache = new Map();
async function getCachedChapter(subdomain) {
    const cached = chapterCache.get(subdomain);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }
    const chapter = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$tenant$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getChapterBySubdomain"])(subdomain);
    chapterCache.set(subdomain, {
        expiresAt: Date.now() + CHAPTER_CACHE_TTL_MS,
        value: chapter
    });
    return chapter;
}
function createUnauthorizedRedirect(request) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(redirectUrl);
}
async function hasAuthenticatedSession(request) {
    const url = ("TURBOPACK compile-time value", "https://rwrwrtrbyrgvnvedvbsm.supabase.co");
    const anonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3cndydHJieXJndm52ZWR2YnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzI3NzEsImV4cCI6MjA5MDMwODc3MX0.Fja_5F6IA3-0UD-0mkY9xVt1w3mDn6XGzVYp6RPSL4M") ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServerClient"])(url, anonKey, {
        cookies: {
            getAll () {
                return request.cookies.getAll();
            },
            setAll (cookiesToSet) {
                for (const { name, value, options } of cookiesToSet){
                    response.cookies.set(name, value, options);
                }
            }
        }
    });
    const { data: { user } } = await supabase.auth.getUser();
    return {
        user,
        response
    };
}
function applySupabaseCookies(target, source) {
    if (!source) {
        return target;
    }
    for (const cookie of source.cookies.getAll()){
        target.cookies.set(cookie);
    }
    return target;
}
async function middleware(request) {
    const siteDomain = ("TURBOPACK compile-time value", "localhost:3000") ?? "wial.org";
    const { pathname } = request.nextUrl;
    const hostname = request.headers.get("host") ?? "";
    const tenantCandidate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$routing$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getTenantCandidateForRequest"])({
        hostname,
        siteDomain,
        searchChapter: request.nextUrl.searchParams.get("chapter")
    });
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-wial-host", hostname);
    const chapter = tenantCandidate ? await getCachedChapter(tenantCandidate) : null;
    if (tenantCandidate && !chapter) {
        const notFoundUrl = request.nextUrl.clone();
        notFoundUrl.pathname = "/_not-found";
        notFoundUrl.search = "";
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].rewrite(notFoundUrl, {
            status: 404
        });
    }
    if (chapter) {
        requestHeaders.set("x-wial-tenant", chapter.subdomain);
        requestHeaders.set("x-chapter-id", chapter.id);
        requestHeaders.set("x-chapter-subdomain", chapter.subdomain);
        requestHeaders.set("x-chapter-name", chapter.name);
        requestHeaders.set("x-chapter-language", chapter.language);
    }
    const authResult = PROTECTED_PATH_PATTERN.test(pathname) ? await hasAuthenticatedSession(request) : null;
    if (PROTECTED_PATH_PATTERN.test(pathname) && (!authResult || !authResult.user)) {
        return createUnauthorizedRedirect(request);
    }
    if (pathname.startsWith("/_next") || pathname.startsWith("/api") || (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$routing$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["shouldBypassTenantRewrite"])(pathname) || pathname.startsWith("/sites") || pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml" || STATIC_FILE_PATTERN.test(pathname)) {
        return applySupabaseCookies(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
            request: {
                headers: requestHeaders
            }
        }), authResult?.response);
    }
    if (!chapter) {
        return applySupabaseCookies(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
            request: {
                headers: requestHeaders
            }
        }), authResult?.response);
    }
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/sites/${chapter.subdomain}${pathname}`;
    return applySupabaseCookies(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].rewrite(rewriteUrl, {
        request: {
            headers: requestHeaders
        }
    }), authResult?.response);
}
const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__e468e633._.js.map