import type { DisplayStory } from "./items";

const VOTD_URL =
  "https://www.biblegateway.com/votd/get/?format=json&version=ESV";

export const DEFAULT_VOTD_COPIES = 10;

/** Local sword wallpaper served from /public. */
export const VOTD_BACKGROUND_URL = "/verse-of-day.jpeg";

type VotdPayload = {
  votd?: {
    content?: string;
    text?: string;
    display_ref?: string;
    reference?: string;
    permalink?: string;
    version?: string;
    version_id?: string;
  };
};

/** Decode common HTML entities from Bible Gateway VOTD JSON. */
export function decodeHtmlEntities(input: string): string {
  const named: Record<string, string> = {
    ldquo: "\u201C",
    rdquo: "\u201D",
    lsquo: "\u2018",
    rsquo: "\u2019",
    nbsp: " ",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
  };

  let out = input.replace(/&([a-z]+);/gi, (match, name: string) => {
    const key = name.toLowerCase();
    return key in named ? named[key]! : match;
  });
  out = out.replace(/&#(\d+);/g, (_, n: string) => {
    const code = Number(n);
    return Number.isFinite(code) ? String.fromCodePoint(code) : _;
  });
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, h: string) => {
    const code = parseInt(h, 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : _;
  });

  // Gateway sometimes stacks &ldquo;&#8220; → collapse doubled quotes.
  out = out.replace(/([\u201C\u201D"'])\1+/g, "$1");
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

/**
 * Gateway wraps the divine name in small-caps spans (and occasionally other
 * tags). Display is plain text, so unwrap tags and use LORD for small-caps.
 * ESV section headings arrive as <h3> and are not part of the verse.
 */
export function stripVotdHtml(input: string): string {
  let out = input.replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, " ");
  out = out.replace(
    /<span\b[^>]*\bsmall-caps\b[^>]*>([\s\S]*?)<\/span>/gi,
    (_, inner: string) => inner.replace(/<[^>]+>/g, "").toUpperCase(),
  );
  out = out.replace(/<br\s*\/?>/gi, " ");
  out = out.replace(/<[^>]+>/g, "");
  return out;
}

/**
 * The `text` field renders the same heading as a leading [bracketed] phrase.
 * Only strip it at the start so mid-verse ESV brackets survive.
 */
export function stripVerseHeading(input: string): string {
  let out = input.replace(
    /^(\s*[\u201C\u2018"']?)\s*\[[^\]]+\]\s*/,
    (_, lead: string) => lead,
  );
  // Heading removal can leave a gap after the opening quote.
  out = out.replace(/^([\u201C\u2018"'])\s+/, "$1");
  return out.trim();
}

/** Entities → strip tags/headings → collapse whitespace. */
export function cleanVotdContent(input: string): string {
  return stripVerseHeading(decodeHtmlEntities(stripVotdHtml(input)));
}

export function votdToStory(payload: VotdPayload["votd"]): DisplayStory | null {
  if (!payload) return null;
  const raw = payload.content || payload.text;
  const ref = payload.display_ref || payload.reference;
  if (!raw || !ref) return null;

  const version = payload.version_id || "ESV";
  return {
    title: ref,
    description: cleanVotdContent(raw),
    source: `Verse of the Day · ${version}`,
    imageUrl: VOTD_BACKGROUND_URL,
  };
}

/** Duplicate a story with unique links so React keys stay distinct. */
export function replicateStory(
  story: DisplayStory,
  copies: number,
): DisplayStory[] {
  const n = Math.max(0, Math.floor(copies));
  return Array.from({ length: n }, (_, i) => ({
    ...story,
    link: `votd://copy-${i + 1}`,
  }));
}

type DayCache = {
  dayKey: string;
  story: DisplayStory | null;
  pending?: Promise<DisplayStory | null>;
};

let dayCache: DayCache | null = null;

/** YYYY-MM-DD in UTC — matches Bible Gateway’s typical VOTD rollover. */
export function votdDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

async function fetchVerseOfTheDayUncached(): Promise<DisplayStory | null> {
  try {
    const res = await fetch(VOTD_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "best-news-rss/1.0 (display votd)",
      },
      signal: AbortSignal.timeout(8000),
      // Next data cache — keeps CDN/server fetches warm across instances.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as VotdPayload;
    return votdToStory(data.votd);
  } catch {
    return null;
  }
}

/**
 * One Bible Gateway hit per calendar day per server instance.
 * Soft refreshes (/api/display every 5m) reuse the in-memory result.
 */
export async function fetchVerseOfTheDay(): Promise<DisplayStory | null> {
  const dayKey = votdDayKey();
  if (dayCache?.dayKey === dayKey) {
    if (dayCache.story) return dayCache.story;
    if (dayCache.pending) return dayCache.pending;
  }

  const pending = fetchVerseOfTheDayUncached().then((story) => {
    dayCache = { dayKey, story };
    return story;
  });
  dayCache = { dayKey, story: null, pending };
  return pending;
}
