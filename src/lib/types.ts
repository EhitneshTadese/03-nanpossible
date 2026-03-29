export type CanonicalPageSlug =
  | "home"
  | "about"
  | "certification"
  | "clients"
  | "contact";

export type AppRole =
  | "platform_admin"
  | "chapter_admin"
  | "content_creator"
  | "coach"
  | "public_visitor";

export type CertificationLevel = "CALC" | "PALC" | "SALC" | "MALC";

export type CertificationTrackKey = "calc" | "palc" | "salc" | "malc";

export type CertificationDocumentKind =
  | "requirements"
  | "application"
  | "recertification"
  | "sample"
  | "faq";

export type CertificationDocument = {
  id: string;
  track: CertificationTrackKey | "global";
  kind: CertificationDocumentKind;
  label: string;
  href: string;
  sourceUrl: string | null;
  mirrored: boolean;
  fileType: "pdf" | "doc" | "external";
  updatedLabel: string;
};

export type CertificationTrack = {
  key: CertificationTrackKey;
  level: CertificationLevel;
  anchor: string;
  title: string;
  tagline: string;
  summary: string;
  eligibility: string[];
  requirements: string[];
  progressionLabel: string;
  lmsSummary: string;
};

export type CertificationRecertificationRule = {
  track: CertificationTrackKey;
  validity: string;
  annualRequirements: string[];
  expiredPolicy?: string[];
};

export type LmsLinkConfig = {
  globalUrl: string | null;
  levelUrls: Partial<Record<CertificationTrackKey, string>>;
};

export type NavigationItem = {
  href: string;
  label: string;
};

export type AccountNavItem = {
  href: string;
  label: string;
  roles: AppRole[];
};

export type AccountRoleConfig = {
  defaultHref: string;
  items: Array<Pick<AccountNavItem, "href" | "label">>;
};

export type AccountNavigationConfig = {
  authMode: "password_login_public_visitor_progression";
  profileFields: string[];
  roles: Record<AppRole, AccountRoleConfig>;
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  chapterId: string | null;
  assignedChapters: string[];
  phone: string | null;
  location: string | null;
  bio: string | null;
  photoUrl: string | null;
};

export type CoachRecord = {
  id: string;
  userId: string | null;
  chapterId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  certLevel: CertificationLevel | null;
  locationCity: string | null;
  locationCountry: string | null;
  locationLat: number | null;
  locationLng: number | null;
  bio: string | null;
  specializations: string[];
  languages: string[];
  website: string | null;
  linkedin: string | null;
  credlyBadgeUrl: string | null;
  credlyBadgeImageUrl?: string | null;
  credlyBadgeTitle?: string | null;
  credlyBadgeSyncedAt?: string | null;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
  lastApprovedAt: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
  similarity?: number;
};

export type CoachFacetOptions = {
  countries: string[];
  languages: string[];
};

export type CoachSearchFilters = {
  certLevel?: CertificationLevel | null;
  country?: string | null;
  city?: string | null;
  language?: string | null;
  specializations?: string[] | null;
};

export type ParsedCoachQuery = {
  cert_level: CertificationLevel | null;
  country: string | null;
  city: string | null;
  specializations: string[] | null;
  language: string | null;
  semantic_query: string;
};

export type CoachSearchMode = "filters" | "semantic" | "hybrid" | "name_fallback";

export type CoachSearchResponse = {
  coaches: CoachRecord[];
  parsedQuery: ParsedCoachQuery | null;
  mode: CoachSearchMode;
  total: number;
  nextOffset: number | null;
};

export type ChapterRecord = {
  id: string;
  name: string;
  subdomain: string;
  region: string | null;
  language: string;
  country: string | null;
  leadUserId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  description: string | null;
  logoUrl: string | null;
  stripeAccountId: string | null;
  config: Record<string, unknown>;
  status: "active" | "draft" | "inactive";
  locale?: string;
  themeJson?: Record<string, string>;
  tagline?: string;
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
      type: "logo_grid";
      title: string;
      items: { name: string; logo: string }[];
    }
  | {
      type: "media_prose";
      title: string;
      image: string;
      imageAlt: string;
      paragraphs: string[];
      caption?: string;
      imagePosition?: "left" | "right";
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
  slug: string;
  title: string;
  isGlobal: boolean;
  language: string;
  sortOrder: number;
  published: boolean;
  aiGenerated: boolean;
  bodyHtml?: string;
  bodyJson?: unknown;
  bodyRichtext: ContentBody;
  seo: SeoRecord;
};

export type ChapterContextValue = {
  id: string;
  subdomain: string;
  name: string;
  language: string;
} | null;

export type EventRecord = {
  id: string;
  chapterId: string;
  title: string;
  startAt: string;
  endAt: string | null;
  location: string | null;
  description: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChapterProvisionInput = {
  name: string;
  subdomain: string;
  region: string;
  country: string;
  language: string;
  leadEmail: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
};

export type GenerationTone = "professional" | "warm" | "academic";

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
