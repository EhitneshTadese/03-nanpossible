import accountNavigationSource from "@/content/account-navigation.json";
import type {
  AccountNavItem,
  AccountNavigationConfig,
  AppRole,
} from "@/lib/types";

const accountNavigation =
  accountNavigationSource as AccountNavigationConfig;

export const appRoles: AppRole[] = [
  "platform_admin",
  "chapter_admin",
  "coach",
];

const routeRoles = new Map<string, AccountNavItem>();

for (const role of appRoles) {
  for (const item of accountNavigation.roles[role].items) {
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
      roles: [role],
    });
  }
}

export function getAccountNavItems(role: AppRole) {
  return accountNavigation.roles[role].items.map((item) => ({
    href: item.href,
    label: item.label,
    roles: getAllowedRolesForAccountRoute(item.href),
  }));
}

export function getAllowedRolesForAccountRoute(href: string) {
  return routeRoles.get(href)?.roles ?? [];
}

export function isAccountRouteAccessible(role: AppRole, href: string) {
  return getAllowedRolesForAccountRoute(href).includes(role);
}

export function getDefaultAccountHref(role: AppRole) {
  return accountNavigation.roles[role].defaultHref;
}

export function getRoleLabel(role: AppRole) {
  switch (role) {
    case "platform_admin":
      return "Admin";
    case "chapter_admin":
      return "Chapter Head";
    case "coach":
      return "Coach";
  }
}

export function sanitizeNextPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

export function getAccountAuthMode() {
  return accountNavigation.authMode;
}

export function getProfileFieldSet() {
  return [...accountNavigation.profileFields];
}
