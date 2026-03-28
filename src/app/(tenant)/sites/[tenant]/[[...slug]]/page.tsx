import { notFound, redirect } from "next/navigation";
import { ContentPage } from "@/components/content-page";
import { getContentPage } from "@/lib/content";
import { getTenantSiteContext } from "@/lib/site-context";
import { normalizeSegments } from "@/lib/routing";

type TenantPageProps = {
  params: Promise<{
    tenant: string;
    slug?: string[];
  }>;
};

export default async function TenantPage({ params }: TenantPageProps) {
  const { tenant, slug } = await params;
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

  const siteContext = await getTenantSiteContext(tenant);

  if (!siteContext) {
    notFound();
  }

  const page = await getContentPage({
    slug: route.slug,
    chapterId: siteContext.tenant.id,
    tenantSubdomain: siteContext.tenant.subdomain,
  });

  if (!page) {
    notFound();
  }

  return <ContentPage page={page} siteContext={siteContext} />;
}
