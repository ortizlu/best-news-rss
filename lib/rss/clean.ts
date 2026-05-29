import type { CleanOptions } from "../types";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "source",
  "itid",
]);

export const DEFAULT_CLEAN_OPTIONS: CleanOptions = {
  stripHtml: true,
  maxDescriptionLength: 400,
  removeTrackingParams: true,
  dropFullContent: true,
  dropMedia: true,
  dropAuthors: true,
  dropCategories: true,
  includeItemLinks: false,
  includeImages: false,
};

export function parseCleanOptions(
  searchParams: URLSearchParams,
): CleanOptions {
  const bool = (key: string, fallback: boolean) => {
    const v = searchParams.get(key);
    if (v === null) return fallback;
    return v === "1" || v === "true";
  };

  const max = Number(searchParams.get("maxDescriptionLength"));
  return {
    stripHtml: bool("stripHtml", DEFAULT_CLEAN_OPTIONS.stripHtml),
    maxDescriptionLength:
      Number.isFinite(max) && max > 0
        ? max
        : DEFAULT_CLEAN_OPTIONS.maxDescriptionLength,
    removeTrackingParams: bool(
      "removeTracking",
      DEFAULT_CLEAN_OPTIONS.removeTrackingParams,
    ),
    dropFullContent: bool(
      "dropFullContent",
      DEFAULT_CLEAN_OPTIONS.dropFullContent,
    ),
    dropMedia: bool("dropMedia", DEFAULT_CLEAN_OPTIONS.dropMedia),
    dropAuthors: bool("dropAuthors", DEFAULT_CLEAN_OPTIONS.dropAuthors),
    dropCategories: bool(
      "dropCategories",
      DEFAULT_CLEAN_OPTIONS.dropCategories,
    ),
    includeItemLinks: bool(
      "links",
      DEFAULT_CLEAN_OPTIONS.includeItemLinks,
    ),
    includeImages: bool("images", DEFAULT_CLEAN_OPTIONS.includeImages),
  };
}

export function resolveCleanOptions(
  searchParams: URLSearchParams,
  presets?: Partial<CleanOptions>,
): CleanOptions {
  return { ...parseCleanOptions(searchParams), ...presets };
}

export function extractFirstImageUrl(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1];
}

function stripBareUrls(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text: string): string {
  let out = text;
  for (let pass = 0; pass < 3; pass++) {
    out = out
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&#8230;/g, "…")
      .replace(/&hellip;/g, "…")
      .replace(/&#(\d+);/g, (_, n) =>
        String.fromCharCode(Number(n)),
      )
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
  }
  return out;
}

const WIRE_SERVICES =
  "AP|Associated Press|The Associated Press|Reuters|AFP|Bloomberg|PA Media";

/** Remove wire datelines and bylines, e.g. "KINSHASA, Congo (AP) — ". */
export function stripWireAttribution(text: string): string {
  const wire = new RegExp(WIRE_SERVICES, "i");
  let t = text.trim();

  // CITY, Country (AP) — …
  t = t.replace(
    new RegExp(
      `^[\\p{Lu}\\d][\\p{L}\\s.,'\\u2019-]*?\\s*\\(\\s*(?:${WIRE_SERVICES})\\s*\\)\\s*[\\u2014\\u2013-]\\s*`,
      "iu",
    ),
    "",
  );

  // (AP) — …
  if (wire.test(t)) {
    t = t.replace(
      new RegExp(`^\\s*\\(\\s*(?:${WIRE_SERVICES})\\s*\\)\\s*[\\u2014\\u2013-]\\s*`, "iu"),
      "",
    );
  }

  // By Jane Doe — …
  t = t.replace(
    /^[Bb]y\s+[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){0,3}\s*[\u2014\u2013-]\s*/u,
    "",
  );

  t = t
    .replace(/\s+Read\s+More\b[\s\S]*$/i, "")
    .replace(/\s*\d{4}-\d{2}-\d{2}T[\d:.]+Z?\s*/g, " ")
    .trim();

  return t;
}

function isBoilerplateParagraph(text: string): boolean {
  if (text.length < 24) return true;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return true;
  if (/^Read\s+More/i.test(text)) return true;
  if (/^Photo:/i.test(text)) return true;
  if (/^\(.*\)\s*$/i.test(text)) return true;
  return false;
}

/** First real &lt;p&gt; from HTML feeds (AP, ALXnow, etc.). */
export function extractFirstParagraph(html: string): string | undefined {
  const matches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  for (const match of matches) {
    const text = stripWireAttribution(stripHtml(match[1] ?? ""));
    if (!isBoilerplateParagraph(text)) return text;
  }
  return undefined;
}

/** Trim feed boilerplate so Dakboard descriptions stay short and readable. */
export function polishDescription(text: string): string {
  let t = stripWireAttribution(text)
    .replace(/\s*Read more on [^:]+:\s*.*$/i, "")
    .replace(/\s*\[…\]\s*$/i, "")
    .replace(/\s*——\s*[\s\S]*$/u, "")
    .trim();

  const parts = t
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (isBoilerplateParagraph(part)) continue;
    return stripWireAttribution(part);
  }

  return t;
}

export function stripHtml(html: string): string {
  const withoutScripts = html.replace(
    /<script[\s\S]*?<\/script>/gi,
    "",
  );
  const withoutStyles = withoutScripts.replace(
    /<style[\s\S]*?<\/style>/gi,
    "",
  );
  const withoutMedia = withoutStyles
    .replace(/<img[^>]*>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<small[^>]*>[\s\S]*?<\/small>/gi, "");
  const withBreaks = withoutMedia
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");

  const lines = withBreaks
    .split(/\n+/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);

  return decodeEntities(lines.join("\n"));
}

/** Plain-text lead for RSS &lt;description&gt; (one short paragraph). */
export function extractLeadText(
  raw: string | undefined,
  options: CleanOptions,
): string | undefined {
  if (!raw) return undefined;

  const fromHtml = raw.includes("<") ? extractFirstParagraph(raw) : undefined;
  let text = fromHtml ?? (options.stripHtml ? stripHtml(raw) : raw.trim());
  text = polishDescription(text);
  if (!options.includeImages) {
    text = stripBareUrls(text);
  }

  if (text.length > options.maxDescriptionLength) {
    text = text.slice(0, options.maxDescriptionLength).trimEnd() + "…";
  }

  return text || undefined;
}

export function cleanUrl(
  url: string | undefined,
  removeTracking: boolean,
): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (removeTracking) {
      for (const key of [...parsed.searchParams.keys()]) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          parsed.searchParams.delete(key);
        }
      }
    }
    const out = parsed.toString();
    return out.endsWith("?") ? out.slice(0, -1) : out;
  } catch {
    return url;
  }
}

export function cleanText(
  value: string | undefined,
  options: CleanOptions,
): string | undefined {
  if (!value) return undefined;
  let text = options.stripHtml ? stripHtml(value) : value.trim();
  text = stripWireAttribution(polishDescription(text));
  if (text.length > options.maxDescriptionLength) {
    text = text.slice(0, options.maxDescriptionLength).trimEnd() + "…";
  }
  return text || undefined;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
