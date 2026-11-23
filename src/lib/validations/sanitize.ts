/** Strip control characters and angle brackets, collapse whitespace and cap length. */
export function sanitizeText(input: string | undefined | null, max = 200): string {
  if (!input) return "";
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const IMAGE_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export const MAX_IMAGE_BYTES = 3_500_000; // keep under Vercel's 4.5 MB request limit

export function isSafeImageDataUrl(value: string): boolean {
  if (value.length > MAX_IMAGE_BYTES * 1.37) return false; // base64 overhead
  return IMAGE_RE.test(value);
}
