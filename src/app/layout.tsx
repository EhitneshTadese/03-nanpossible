import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getLayoutSiteContext } from "@/lib/site-context";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const siteContext = await getLayoutSiteContext(headerStore);

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSans.variable} h-full bg-background antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-full flex-col">
          <SiteHeader siteContext={siteContext} />
          <main className="flex-1">{children}</main>
          <SiteFooter siteContext={siteContext} />
        </div>
      </body>
    </html>
  );
}
