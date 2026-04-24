import { headers } from "next/headers";
import { AccountSidebar } from "@/components/account-sidebar";
import { SiteChromeFrame } from "@/components/site-chrome-frame";
import { getCurrentViewer, requireAccountViewer } from "@/lib/auth";
import { getAccountNavItems, getRoleLabel } from "@/lib/account";
import { getLayoutSiteContext } from "@/lib/site-context";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAccountViewer("/admin", [
    "platform_admin",
    "chapter_admin",
    "content_creator",
  ]);
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return children;
  }

  const headerStore = await headers();
  const siteContext = await getLayoutSiteContext(headerStore);
  const platformLabel = siteContext.isGlobal
    ? "Global WIAL"
    : siteContext.tenant.name;

  return (
    <SiteChromeFrame siteContext={siteContext} viewer={viewer}>
      <div className="page-frame">
        <div className="site-shell">
          <div className="account-grid">
            <AccountSidebar
              items={getAccountNavItems(viewer.role)}
              platformLabel={platformLabel}
              role={viewer.role}
              roleLabel={getRoleLabel(viewer.role)}
            />
            <div className="account-stage">{children}</div>
          </div>
        </div>
      </div>
    </SiteChromeFrame>
  );
}
