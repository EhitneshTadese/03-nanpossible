module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/content/account-navigation.json (json)", ((__turbopack_context__) => {

__turbopack_context__.v(JSON.parse("{\"authMode\":\"password_login_public_visitor_progression\",\"profileFields\":[\"name\",\"email\",\"phone\",\"location\",\"bio\",\"photo_url\"],\"roles\":{\"public_visitor\":{\"defaultHref\":\"/account/register-coach\",\"items\":[{\"href\":\"/account/register-coach\",\"label\":\"Register as coach\"},{\"href\":\"/account/profile\",\"label\":\"Update account details\"}]},\"platform_admin\":{\"defaultHref\":\"/admin/global\",\"items\":[{\"href\":\"/admin/global\",\"label\":\"Global admin\"},{\"href\":\"/admin/global/chapters\",\"label\":\"Chapters\"},{\"href\":\"/admin/approvals\",\"label\":\"Coach approvals\"},{\"href\":\"/account/profile\",\"label\":\"Update account details\"}]},\"chapter_admin\":{\"defaultHref\":\"/admin/chapter\",\"items\":[{\"href\":\"/admin/chapter\",\"label\":\"Change website content\"},{\"href\":\"/admin/chapter/coaches\",\"label\":\"Coach approvals\"},{\"href\":\"/admin/chapter/events\",\"label\":\"Events\"},{\"href\":\"/admin/chapter/settings\",\"label\":\"Chapter settings\"},{\"href\":\"/account/revenue\",\"label\":\"Chapter revenue dashboard\"},{\"href\":\"/account/profile\",\"label\":\"Update account details\"}]},\"content_creator\":{\"defaultHref\":\"/admin/chapter\",\"items\":[{\"href\":\"/admin/chapter\",\"label\":\"Change website content\"},{\"href\":\"/admin/chapter/events\",\"label\":\"Events\"},{\"href\":\"/account/profile\",\"label\":\"Update account details\"}]},\"coach\":{\"defaultHref\":\"/dashboard/profile\",\"items\":[{\"href\":\"/dashboard/profile\",\"label\":\"Coach directory profile\"},{\"href\":\"/account/certifications\",\"label\":\"Certification courses\"},{\"href\":\"/account/dues\",\"label\":\"Payment dues\"},{\"href\":\"/account/register-chapter-head\",\"label\":\"Register as chapter head\"},{\"href\":\"/account/profile\",\"label\":\"Update account details\"}]}}}"));}),
"[project]/src/lib/account.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "appRoles",
    ()=>appRoles,
    "getAccountAuthMode",
    ()=>getAccountAuthMode,
    "getAccountNavItems",
    ()=>getAccountNavItems,
    "getAllowedRolesForAccountRoute",
    ()=>getAllowedRolesForAccountRoute,
    "getDefaultAccountHref",
    ()=>getDefaultAccountHref,
    "getProfileFieldSet",
    ()=>getProfileFieldSet,
    "getRoleLabel",
    ()=>getRoleLabel,
    "isAccountRouteAccessible",
    ()=>isAccountRouteAccessible,
    "sanitizeNextPath",
    ()=>sanitizeNextPath
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$content$2f$account$2d$navigation$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/src/content/account-navigation.json (json)");
;
const accountNavigation = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$content$2f$account$2d$navigation$2e$json__$28$json$29$__["default"];
const appRoles = [
    "public_visitor",
    "platform_admin",
    "chapter_admin",
    "content_creator",
    "coach"
];
const routeRoles = new Map();
for (const role of appRoles){
    for (const item of accountNavigation.roles[role].items){
        const existing = routeRoles.get(item.href);
        if (existing) {
            if (!existing.roles.includes(role)) {
                existing.roles.push(role);
            }
            continue;
        }
        routeRoles.set(item.href, {
            href: item.href,
            label: item.label,
            roles: [
                role
            ]
        });
    }
}
function getAccountNavItems(role) {
    return accountNavigation.roles[role].items.map((item)=>({
            href: item.href,
            label: item.label,
            roles: getAllowedRolesForAccountRoute(item.href)
        }));
}
function getAllowedRolesForAccountRoute(href) {
    return routeRoles.get(href)?.roles ?? [];
}
function isAccountRouteAccessible(role, href) {
    return getAllowedRolesForAccountRoute(href).includes(role);
}
function getDefaultAccountHref(role) {
    return accountNavigation.roles[role].defaultHref;
}
function getRoleLabel(role) {
    switch(role){
        case "public_visitor":
            return "Public Visitor";
        case "platform_admin":
            return "Admin";
        case "chapter_admin":
            return "Chapter Head";
        case "content_creator":
            return "Content Creator";
        case "coach":
            return "Coach";
    }
}
function sanitizeNextPath(value) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
        return null;
    }
    return value;
}
function getAccountAuthMode() {
    return accountNavigation.authMode;
}
function getProfileFieldSet() {
    return [
        ...accountNavigation.profileFields
    ];
}
}),
"[project]/src/components/mobile-nav.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MobileNav",
    ()=>MobileNav
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-dom.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$account$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/account.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
function CloseIcon() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        fill: "none",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M6 6 18 18M18 6 6 18",
            stroke: "currentColor",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: "1.8"
        }, void 0, false, {
            fileName: "[project]/src/components/mobile-nav.tsx",
            lineNumber: 22,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/mobile-nav.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
function DrawerLink({ href, label, onClick }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
        className: "account-sidebar-link",
        href: href,
        onClick: onClick,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "account-sidebar-icon",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "block h-2.5 w-2.5 rounded-full bg-white/70"
                }, void 0, false, {
                    fileName: "[project]/src/components/mobile-nav.tsx",
                    lineNumber: 45,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/mobile-nav.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "truncate",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/mobile-nav.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/mobile-nav.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, this);
}
function MobileNav({ items, chapterLabel, accountLink, viewer }) {
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const canPortal = "undefined" !== "undefined";
    const workspaceItems = viewer ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$account$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAccountNavItems"])(viewer.role) : [];
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) {
            return;
        }
        //TURBOPACK unreachable
        ;
        const previousOverflow = undefined;
    }, [
        canPortal,
        open
    ]);
    const drawer = ("TURBOPACK compile-time falsy", 0) ? /*#__PURE__*/ "TURBOPACK unreachable" : null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                "aria-expanded": open,
                "aria-label": "Toggle navigation",
                className: "inline-flex h-11 items-center justify-center rounded-full border border-line bg-white/70 px-4 text-sm font-semibold text-teal-deep",
                onClick: ()=>setOpen(true),
                type: "button",
                children: "Menu"
            }, void 0, false, {
                fileName: "[project]/src/components/mobile-nav.tsx",
                lineNumber: 208,
                columnNumber: 7
            }, this),
            drawer
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/mobile-nav.tsx",
        lineNumber: 207,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e1dd307b._.js.map