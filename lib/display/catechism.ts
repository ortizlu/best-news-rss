import { readFile } from "fs/promises";
import path from "path";
import type { DisplayStory } from "./items"; // type-only; avoids runtime cycle with items.ts

export type CatechismItem = {
  number: number;
  question: string;
  answer: string;
};

type CatechismFile = {
  source?: string;
  title?: string;
  items: CatechismItem[];
};

const CATECHISM_PATH = path.join(process.cwd(), "data", "baptist-catechism.json");

const SOURCE_LABEL = "Baptist Catechism";

/** Local 1689 wallpaper served from /public (sharp, unblurred). */
export const CATECHISM_BACKGROUND_URL = "/catechism-wallpaper.jpeg";

/** Default Q&As added on top of the full news pool when catechism=true. */
export const DEFAULT_CATECHISM_COUNT = 30;

let cached: CatechismItem[] | null = null;

export async function loadCatechismItems(): Promise<CatechismItem[]> {
  if (cached) return cached;
  const raw = await readFile(CATECHISM_PATH, "utf-8");
  const data = JSON.parse(raw) as CatechismFile;
  cached = Array.isArray(data.items) ? data.items : [];
  return cached;
}

/** Deterministic PRNG — stable within an hour so soft refresh doesn't reshuffle mid-rotation. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hourSeed(now: number): number {
  return Math.floor(now / (60 * 60 * 1000));
}

/** Fisher–Yates shuffle with hourly-seeded RNG, then take `count`. */
export function pickCatechismItems(
  items: CatechismItem[],
  count: number,
  now = Date.now(),
): CatechismItem[] {
  if (items.length === 0 || count <= 0) return [];
  const rng = mulberry32(hourSeed(now) ^ 0xca7e01);
  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function catechismToStory(item: CatechismItem): DisplayStory {
  return {
    title: item.question,
    description: stripScriptureReferences(item.answer),
    source: `${SOURCE_LABEL} · Question ${item.number}`,
    imageUrl: CATECHISM_BACKGROUND_URL,
  };
}

/**
 * Drop parenthetical scripture proofs for display. Keeps non-verse asides
 * (e.g. Q. 71’s “as far as it shall serve…”). Full text stays in the JSON.
 */
export function stripScriptureReferences(text: string): string {
  let out = text.replace(/\s*\([^)]*\d[^)]*\)/g, "");
  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/\s+([,.;:!?])/g, "$1");
  // Space after punctuation, but not before closing quotes.
  out = out.replace(/([,;:])(?=[^\s”"'])/g, "$1 ");
  out = out.replace(/;\s+(and|but|or)\b/gi, ", $1");
  out = out.replace(/,\s*,+/g, ",");
  out = out.replace(/\.\s*\./g, ".");
  out = out.replace(/,\s+([”"'])/g, ",$1");
  return out.trim();
}

/**
 * Fair merge so all of `secondary` is spread through `primary`
 * (equal lengths ≈ alternate; more news stays news-heavy).
 */
export function interleaveEvenly(
  primary: DisplayStory[],
  secondary: DisplayStory[],
): DisplayStory[] {
  if (secondary.length === 0) return primary;
  if (primary.length === 0) return secondary;

  const out: DisplayStory[] = [];
  let i = 0;
  let j = 0;
  while (i < primary.length && j < secondary.length) {
    if (i * secondary.length <= j * primary.length) {
      out.push(primary[i]!);
      i += 1;
    } else {
      out.push(secondary[j]!);
      j += 1;
    }
  }
  while (i < primary.length) {
    out.push(primary[i]!);
    i += 1;
  }
  while (j < secondary.length) {
    out.push(secondary[j]!);
    j += 1;
  }
  return out;
}

/**
 * After every `every` news stories, insert one catechism; leftover catechism
 * are spread through the remainder via even merge (so a large pool is fully used).
 */
export function interleaveCatechism(
  news: DisplayStory[],
  catechism: DisplayStory[],
  every: number,
): DisplayStory[] {
  const gap = Math.max(1, Math.floor(every));
  if (catechism.length === 0) return news;
  if (news.length === 0) return catechism;

  // Prefer the every-N cadence when it can place most/all items; otherwise even merge.
  const slotsFromCadence = Math.floor(news.length / gap);
  if (catechism.length > slotsFromCadence * 1.25) {
    return interleaveEvenly(news, catechism);
  }

  const out: DisplayStory[] = [];
  let cIdx = 0;
  let sinceCatechism = 0;

  for (const story of news) {
    out.push(story);
    sinceCatechism += 1;
    if (sinceCatechism >= gap && cIdx < catechism.length) {
      out.push(catechism[cIdx]!);
      cIdx += 1;
      sinceCatechism = 0;
    }
  }

  if (cIdx < catechism.length) {
    return interleaveEvenly(out, catechism.slice(cIdx));
  }
  return out;
}
