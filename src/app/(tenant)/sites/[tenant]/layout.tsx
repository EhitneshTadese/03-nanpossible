import { notFound } from "next/navigation";
import { ChapterProvider } from "@/components/providers/ChapterProvider";
import { getChapterFromHeaders } from "@/lib/chapter-context";
import { getChapterBySubdomain } from "@/lib/tenant";

export default async function TenantLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}>) {
  const { tenant } = await params;
  const chapterFromHeaders = await getChapterFromHeaders();
  const chapter =
    chapterFromHeaders && chapterFromHeaders.subdomain === tenant
      ? chapterFromHeaders
      : await getChapterBySubdomain(tenant);

  if (!chapter) {
    notFound();
  }

  return (
    <ChapterProvider
      value={{
        id: chapter.id,
        subdomain: chapter.subdomain,
        name: chapter.name,
        language: chapter.language,
      }}
    >
      {children}
    </ChapterProvider>
  );
}
