import { revalidatePath } from "next/cache";
import { isReservedSubdomain, isValidSubdomain } from "@/lib/routing";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import type { AppRole, ChapterProvisionInput } from "@/lib/types";

export const defaultChapterPages = [
  { slug: "about", title: "About", sortOrder: 10 },
  { slug: "team", title: "Our Team", sortOrder: 20 },
  { slug: "events", title: "Events", sortOrder: 30 },
  { slug: "resources", title: "Resources", sortOrder: 40 },
  { slug: "testimonials", title: "Testimonials", sortOrder: 50 },
  { slug: "contact", title: "Contact", sortOrder: 60 },
] as const;

const languageMap = new Map<string, string>([
  ["english", "en"],
  ["spanish", "es"],
  ["portuguese", "pt"],
  ["french", "fr"],
]);

type ProvisionResult =
  | {
      ok: true;
      chapterId: string;
      url: string;
      warning: string | null;
    }
  | {
      ok: false;
      error:
        | "missing-config"
        | "invalid-name"
        | "invalid-subdomain"
        | "reserved-subdomain"
        | "duplicate-subdomain"
        | "invalid-email"
        | "lead-invite-failed"
        | "chapter-create-failed"
        | "default-pages-failed"
        | "lead-sync-failed";
      message: string;
    };

type UserAccessInput = {
  userId: string;
  email: string;
  role: AppRole;
  chapterId: string | null;
  assignedChapters?: string[];
  name?: string | null;
};

function mapLanguageLabelToCode(value: string) {
  return languageMap.get(value.trim().toLowerCase()) ?? "en";
}

function normalizeSubdomain(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function buildContactHtml(contactEmail: string, contactPhone: string) {
  const lines = [
    contactEmail ? `<p>Email: ${contactEmail}</p>` : "",
    contactPhone ? `<p>Phone: ${contactPhone}</p>` : "",
  ].filter(Boolean);

  return lines.join("");
}

function buildDefaultPages(
  chapterId: string,
  chapterName: string,
  contactEmail: string,
  contactPhone: string,
  language: string,
) {
  return defaultChapterPages.map((page) => ({
    chapter_id: chapterId,
    slug: page.slug,
    title: page.slug === "about" ? `About ${chapterName}` : page.title,
    body_html:
      page.slug === "contact" ? buildContactHtml(contactEmail, contactPhone) : "",
    body_json: null,
    body_richtext: {},
    is_global: false,
    language,
    sort_order: page.sortOrder,
    published: false,
    ai_generated: false,
    seo: {},
  }));
}

async function sendWelcomeEmail(email: string, chapterName: string, subdomain: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { warning: "welcome-email-skipped" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "WIAL <noreply@wial.org>",
      to: [email],
      subject: `Your ${chapterName} site is ready`,
      text: `Your chapter workspace is ready.\n\nPublic URL: https://${subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "wial.org"}\nAdmin URL: https://${subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "wial.org"}/admin/chapter\n`,
    }),
  });

  if (!response.ok) {
    return { warning: "welcome-email-failed" };
  }

  return { warning: null };
}

export async function syncUserAccess(input: UserAccessInput) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    throw new Error("missing-config");
  }

  const assignedChapters = [...new Set(input.assignedChapters ?? [])];
  const { error: upsertError } = await client.from("users").upsert({
    id: input.userId,
    email: input.email,
    role: input.role,
    chapter_id: input.chapterId,
    name: input.name ?? null,
  });

  if (upsertError) {
    throw upsertError;
  }

  const { error: authError } = await client.auth.admin.updateUserById(input.userId, {
    app_metadata: {
      role: input.role,
      chapter_id: input.chapterId,
      assigned_chapters: assignedChapters,
    },
  });

  if (authError) {
    throw authError;
  }
}

export async function assignContentCreatorToChapter(options: {
  email: string;
  chapterId: string;
}) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    throw new Error("missing-config");
  }

  const email = options.email.trim().toLowerCase();
  const { data: user } = await client
    .from("users")
    .select("id, email, role, chapter_id, assigned_chapters, name")
    .ilike("email", email)
    .maybeSingle();

  if (!user) {
    throw new Error("user-not-found");
  }

  const currentAssignments = Array.isArray(user.assigned_chapters)
    ? user.assigned_chapters
    : [];
  const nextAssignments = [...new Set([...currentAssignments, options.chapterId])];
  const role = user.role === "platform_admin" || user.role === "chapter_admin"
    ? user.role
    : "content_creator";

  await syncUserAccess({
    userId: user.id,
    email: user.email,
    name: user.name,
    role,
    chapterId: user.chapter_id,
    assignedChapters: nextAssignments,
  });
}

export async function updateChapterSettings(options: {
  chapterId: string;
  name: string;
  region: string;
  country: string;
  language: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  logoUrl: string;
}) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    throw new Error("missing-config");
  }

  const { error } = await client
    .from("chapters")
    .update({
      name: options.name.trim(),
      region: options.region.trim() || null,
      country: options.country.trim() || null,
      language: mapLanguageLabelToCode(options.language),
      contact_email: options.contactEmail.trim() || null,
      contact_phone: options.contactPhone.trim() || null,
      description: options.description.trim() || null,
      logo_url: options.logoUrl.trim() || null,
    })
    .eq("id", options.chapterId);

  if (error) {
    throw error;
  }
}

