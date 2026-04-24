import { headers } from "next/headers";
import { SiteChromeFrame } from "@/components/site-chrome-frame";
import { getCurrentViewer } from "@/lib/auth";
import { getLayoutSiteContext } from "@/lib/site-context";

export default async function RegisterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const [siteContext, viewer] = await Promise.all([
    getLayoutSiteContext(headerStore),
    getCurrentViewer(),
  ]);

  return (
    <SiteChromeFrame siteContext={siteContext} viewer={viewer}>
      {children}
    </SiteChromeFrame>
  );
}
