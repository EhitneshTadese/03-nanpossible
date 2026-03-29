import sanitizeHtml from "sanitize-html";
import { NextResponse } from "next/server";
import { canEditChapter, getCurrentUser } from "@/lib/auth";
import { chatCompletionDetailed } from "@/lib/openrouter";
import { listApprovedCoaches } from "@/lib/coaches";
import { listUpcomingEvents } from "@/lib/events";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { getChapterById } from "@/lib/tenant";
import type { GenerationTone } from "@/lib/types";

const GENERATION_LIMIT = 10;
const GENERATION_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_CONTENT_MODEL = "anthropic/claude-sonnet-4-20250514";
const generationRateLimit = new Map<string, number[]>();

function enforceGenerationRateLimit(chapterId: string) {
  const now = Date.now();
  const current = generationRateLimit.get(chapterId) ?? [];
  const recent = current.filter((timestamp) => timestamp > now - GENERATION_WINDOW_MS);

  if (recent.length >= GENERATION_LIMIT) {
    throw new Error("rate-limit");
  }

  recent.push(now);
  generationRateLimit.set(chapterId, recent);
}

function buildPrompt(options: {
  chapterName: string;
  chapterCountry: string | null;
  chapterDescription: string | null;
  language: string;
  pageSlug: string;
  pageTitle: string;
  tone: GenerationTone;
  customContext: string;
  testimonials: string;
  coaches: Awaited<ReturnType<typeof listApprovedCoaches>>;
  events: Awaited<ReturnType<typeof listUpcomingEvents>>;
}) {
  const sharedContext = [
    `Chapter: ${options.chapterName}`,
    options.chapterCountry ? `Country: ${options.chapterCountry}` : "",
    options.chapterDescription ? `Description: ${options.chapterDescription}` : "",
    options.customContext ? `Additional context: ${options.customContext}` : "",
    options.testimonials ? `Testimonials: ${options.testimonials}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const coachLines = options.coaches
    .map(
      (coach) =>
        `- ${coach.name}, ${coach.certLevel ?? "Pending"} | ${coach.specializations.join(", ")} | ${coach.bio ?? ""}`,
    )
    .join("\n");
  const eventLines = options.events
    .map(
      (event) =>
        `- ${event.title} on ${new Date(event.startAt).toLocaleDateString("en-US")} at ${event.location ?? "TBA"} | ${event.description ?? ""}`,
    )
    .join("\n");

  const system = `You are a content writer for WIAL, the World Institute for Action Learning.
Write in ${options.language}. Make the copy culturally natural, not a literal translation.
Use a ${options.tone} tone.
Output clean HTML using only <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <blockquote>.
Do not emit <h1>, <div>, <span>, <style>, or <script>.
Only reference facts present in the prompt. If data is missing, skip the section.
Each section should be concise but complete for a chapter website draft.`;

  let user = `${sharedContext}\n\nPage title: ${options.pageTitle}\nPage slug: ${options.pageSlug}\n`;

  switch (options.pageSlug) {
    case "about":
      user += `Write an About page for ${options.chapterName}. Include what WIAL is in 1-2 sentences, what this chapter does in ${options.chapterCountry ?? "its region"}, and how visitors can get involved.`;
      break;
    case "team":
      user += `Write a Team page with a short intro and a section for each coach.\nCoaches:\n${coachLines || "- No approved coaches provided."}`;
      break;
    case "events":
      user += `Write an Events page for the chapter.\nUpcoming events:\n${eventLines || "- No upcoming events provided. Describe the types of events the chapter hosts and invite visitors to check back."}`;
      break;
    case "resources":
      user += "Write a Resources page that explains what visitors can expect from this chapter's learning materials, downloads, and knowledge-sharing activities.";
      break;
    case "testimonials":
      user += `Write a Testimonials page using only the provided testimonials.\n${options.testimonials || "No testimonials were provided. Write a short invitation asking partners to share outcomes and stories."}`;
      break;
    case "contact":
      user += "Write a Contact page that invites visitors to connect with the chapter team for programs, certification, and partnership inquiries.";
      break;
    default:
      user += `Write a ${options.pageTitle} page for ${options.chapterName} using the available chapter context.`;
      break;
  }

  return { system, user };
}

export async function POST(request: Request) {
  const viewer = await getCurrentUser();

  if (!viewer) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!["platform_admin", "chapter_admin"].includes(viewer.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return NextResponse.json({ error: "missing-config" }, { status: 500 });
  }

  const body = (await request.json()) as {
    chapter_id?: string;
    page_slug?: string;
    page_title?: string;
    language?: string;
    include_coaches?: boolean;
    include_events?: boolean;
    testimonials?: string;
    custom_context?: string;
    tone?: GenerationTone;
  };
  const chapterId = String(body.chapter_id ?? "");
  const pageSlug = String(body.page_slug ?? "");

  if (!chapterId || !pageSlug) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  if (!canEditChapter(viewer, chapterId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    enforceGenerationRateLimit(chapterId);
  } catch {
    return NextResponse.json({ error: "rate-limit" }, { status: 429 });
  }

  const chapter = await getChapterById(chapterId);

  if (!chapter) {
    return NextResponse.json({ error: "chapter-not-found" }, { status: 404 });
  }

  const [coaches, events, page] = await Promise.all([
    body.include_coaches ? listApprovedCoaches({ chapterId, limit: 8 }) : Promise.resolve([]),
    body.include_events ? listUpcomingEvents(chapterId, { limit: 10 }) : Promise.resolve([]),
    client
      .from("content_pages")
      .select("id, title")
      .eq("chapter_id", chapterId)
      .eq("slug", pageSlug)
      .maybeSingle(),
  ]);

  if (!page.data) {
    return NextResponse.json({ error: "page-not-found" }, { status: 404 });
  }

  const prompt = buildPrompt({
    chapterName: chapter.name,
    chapterCountry: chapter.country,
    chapterDescription: chapter.description,
    language: body.language ?? chapter.language ?? "en",
    pageSlug,
    pageTitle: typeof page.data.title === "string" ? page.data.title : String(body.page_title ?? pageSlug),
    tone: body.tone ?? "professional",
    customContext: String(body.custom_context ?? ""),
    testimonials: String(body.testimonials ?? ""),
    coaches,
    events,
  });

  const result = await chatCompletionDetailed({
    model:
      process.env.OPENROUTER_CONTENT_MODEL?.trim() || DEFAULT_CONTENT_MODEL,
    messages: [
      {
        role: "system",
        content: prompt.system,
      },
      {
        role: "user",
        content: prompt.user,
      },
    ],
    maxTokens: 2000,
    temperature: 0.7,
    timeoutMs: 15_000,
  });

  const clean = sanitizeHtml(result.content, {
    allowedTags: ["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "blockquote"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
  });

  await client
    .from("content_pages")
    .update({
      body_html: clean,
      body_richtext: null,
      published: false,
    })
    .eq("chapter_id", chapterId)
    .eq("slug", pageSlug);



  return NextResponse.json({
    html: clean,
    tokens_used: result.usage.totalTokens,
    model: result.model,
  });
}
