import DOMPurify from "dompurify";

/**
 * 3.2 XSS blast-radius control (docs/07-security-architecture.md): any
 * user-authored string this app renders as HTML goes through this first.
 * Plain `{value}` JSX interpolation is already auto-escaped by React — this
 * only matters where we deliberately opt into `dangerouslySetInnerHTML`
 * (see ProfilePage's bio field), which is the one place in this repo a
 * user's own free-text input is rendered as markup rather than plain text.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: ["b", "i", "em", "strong", "br", "p"] });
}
