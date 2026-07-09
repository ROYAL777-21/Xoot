import DOMPurify from "dompurify";

export function sanitiseInput(value: string | null | undefined): string {
  if (!value) return "";
  return DOMPurify.sanitize(String(value), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/[<>"'`\\/]/g, "")
    .trim()
    .slice(0, 500);
}

export function sanitiseSearchParam(value: string | null): string {
  return sanitiseInput(value).slice(0, 200);
}

export function sanitiseLongText(value: string | null | undefined, maxLength = 2000): string {
  if (!value) return "";
  return DOMPurify.sanitize(String(value), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/[<>"'`\\]/g, "")
    .trim()
    .slice(0, maxLength);
}