export async function provisionChapter(input: ChapterProvisionInput): Promise<ProvisionResult> {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return {
      ok: false,
      error: "missing-config",
      message: "The Supabase service-role configuration is missing.",
    };
  }

  const name = input.name.trim();
  const subdomain = normalizeSubdomain(input.subdomain);
  const leadEmail = input.leadEmail.trim().toLowerCase();
  const contactEmail = input.contactEmail.trim().toLowerCase();
  const contactPhone = input.contactPhone.trim();
  const region = input.region.trim();
  const country = input.country.trim();
  const description = input.description.trim();
  const language = mapLanguageLabelToCode(input.language);

  if (!name) {
    return {
      ok: false,
      error: "invalid-name",
      message: "Chapter name is required.",
    };
  }

  if (!isValidSubdomain(subdomain)) {
    return {
      ok: false,
      error: "invalid-subdomain",
      message: "Use 2-30 lowercase letters, numbers, or hyphens.",
    };
  }

  if (isReservedSubdomain(subdomain)) {
    return {
      ok: false,
      error: "reserved-subdomain",
      message: "That subdomain is reserved.",
    };
  }

  if (!isValidEmail(leadEmail) || !isValidEmail(contactEmail)) {
    return {
      ok: false,
      error: "invalid-email",
      message: "Lead and contact email must both be valid email addresses.",
    };
  }

  const { data: existingChapter } = await client
    .from("chapters")
    .select("id")
    .eq("subdomain", subdomain)
    .maybeSingle();

  if (existingChapter) {
    return {
      ok: false,
      error: "duplicate-subdomain",
      message: "That subdomain is already in use.",
    };
  }

  let leadUserId = "";
  let leadName: string | null = null;
  let leadRole: AppRole = "chapter_admin";
  const { data: existingUser } = await client
    .from("users")
    .select("id, email, name, role, chapter_id, assigned_chapters")
    .ilike("email", leadEmail)
    .maybeSingle();

  if (existingUser) {
    leadUserId = existingUser.id;
    leadName = existingUser.name;
    leadRole = existingUser.role === "platform_admin" ? "platform_admin" : "chapter_admin";
  } else {
    const generatedName = leadEmail.split("@")[0];
    const createResult = await client.auth.admin.createUser({
      email: leadEmail,
      password: "wial2026!",
      email_confirm: true,
      user_metadata: { name: generatedName },
    });

    if (createResult.error) {
      // User exists in auth but not in our users table — look them up
      if (createResult.error.code === "email_exists") {
        const { data: listData } = await client.auth.admin.listUsers();
        const authUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === leadEmail.toLowerCase(),
        );

        if (authUser) {
          leadUserId = authUser.id;
          leadName =
            typeof authUser.user_metadata?.name === "string"
              ? authUser.user_metadata.name
              : generatedName;
        } else {
          return {
            ok: false,
            error: "lead-invite-failed",
            message: "A user with this email exists but could not be resolved.",
          };
        }
      } else {
        console.error("[provision] createUser failed:", createResult.error);
        return {
          ok: false,
          error: "lead-invite-failed",
          message: `Could not create chapter lead: ${createResult.error.message}`,
        };
      }
    } else if (createResult.data.user) {
      leadUserId = createResult.data.user.id;
      leadName =
        typeof createResult.data.user.user_metadata?.name === "string"
          ? createResult.data.user.user_metadata.name
          : generatedName;
    }
  }

  const { data: chapter, error: chapterError } = await client
    .from("chapters")
    .insert({
      name,
      subdomain,
      region: region || null,
      language,
      country: country || null,
      lead_user_id: leadUserId,
      locale: language,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      description: description || null,
      tagline: description || "",
      config: {},
      status: "active",
    })
    .select("id")
    .single();

  if (chapterError || !chapter) {
    console.error("[provision] chapter insert failed:", chapterError);
    return {
      ok: false,
      error: "chapter-create-failed",
      message: `Could not create chapter record: ${chapterError?.message ?? "unknown error"}`,
    };
  }

  const seededPages = buildDefaultPages(
    chapter.id,
    name,
    contactEmail,
    contactPhone,
    language,
  );
  const { error: pagesError } = await client.from("content_pages").insert(seededPages);

  if (pagesError) {
    console.error("[provision] seed pages failed:", pagesError);
    await client.from("chapters").delete().eq("id", chapter.id);
    return {
      ok: false,
      error: "default-pages-failed",
      message: `WIAL could not seed the default chapter pages: ${pagesError.message}`,
    };
  }

  try {
    await syncUserAccess({
      userId: leadUserId,
      email: leadEmail,
      name: leadName,
      role: leadRole,
      chapterId: chapter.id,
      assignedChapters: [],
    });
  } catch (err) {
    console.error("[provision] user sync failed:", err);
    return {
      ok: false,
      error: "lead-sync-failed",
      message: "The chapter was created, but WIAL could not sync the lead user role.",
    };
  }

  revalidatePath("/");

  const emailResult = await sendWelcomeEmail(leadEmail, name, subdomain);

  return {
    ok: true,
    chapterId: chapter.id,
    url: `${process.env.NEXT_PUBLIC_SITE_DOMAIN?.includes("localhost") ? "http" : "https"}://${subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "wial.org"}`,
    warning: emailResult.warning,
  };
}
