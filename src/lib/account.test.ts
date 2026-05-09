import { describe, expect, it } from "vitest";
import {
  getAccountAuthMode,
  getAccountNavItems,
  getAllowedRolesForAccountRoute,
  getDefaultAccountHref,
  getProfileFieldSet,
  isAccountRouteAccessible,
  sanitizeNextPath,
} from "./account";

describe("account navigation", () => {
  it("maps each role to its default destination", () => {
    expect(getDefaultAccountHref("public_visitor")).toBe("/account/register-coach");
    expect(getDefaultAccountHref("platform_admin")).toBe("/admin/global");
    expect(getDefaultAccountHref("chapter_admin")).toBe("/admin/chapter");
    expect(getDefaultAccountHref("content_creator")).toBe("/admin/chapter");
    expect(getDefaultAccountHref("coach")).toBe("/dashboard/profile");
  });

  it("returns role-specific menu items", () => {
    expect(getAccountNavItems("public_visitor").map((item) => item.label)).toEqual([
      "Register as coach",
      "Update account details",
    ]);
    expect(getAccountNavItems("platform_admin").map((item) => item.label)).toEqual([
      "Global admin",
      "Chapters",
      "Users & roles",
      "Coach approvals",
      "Platform guide",
      "Update account details",
    ]);
    expect(getAccountNavItems("chapter_admin").map((item) => item.label)).toEqual([
      "Change website content",
      "Coach approvals",
      "Events",
      "Chapter settings",
      "Chapter revenue dashboard",
      "Platform guide",
      "Update account details",
    ]);
    expect(getAccountNavItems("content_creator").map((item) => item.label)).toEqual([
      "Change website content",
      "Events",
      "Platform guide",
      "Update account details",
    ]);
    expect(getAccountNavItems("coach").map((item) => item.label)).toEqual([
      "Coach directory profile",
      "Certification courses",
      "Payment dues",
      "Register as chapter head",
      "Update account details",
    ]);
  });

  it("shares profile access across all signed-in roles", () => {
    expect(getAllowedRolesForAccountRoute("/account/profile")).toEqual([
      "public_visitor",
      "platform_admin",
      "chapter_admin",
      "content_creator",
      "coach",
    ]);
    expect(getAllowedRolesForAccountRoute("/dashboard/profile")).toEqual([
      "coach",
    ]);
    expect(getAllowedRolesForAccountRoute("/admin/chapter/coaches")).toEqual([
      "chapter_admin",
    ]);
    expect(getAllowedRolesForAccountRoute("/admin/approvals")).toEqual([
      "platform_admin",
    ]);
    expect(getAllowedRolesForAccountRoute("/admin/global/users")).toEqual([
      "platform_admin",
    ]);
    expect(getAllowedRolesForAccountRoute("/admin/chapter")).toEqual([
      "chapter_admin",
      "content_creator",
    ]);
    expect(isAccountRouteAccessible("public_visitor", "/account/profile")).toBe(true);
    expect(isAccountRouteAccessible("public_visitor", "/account/register-coach")).toBe(true);
    expect(isAccountRouteAccessible("public_visitor", "/account/certifications")).toBe(false);
    expect(isAccountRouteAccessible("coach", "/account/profile")).toBe(true);
    expect(isAccountRouteAccessible("coach", "/account/register-chapter-head")).toBe(true);
    expect(isAccountRouteAccessible("coach", "/dashboard/profile")).toBe(true);
    expect(isAccountRouteAccessible("coach", "/admin/approvals")).toBe(false);
    expect(isAccountRouteAccessible("content_creator", "/admin/chapter")).toBe(true);
    expect(isAccountRouteAccessible("content_creator", "/admin/chapter/coaches")).toBe(false);
  });
});

describe("account helpers", () => {
  it("exposes the configured auth mode", () => {
    expect(getAccountAuthMode()).toBe("password_login_public_visitor_progression");
  });

  it("exposes the configured profile fields", () => {
    expect(getProfileFieldSet()).toEqual([
      "name",
      "email",
      "phone",
      "location",
      "bio",
      "photo_url",
    ]);
  });

  it("sanitizes next paths to local destinations only", () => {
    expect(sanitizeNextPath("/account/profile")).toBe("/account/profile");
    expect(sanitizeNextPath("https://evil.example")).toBeNull();
    expect(sanitizeNextPath("//evil.example")).toBeNull();
    expect(sanitizeNextPath("account/profile")).toBeNull();
  });
});
