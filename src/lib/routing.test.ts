import { describe, expect, it } from "vitest";
import {
  getTenantCandidate,
  normalizeSegments,
  shouldBypassTenantRewrite,
} from "./routing";

describe("normalizeSegments", () => {
  it("maps empty segments to the home slug", () => {
    expect(normalizeSegments(undefined)).toEqual({
      slug: "home",
      redirectTo: null,
    });
  });

  it("redirects legacy aliases to canonical routes", () => {
    expect(normalizeSegments(["about-wial"])).toEqual({
      slug: null,
      redirectTo: "/about",
    });
    expect(normalizeSegments(["contact-us"])).toEqual({
      slug: null,
      redirectTo: "/contact",
    });
    expect(normalizeSegments(["library"])).toEqual({
      slug: null,
      redirectTo: "/resources",
    });
  });

  it("rejects unsupported paths", () => {
    expect(normalizeSegments(["blog"])).toBeNull();
  });
});

describe("getTenantCandidate", () => {
  it("treats apex and www as global", () => {
    expect(getTenantCandidate("wial.org")).toBeNull();
    expect(getTenantCandidate("www.wial.org")).toBeNull();
  });

  it("detects tenant hosts for production and local development", () => {
    expect(getTenantCandidate("usa.wial.org")).toBe("usa");
    expect(getTenantCandidate("usa.localhost:3000")).toBe("usa");
    expect(getTenantCandidate("usa.lvh.me:3000")).toBe("usa");
  });
});

describe("shouldBypassTenantRewrite", () => {
  it("keeps auth and account routes on their public paths", () => {
    expect(shouldBypassTenantRewrite("/login")).toBe(true);
    expect(shouldBypassTenantRewrite("/register")).toBe(true);
    expect(shouldBypassTenantRewrite("/auth/callback")).toBe(true);
    expect(shouldBypassTenantRewrite("/account/profile")).toBe(true);
    expect(shouldBypassTenantRewrite("/dashboard/profile")).toBe(true);
    expect(shouldBypassTenantRewrite("/admin/approvals")).toBe(true);
    expect(shouldBypassTenantRewrite("/resources")).toBe(false);
  });
});
