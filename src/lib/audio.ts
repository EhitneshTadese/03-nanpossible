import { getCertificationHubContent } from "@/lib/certification";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import type { CoachRecord, ContentPageRecord } from "@/lib/types";

const AUDIO_BUCKET = "audio";
const DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2";
const MP3_OUTPUT_FORMAT = "mp3_44100_128";
const PAGE_AUDIO_MAX_CHARS = 5000;
const COACH_AUDIO_MAX_CHARS = 950;

type ContentPageAudioRow = {
  id: string;
  chapter_id: string | null;
  slug: string;
  title: string;
  body_html: string;
  language: string | null;
};

type CoachAudioRow = {
  id: string;
  name: string;
  cert_level: string | null;
  bio: string | null;
  languages: string[] | null;
  audio_intro_url: string | null;
  audio_intro_source: "ai" | "uploaded" | null;
};

type VoiceSelection = {
  voiceId: string | null;
  languageCode: string | null;
};

type StoredAudioResult = {
  audioUrl: string;
  durationSeconds: number;
  objectPath: string;
};

type AudioPreviewResult = {
  audioUrl: string | null;
  durationSeconds: number | null;
};

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function normalizeWhitespace(value: string) {
  return value
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export function htmlToNarrationText(html: string) {
  const blockAware = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|header|footer|aside|blockquote|h1|h2|h3|h4|h5|h6)\s*>/gi, "\n\n")
    .replace(/<(ul|ol)\b[^>]*>/gi, "\n")
    .replace(/<\/(ul|ol)\s*>/gi, "\n\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<[^>]+>/g, " ");

  return normalizeWhitespace(decodeHtmlEntities(blockAware));
}

export function truncateNarrationText(text: string, maxChars: number) {
  const normalized = normalizeWhitespace(text);

  if (normalized.length <= maxChars) {
    return normalized;
  }

  const sliced = normalized.slice(0, maxChars).trimEnd();
  const sentenceBreak = Math.max(
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf("! "),
    sliced.lastIndexOf("? "),
    sliced.lastIndexOf("\n\n"),
  );

  if (sentenceBreak > maxChars * 0.55) {
    return sliced.slice(0, sentenceBreak + 1).trim();
  }

  const wordBreak = sliced.lastIndexOf(" ");
  return (wordBreak > 0 ? sliced.slice(0, wordBreak) : sliced).trim();
}

export function estimateMp3DurationSeconds(byteLength: number) {
  return Math.max(1, Math.round((byteLength * 8) / 128000));
}

function normalizeLanguageTag(language: string | null | undefined) {
  const normalized = language?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("pt")) {
    return "pt";
  }

  if (normalized.startsWith("es")) {
    return "es";
  }

  if (normalized.startsWith("fr")) {
    return "fr";
  }

  if (normalized.startsWith("en")) {
    return "en";
  }

  return normalized;
}

function resolveVoiceSelection(language: string | null | undefined): VoiceSelection {
  const normalized = normalizeLanguageTag(language);
  const fallback =
    process.env.ELEVENLABS_VOICE_EN?.trim() ||
    process.env.ELEVENLABS_VOICE_PT_BR?.trim() ||
    process.env.ELEVENLABS_VOICE_ES_419?.trim() ||
    process.env.ELEVENLABS_VOICE_FR?.trim() ||
    null;

  switch (normalized) {
    case "pt":
      return {
        voiceId: process.env.ELEVENLABS_VOICE_PT_BR?.trim() || fallback,
        languageCode: "pt",
      };
    case "es":
      return {
        voiceId: process.env.ELEVENLABS_VOICE_ES_419?.trim() || fallback,
        languageCode: "es",
      };
    case "fr":
      return {
        voiceId: process.env.ELEVENLABS_VOICE_FR?.trim() || fallback,
        languageCode: "fr",
      };
    case "en":
      return {
        voiceId: process.env.ELEVENLABS_VOICE_EN?.trim() || fallback,
        languageCode: "en",
      };
    default:
      return {
        voiceId: fallback,
        languageCode: null,
      };
  }
}

