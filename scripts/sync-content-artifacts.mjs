import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "src", "content");
const outputDir = path.join(root, "ops", "dolt", "generated");

const chapters = JSON.parse(
  fs.readFileSync(path.join(contentDir, "chapters.json"), "utf8"),
);
const pages = JSON.parse(
  fs.readFileSync(path.join(contentDir, "pages.json"), "utf8"),
);
const assets = JSON.parse(
  fs.readFileSync(path.join(contentDir, "assets.json"), "utf8"),
);
const migrationRuns = JSON.parse(
  fs.readFileSync(path.join(contentDir, "migration-runs.json"), "utf8"),
);

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.join(root, "supabase"), { recursive: true });

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderSection(section) {
  switch (section.type) {
    case "prose":
      return [
        `<section><h2>${escapeHtml(section.title)}</h2>`,
        ...section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
        ...(section.bullets?.length
          ? [
              "<ul>",
              ...section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`),
              "</ul>",
            ]
          : []),
        "</section>",
      ].join("");
    case "feature_grid":
      return [
        `<section><h2>${escapeHtml(section.title)}</h2><div>`,
        ...section.items.map(
          (item) =>
            `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></article>`,
        ),
        "</div></section>",
      ].join("");
    case "timeline":
      return [
        `<section><h2>${escapeHtml(section.title)}</h2><div>`,
        ...section.items.map(
          (item) =>
            `<article><strong>${escapeHtml(item.year ?? "Now")}</strong><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></article>`,
        ),
        "</div></section>",
      ].join("");
    case "quote":
      return `<blockquote><p>${escapeHtml(section.quote)}</p><cite>${escapeHtml(section.attribution)}</cite></blockquote>`;
    case "resource_list":
      return [
        `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.description)}</p><div>`,
        ...section.items.map(
          (item) =>
            `<article><strong>${escapeHtml(item.kind)}</strong><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p><p><a href="${item.href}">${escapeHtml(item.label)}</a></p></article>`,
        ),
        "</div></section>",
      ].join("");
    case "contact_cards":
      return [
        `<section><h2>${escapeHtml(section.title)}</h2><div>`,
        ...section.items.map(
          (item) =>
            `<article><strong>${escapeHtml(item.eyebrow ?? "")}</strong><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body).replaceAll("\n", "<br />")}</p></article>`,
        ),
        "</div></section>",
      ].join("");
    case "cta":
      return `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p><p><a href="${section.href}">${escapeHtml(section.label)}</a></p></section>`;
    default:
      return "";
  }
}

function buildBodyHtml(page) {
  return [
    `<header><p>${escapeHtml(page.bodyRichtext.heroIntro)}</p></header>`,
    ...page.bodyRichtext.sections.map(renderSection),
  ].join("");
}

function sqlLiteral(value) {
  if (value === null) {
    return "null";
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonLiteral(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

const chapterInserts = chapters
  .map(
    (chapter) => `(
  ${sqlLiteral(chapter.id)},
  ${sqlLiteral(chapter.name)},
  ${sqlLiteral(chapter.subdomain)},
  ${sqlLiteral(chapter.locale)},
  ${sqlLiteral(chapter.status)},
  ${sqlLiteral(chapter.contactEmail)},
  ${jsonLiteral(chapter.themeJson)},
  ${sqlLiteral(chapter.tagline)}
)`,
  )
  .join(",\n");

const pageInserts = pages
  .map((page) => {
    const bodyHtml = buildBodyHtml(page);

    return `(
  ${sqlLiteral(page.id)},
  ${page.chapterId ? sqlLiteral(page.chapterId) : "null"},
  ${sqlLiteral(page.slug)},
  ${sqlLiteral(page.title)},
  ${sqlLiteral(bodyHtml)},
  ${jsonLiteral(page.bodyRichtext)},
  ${jsonLiteral(page.seo)},
  ${sqlLiteral(page.seo.sourceUrl)},
  ${page.published ? "true" : "false"}
)`;
  })
  .join(",\n");

const seedSql = `begin;

insert into public.chapters (
  id,
  name,
  subdomain,
  locale,
  status,
  contact_email,
  theme_json,
  tagline
)
values
${chapterInserts}
on conflict (subdomain) do update
set
  name = excluded.name,
  locale = excluded.locale,
  status = excluded.status,
  contact_email = excluded.contact_email,
  theme_json = excluded.theme_json,
  tagline = excluded.tagline;

insert into public.content_pages (
  id,
  chapter_id,
  slug,
  title,
  body_html,
  body_richtext,
  seo,
  source_url,
  published
)
values
${pageInserts}
on conflict (id) do update
set
  chapter_id = excluded.chapter_id,
  slug = excluded.slug,
  title = excluded.title,
  body_html = excluded.body_html,
  body_richtext = excluded.body_richtext,
  seo = excluded.seo,
  source_url = excluded.source_url,
  published = excluded.published;

commit;
`;

fs.writeFileSync(path.join(root, "supabase", "seed.sql"), seedSql);

function toCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((header) => {
      const raw = row[header] ?? "";
      const value =
        typeof raw === "string" ? raw : JSON.stringify(raw);
      return `"${String(value).replaceAll('"', '""')}"`;
    });

    lines.push(values.join(","));
  }

  return `${lines.join("\n")}\n`;
}

const sourcePagesRows = pages.map((page) => ({
  id: page.id,
  slug: page.slug,
  title: page.title,
  chapter_scope: page.chapterId ? "tenant" : "global",
  source_url: page.seo.sourceUrl,
  source_status: page.seo.sourceStatus,
  source_notes: page.seo.sourceNotes,
  safe_to_publish: page.seo.sourceStatus !== "skipped",
  published: page.published,
}));

const sourceAssetRows = assets.map((asset) => ({
  id: asset.id,
  page_slug: asset.pageSlug,
  title: asset.title,
  asset_url: asset.assetUrl,
  asset_kind: asset.assetKind,
  status: asset.status,
  notes: asset.notes,
}));

const migrationRows = migrationRuns.map((run) => ({
  id: run.id,
  executed_at: run.executedAt,
  importer: run.importer,
  summary: run.summary,
  skipped_items: run.skippedItems,
}));

const snapshotRows = [
  {
    id: "snapshot-001",
    created_at: migrationRuns[0]?.executedAt ?? new Date().toISOString(),
    artifact_path: "supabase/seed.sql",
    notes: "Generated from src/content/*.json by scripts/sync-content-artifacts.mjs",
  },
  {
    id: "snapshot-002",
    created_at: migrationRuns[0]?.executedAt ?? new Date().toISOString(),
    artifact_path: "src/content/pages.json",
    notes: "Canonical migration source used by both the app fallback data and the generated SQL seed.",
  },
];

fs.writeFileSync(
  path.join(outputDir, "source_pages.csv"),
  toCsv(sourcePagesRows),
);
fs.writeFileSync(
  path.join(outputDir, "source_assets.csv"),
  toCsv(sourceAssetRows),
);
fs.writeFileSync(
  path.join(outputDir, "migration_runs.csv"),
  toCsv(migrationRows),
);
fs.writeFileSync(
  path.join(outputDir, "seed_snapshots.csv"),
  toCsv(snapshotRows),
);
