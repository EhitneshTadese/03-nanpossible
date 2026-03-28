export type CanonicalPageSlug =
  | "home"
  | "about"
  | "certification"
  | "resources"
  | "contact";

export type NavigationItem = {
  href: string;
  label: string;
};

export type ChapterRecord = {
  id: string;
  name: string;
  subdomain: string;
  locale: string;
  status: "active" | "draft" | "inactive";
  contactEmail: string;
  themeJson: Record<string, string>;
  tagline: string;
};

export type MetricItem = {
  label: string;
  value: string;
};

export type FeatureItem = {
  eyebrow?: string;
  title: string;
  body: string;
  href?: string;
  label?: string;
  kind?: string;
  year?: string;
};

export type ContentSection =
  | {
      type: "prose";
      title: string;
      paragraphs: string[];
      bullets?: string[];
    }
  | {
      type: "feature_grid";
      title: string;
      items: FeatureItem[];
    }
  | {
      type: "timeline";
      title: string;
      items: FeatureItem[];
    }
  | {
      type: "quote";
      quote: string;
      attribution: string;
    }
  | {
      type: "resource_list";
      title: string;
      description: string;
      items: Required<Pick<FeatureItem, "title" | "body" | "href" | "label" | "kind">>[];
    }
  | {
      type: "contact_cards";
      title: string;
      items: FeatureItem[];
    }
  | {
      type: "cta";
      title: string;
      body: string;
      href: string;
      label: string;
    };

export type ContentBody = {
  heroIntro: string;
  metrics: MetricItem[];
  sections: ContentSection[];
};

export type SeoRecord = {
  description: string;
  sourceUrl: string;
  sourceStatus: string;
  sourceNotes: string;
};

export type ContentPageRecord = {
  id: string;
  chapterId: string | null;
  slug: CanonicalPageSlug;
  title: string;
  published: boolean;
  bodyHtml?: string;
  bodyRichtext: ContentBody;
  seo: SeoRecord;
};

export type SiteContext =
  | {
      isGlobal: true;
      tenant: null;
      host: string;
    }
  | {
      isGlobal: false;
      tenant: ChapterRecord;
      host: string;
    };
