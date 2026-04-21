import sanitizeHtml from "sanitize-html";

const CONTENT_PAGE_ALLOWED_TAGS = [
  "h2",
  "h3",
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "a",
  "blockquote",
  "img",
] as const;

const CONTENT_PAGE_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "width"],
};

const CONTENT_PAGE_ALLOWED_SCHEMES = ["http", "https", "mailto"] as const;

export function sanitizeContentPageHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [...CONTENT_PAGE_ALLOWED_TAGS],
    allowedAttributes: CONTENT_PAGE_ALLOWED_ATTRIBUTES,
    allowedSchemes: [...CONTENT_PAGE_ALLOWED_SCHEMES],
  });
}