function getStoragePathFromPublicUrl(publicUrl: string | null | undefined) {
  if (!publicUrl) {
    return null;
  }

  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${AUDIO_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

async function getStoredAudioPublicUrl(objectPath: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return null;
  }

  const separator = objectPath.lastIndexOf("/");
  const directory = separator >= 0 ? objectPath.slice(0, separator) : "";
  const fileName = separator >= 0 ? objectPath.slice(separator + 1) : objectPath;

  const { data, error } = await client.storage.from(AUDIO_BUCKET).list(directory, {
    search: fileName,
    limit: 100,
  });

  if (error) {
    return null;
  }

  const exists = (data ?? []).some((item) => item.name === fileName);

  if (!exists) {
    return null;
  }

  return client.storage.from(AUDIO_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

async function removeAudioObject(path: string | null | undefined) {
  const client = createServiceRoleSupabaseClient();

  if (!client || !path) {
    return;
  }

  await client.storage.from(AUDIO_BUCKET).remove([path]);
}

async function uploadAudioBytes(
  objectPath: string,
  bytes: Uint8Array,
  options: {
    contentType?: string;
    deleteExistingPaths?: Array<string | null | undefined>;
    upsert?: boolean;
  } = {},
): Promise<StoredAudioResult> {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    throw new Error("missing-supabase-service-role");
  }

  if (options.deleteExistingPaths?.length) {
    await Promise.all(options.deleteExistingPaths.map((path) => removeAudioObject(path)));
  }

  const { error } = await client.storage.from(AUDIO_BUCKET).upload(objectPath, bytes, {
    contentType: options.contentType ?? "audio/mpeg",
    cacheControl: "3600",
    upsert: options.upsert ?? true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    audioUrl: client.storage.from(AUDIO_BUCKET).getPublicUrl(objectPath).data.publicUrl,
    durationSeconds: estimateMp3DurationSeconds(bytes.byteLength),
    objectPath,
  };
}

async function synthesizeSpeech(text: string, language: string | null | undefined) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const selection = resolveVoiceSelection(language);

  if (!apiKey || !selection.voiceId) {
    throw new Error("missing-elevenlabs-config");
  }

  const url = new URL(
    `https://api.elevenlabs.io/v1/text-to-speech/${selection.voiceId}`,
  );
  url.searchParams.set("output_format", MP3_OUTPUT_FORMAT);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
      Accept: "audio/mpeg",
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL?.trim() || DEFAULT_ELEVENLABS_MODEL,
      ...(selection.languageCode ? { language_code: selection.languageCode } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`elevenlabs-tts-failed:${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function hasAudioGenerationConfig() {
  return Boolean(
    process.env.ELEVENLABS_API_KEY?.trim() &&
      (
        process.env.ELEVENLABS_VOICE_EN?.trim() ||
        process.env.ELEVENLABS_VOICE_PT_BR?.trim() ||
        process.env.ELEVENLABS_VOICE_ES_419?.trim() ||
        process.env.ELEVENLABS_VOICE_FR?.trim()
      ),
  );
}

function getCertificationNarrationText() {
  const content = getCertificationHubContent();
  const parts = [
    `${content.hero.title} ${content.hero.intro}`,
    "Progression path.",
    ...content.progression.map((step) => `${step.title}. ${step.body}`),
    ...content.tracks.flatMap((track) => [
      `${track.level}. ${track.title}. ${track.summary}`,
      `Eligibility. ${track.eligibility.join(" ")}`,
      `Requirements. ${track.requirements.join(" ")}`,
      `Progression note. ${track.progressionLabel}`,
      `LMS. ${track.lmsSummary}`,
    ]),
    "Recertification requirements.",
    ...content.recertification.map(
      (rule) =>
        `${rule.track.toUpperCase()} renewal is valid for ${rule.validity}. ${rule.annualRequirements.join(" ")} ${rule.expiredPolicy?.join(" ") ?? ""}`,
    ),
    "Forms and downloads are available on the certification page.",
    "WIAL keeps the current LMS and the website links to it rather than duplicating course content.",
  ];

  return truncateNarrationText(parts.join("\n\n"), PAGE_AUDIO_MAX_CHARS);
}

function getContentPageNarrationText(
  page: Pick<ContentPageRecord, "slug" | "title" | "bodyHtml" | "bodyRichtext">,
) {
  if (page.slug === "certification") {
    return getCertificationNarrationText();
  }

  if (page.bodyHtml?.trim()) {
    return truncateNarrationText(htmlToNarrationText(page.bodyHtml), PAGE_AUDIO_MAX_CHARS);
  }

  const sections = page.bodyRichtext.sections.flatMap((section) => {
    switch (section.type) {
      case "prose":
        return [
          section.title,
          ...section.paragraphs,
          ...(section.bullets ?? []),
        ];
      case "feature_grid":
      case "timeline":
      case "resource_list":
      case "contact_cards":
        return [
          section.title,
          ...section.items.flatMap((item) => [
            item.title,
            item.body,
          ]),
        ];
      case "quote":
        return [section.quote, section.attribution];
      case "cta":
        return [section.title, section.body, section.label];
      default:
        return [];
    }
  });

  return truncateNarrationText(
    [page.title, page.bodyRichtext.heroIntro, ...sections].filter(Boolean).join("\n\n"),
    PAGE_AUDIO_MAX_CHARS,
  );
}

function getCoachIntroNarrationText(
  coach: {
    name: string;
    certLevel: string | null;
    bio: string | null;
  },
) {
  if (!coach.bio?.trim()) {
    return "";
  }

  return truncateNarrationText(
    `${coach.name}. ${coach.certLevel ?? "WIAL"} certified Action Learning coach. ${coach.bio}`,
    COACH_AUDIO_MAX_CHARS,
  );
}

async function fetchContentPageForAudio(pageId: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return null;
  }

  const { data } = await client
    .from("content_pages")
    .select("id, chapter_id, slug, title, body_html, language, audio_url")
    .eq("id", pageId)
    .maybeSingle();

  return data as
    | (ContentPageAudioRow & {
        audio_url?: string | null;
      })
    | null;
}

export async function generateContentPageAudioById(pageId: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    throw new Error("missing-supabase-service-role");
  }

  const page = await fetchContentPageForAudio(pageId);

  if (!page) {
    throw new Error("page-not-found");
  }

  const narrationText =
    page.chapter_id === null && page.slug === "certification"
      ? getCertificationNarrationText()
      : truncateNarrationText(htmlToNarrationText(page.body_html ?? ""), PAGE_AUDIO_MAX_CHARS);

  if (!narrationText) {
    await client
      .from("content_pages")
      .update({
        audio_url: null,
        audio_duration_seconds: null,
        audio_generated_at: null,
      })
      .eq("id", pageId);

    return {
      audioUrl: null,
      durationSeconds: null,
    };
  }

  const bytes = await synthesizeSpeech(narrationText, page.language);
  const objectPath =
    page.chapter_id === null
      ? `pages/global/${page.slug}.mp3`
      : `pages/${page.chapter_id}/${page.slug}.mp3`;
  const stored = await uploadAudioBytes(objectPath, bytes, {
    contentType: "audio/mpeg",
    deleteExistingPaths: [getStoragePathFromPublicUrl(page.audio_url)],
    upsert: true,
  });

  const generatedAt = new Date().toISOString();
  const { error } = await client
    .from("content_pages")
    .update({
      audio_url: stored.audioUrl,
      audio_duration_seconds: stored.durationSeconds,
      audio_generated_at: generatedAt,
    })
    .eq("id", pageId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    audioUrl: stored.audioUrl,
    durationSeconds: stored.durationSeconds,
    generatedAt,
  };
}

export async function ensureContentPageAudio(
  page: Pick<
    ContentPageRecord,
    | "id"
    | "audioUrl"
    | "audioDurationSeconds"
    | "chapterId"
    | "slug"
    | "language"
    | "title"
    | "bodyHtml"
    | "bodyRichtext"
  > | null,
) {
  if (!page) {
    return {
      audioUrl: null,
      durationSeconds: null,
    };
  }

  if (page.audioUrl) {
    return {
      audioUrl: page.audioUrl,
      durationSeconds: page.audioDurationSeconds ?? null,
    };
  }

  if (!hasAudioGenerationConfig()) {
    return {
      audioUrl: null,
      durationSeconds: null,
    };
  }

  try {
    const result = await generateContentPageAudioById(page.id);

    return {
      audioUrl: result.audioUrl,
      durationSeconds: result.durationSeconds,
    };
  } catch {
    return ensureStandalonePageAudio({
      objectKey:
        page.chapterId == null
          ? `pages/global/${page.slug}.mp3`
          : `pages/${page.chapterId}/${page.slug}.mp3`,
      language: page.language,
      text: getContentPageNarrationText(page),
    });
  }
}

export async function ensureStandalonePageAudio(options: {
  objectKey: string;
  language: string;
  text: string;
}) {
  const narrationText = truncateNarrationText(options.text, PAGE_AUDIO_MAX_CHARS);

  if (!narrationText || !hasAudioGenerationConfig()) {
    return {
      audioUrl: null,
      durationSeconds: null,
    };
  }

  const existingAudioUrl = await getStoredAudioPublicUrl(options.objectKey);

  if (existingAudioUrl) {
    return {
      audioUrl: existingAudioUrl,
      durationSeconds: null,
    };
  }

  try {
    const bytes = await synthesizeSpeech(narrationText, options.language);
    const stored = await uploadAudioBytes(options.objectKey, bytes, {
      contentType: "audio/mpeg",
      upsert: true,
    });

    return {
      audioUrl: stored.audioUrl,
      durationSeconds: stored.durationSeconds,
    };
  } catch {
    return {
      audioUrl: null,
      durationSeconds: null,
    };
  }
}

export async function generateDraftPageAudioPreview(options: {
  chapterId: string;
  pageSlug: string;
  language: string;
  html: string;
}) : Promise<AudioPreviewResult> {
  const narrationText = truncateNarrationText(
    htmlToNarrationText(options.html),
    PAGE_AUDIO_MAX_CHARS,
  );

  if (!narrationText) {
    return {
      audioUrl: null,
      durationSeconds: null,
    };
  }

  const bytes = await synthesizeSpeech(narrationText, options.language);
  const stored = await uploadAudioBytes(
    `previews/pages/${options.chapterId}/${options.pageSlug}.mp3`,
    bytes,
    {
      contentType: "audio/mpeg",
      upsert: true,
    },
  );

  return {
    audioUrl: stored.audioUrl,
    durationSeconds: stored.durationSeconds,
  };
}

async function fetchCoachForAudio(coachId: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return null;
  }

  const { data } = await client
    .from("coaches")
    .select("id, name, cert_level, bio, languages, audio_intro_url, audio_intro_source")
    .eq("id", coachId)
    .maybeSingle();

  return data as CoachAudioRow | null;
}

export async function generateCoachAudioIntroById(coachId: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    throw new Error("missing-supabase-service-role");
  }

  const coach = await fetchCoachForAudio(coachId);

  if (!coach) {
    throw new Error("coach-not-found");
  }

  if (coach.audio_intro_source === "uploaded" && coach.audio_intro_url) {
    return {
      audioUrl: coach.audio_intro_url,
      source: coach.audio_intro_source,
    };
  }

  const bioText = coach.bio?.trim() ?? "";

  if (!bioText) {
    await client
      .from("coaches")
      .update({
        audio_intro_url: null,
        audio_intro_source: null,
      })
      .eq("id", coachId);

    return {
      audioUrl: null,
      source: null,
    };
  }

  const introText = getCoachIntroNarrationText({
    name: coach.name,
    certLevel: coach.cert_level,
    bio: bioText,
  });
  const bytes = await synthesizeSpeech(introText, coach.languages?.[0] ?? "en");
  const stored = await uploadAudioBytes(`coaches/${coachId}_intro.mp3`, bytes, {
    contentType: "audio/mpeg",
    deleteExistingPaths: [getStoragePathFromPublicUrl(coach.audio_intro_url)],
    upsert: true,
  });

  const { error } = await client
    .from("coaches")
    .update({
      audio_intro_url: stored.audioUrl,
      audio_intro_source: "ai",
    })
    .eq("id", coachId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    audioUrl: stored.audioUrl,
    source: "ai" as const,
    durationSeconds: stored.durationSeconds,
  };
}

export async function ensureCoachAudioIntro(
  coach: Pick<
    CoachRecord,
    "id" | "name" | "certLevel" | "bio" | "languages" | "audioIntroUrl"
  >,
) {
  if (coach.audioIntroUrl) {
    return {
      audioUrl: coach.audioIntroUrl,
      durationSeconds: null,
    };
  }

  if (!hasAudioGenerationConfig() || !coach.bio?.trim()) {
    return {
      audioUrl: null,
      durationSeconds: null,
    };
  }

  try {
    const generated = await generateCoachAudioIntroById(coach.id);

    return {
      audioUrl: generated.audioUrl,
      durationSeconds: generated.durationSeconds ?? null,
    };
  } catch {
    const narrationText = getCoachIntroNarrationText(coach);

    return ensureStandalonePageAudio({
      objectKey: `coaches/${coach.id}_intro.mp3`,
      language: coach.languages[0] ?? "en",
      text: narrationText,
    });
  }
}

export async function uploadCoachAudioIntro(options: {
  coachId: string;
  file: File;
  currentAudioUrl?: string | null;
}) {
  const extension =
    options.file.type === "audio/wav" ||
    options.file.type === "audio/x-wav" ||
    options.file.type === "audio/wave" ||
    options.file.type === "audio/vnd.wave"
      ? "wav"
      : "mp3";
  const bytes = new Uint8Array(await options.file.arrayBuffer());
  const stored = await uploadAudioBytes(
    `coaches/${options.coachId}_intro.${extension}`,
    bytes,
    {
      contentType:
        extension === "wav"
          ? "audio/wav"
          : "audio/mpeg",
      deleteExistingPaths: [getStoragePathFromPublicUrl(options.currentAudioUrl)],
      upsert: true,
    },
  );

  return {
    audioUrl: stored.audioUrl,
    audioIntroSource: "uploaded" as const,
  };
}
