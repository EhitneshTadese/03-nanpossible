import { SiteChromeFrame } from "@/components/site-chrome-frame";
import { getCurrentViewer } from "@/lib/auth";
import { getGlobalSiteContext } from "@/lib/site-context";

export default async function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [siteContext, viewer] = await Promise.all([
    getGlobalSiteContext(),
    getCurrentViewer(),
  ]);

  return (
    <SiteChromeFrame siteContext={siteContext} viewer={viewer}>
      {children}
    </SiteChromeFrame>
  );
}
