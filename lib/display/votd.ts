import type { DisplayStory } from "./items";

const VOTD_URL =
  "https://www.biblegateway.com/votd/get/?format=json&version=ESV";

export const DEFAULT_VOTD_COPIES = 3;

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

export function votdToStory(payload: VotdPayload["votd"]): DisplayStory | null {
  if (!payload) return null;
  const raw = payload.content || payload.text;
  const ref = payload.display_ref || payload.reference;
  if (!raw || !ref) return null;

  const version = payload.version_id || "ESV";
  return {
    title: ref,
    description: decodeHtmlEntities(raw),
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

export async function fetchVerseOfTheDay(): Promise<DisplayStory | null> {
  try {
    const res = await fetch(VOTD_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "best-news-rss/1.0 (display votd)",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as VotdPayload;
    return votdToStory(data.votd);
  } catch {
    return null;
  }
}
