/**
 * CSP frame-ancestors for /display — only Dakboard (and this app) may embed the widget.
 * Direct browser visits to /display are unaffected.
 */
const DAKBOARD_FRAME_ANCESTORS = [
  "'self'",
  "https://dakboard.com",
  "https://www.dakboard.com",
  "https://*.dakboard.com",
] as const;

export function displayFrameAncestorsCsp(): string {
  const extra = process.env.FRAME_ANCESTORS_EXTRA?.trim();
  const ancestors = extra
    ? [...DAKBOARD_FRAME_ANCESTORS, ...extra.split(/\s+/).filter(Boolean)]
    : [...DAKBOARD_FRAME_ANCESTORS];

  return `frame-ancestors ${ancestors.join(" ")}`;
}
