import type { Metadata } from "next";
import "./globals.css";
import { getAccessibilityBootScript } from "@/lib/accessibility-preferences";

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
  return (
    <html
      lang="en"
      className="h-full bg-background antialiased text-scale-default contrast-default line-height-default"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: getAccessibilityBootScript(),
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
