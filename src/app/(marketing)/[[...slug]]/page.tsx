import { notFound, redirect } from "next/navigation";
import { ContentPage } from "@/components/content-page";
import { getContentPage } from "@/lib/content";
import { getGlobalSiteContext } from "@/lib/site-context";
import { normalizeSegments } from "@/lib/routing";

type MarketingPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default async function MarketingPage({ params }: MarketingPageProps) {
  const { slug } = await params;
  const route = normalizeSegments(slug);

  if (!route) {
    notFound();
  }

  if (route.redirectTo) {
    redirect(route.redirectTo);
  }

  if (!route.slug) {
    notFound();
  }

  const [siteContext, page] = await Promise.all([
    getGlobalSiteContext(),
    getContentPage({ slug: route.slug }),
  ]);

  if (!page) {
    notFound();
  }

  return <ContentPage page={page} siteContext={siteContext} />;
}
