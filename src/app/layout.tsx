import type { Metadata } from "next";
import "./globals.css";
import { headers } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteChatbot } from "@/components/site-chatbot";
import { getCurrentViewer } from "@/lib/auth";
import { getLayoutSiteContext } from "@/lib/site-context";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "WIAL | World Institute for Action Learning",
    template: "%s | WIAL",
  },
  description:
    "A multi-tenant WIAL platform built with Next.js, Supabase, Vercel, and Dolt-backed migration tracking.",
  icons: {
    icon: [
      { url: "/assets/logo.webp", sizes: "16x16", type: "image/webp" },
      { url: "/assets/logo.webp", sizes: "32x32", type: "image/webp" },
      { url: "/assets/logo.webp", sizes: "48x48", type: "image/webp" },
    ],
    apple: [
      { url: "/assets/logo.webp", sizes: "180x180", type: "image/webp" },
    ],
  },
};

export default async function RootLayout({
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
    <html
      lang="en"
      className="h-full bg-background antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-full flex-col">
          <SiteHeader siteContext={siteContext} viewer={viewer} />
          <main className="flex-1">{children}</main>
          <SiteFooter siteContext={siteContext} />
          <SiteChatbot />
        </div>
      </body>
    </html>
  );
}
