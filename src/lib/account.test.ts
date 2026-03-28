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
    expect(getDefaultAccountHref("platform_admin")).toBe("/account/dashboard");
    expect(getDefaultAccountHref("chapter_admin")).toBe("/account/content");
    expect(getDefaultAccountHref("coach")).toBe("/account/certifications");
  });

  it("returns role-specific menu items", () => {
    expect(getAccountNavItems("platform_admin").map((item) => item.label)).toEqual([
      "Dashboard",
      "Chapters and Chapter Heads",
      "Update account details",
    ]);
    expect(getAccountNavItems("chapter_admin").map((item) => item.label)).toEqual([
      "Change website content",
      "Coaches",
      "Chapter revenue dashboard",
      "Update account details",
    ]);
    expect(getAccountNavItems("coach").map((item) => item.label)).toEqual([
      "Certification courses",
      "Payment dues",
      "Update account details",
    ]);
  });

  it("shares profile access across all signed-in roles", () => {
    expect(getAllowedRolesForAccountRoute("/account/profile")).toEqual([
      "platform_admin",
      "chapter_admin",
      "coach",
    ]);
    expect(isAccountRouteAccessible("coach", "/account/profile")).toBe(true);
    expect(isAccountRouteAccessible("coach", "/account/dashboard")).toBe(false);
  });
});

describe("account helpers", () => {
  it("exposes the configured auth mode", () => {
    expect(getAccountAuthMode()).toBe("password_login_public_registration");
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
