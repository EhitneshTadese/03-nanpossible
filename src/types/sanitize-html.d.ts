declare module "sanitize-html" {
  export type SanitizeHtmlOptions = {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemes?: string[];
  };

  export default function sanitizeHtml(
    dirty: string,
    options?: SanitizeHtmlOptions,
  ): string;
}
