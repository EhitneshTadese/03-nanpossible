import { SiteChatbot } from "@/components/site-chatbot";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ACCESSIBILITY_MAIN_CONTENT_ID } from "@/lib/accessibility-assistive-tools";
import type { SiteContext, UserProfile } from "@/lib/types";

type SiteChromeFrameProps = {
  children: React.ReactNode;
  siteContext: SiteContext;
  viewer: UserProfile | null;
};

export function SiteChromeFrame({
  children,
  siteContext,
  viewer,
}: Readonly<SiteChromeFrameProps>) {
  return (
    <div className="site-app-shell flex min-h-full flex-col">
      <SiteHeader siteContext={siteContext} viewer={viewer} />
      <main
        className="flex-1"
        data-readable-content="main"
        id={ACCESSIBILITY_MAIN_CONTENT_ID}
      >
        {children}
      </main>
      <SiteFooter siteContext={siteContext} />
      <SiteChatbot />
    </div>
  );
}
