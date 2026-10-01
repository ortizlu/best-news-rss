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

/** Founders 1689 Confession cover — soft-blurred behind catechism slides. */
export const CATECHISM_BACKGROUND_URL =
  "https://founders.org/wp-content/uploads/2023/01/1689-confession-modern-eng.jpg";

let cached: CatechismItem[] | null = null;

export async function loadCatechismItems(): Promise<CatechismItem[]> {
  if (cached) return cached;
  const raw = await readFile(CATECHISM_PATH, "utf-8");
  const data = JSON.parse(raw) as CatechismFile;
  cached = Array.isArray(data.items) ? data.items : [];
  return cached;
}

/** Hourly rotation so soft refreshes advance through the catechism. */
export function catechismStartIndex(total: number, now = Date.now()): number {
  if (total <= 0) return 0;
  const hourBucket = Math.floor(now / (60 * 60 * 1000));
  return ((hourBucket % total) + total) % total;
}

export function pickCatechismItems(
  items: CatechismItem[],
  count: number,
  now = Date.now(),
): CatechismItem[] {
  if (items.length === 0 || count <= 0) return [];
  const start = catechismStartIndex(items.length, now);
  const picked: CatechismItem[] = [];
  for (let i = 0; i < Math.min(count, items.length); i++) {
    picked.push(items[(start + i) % items.length]!);
  }
  return picked;
}

export function catechismToStory(item: CatechismItem): DisplayStory {
  return {
    title: item.question,
    description: item.answer,
    source: `${SOURCE_LABEL} · Q. ${item.number}`,
    imageUrl: CATECHISM_BACKGROUND_URL,
    imageBlur: true,
  };
}

/**
 * Keep ~maxItems total: after every `every` news stories, insert one catechism.
 * Example every=4 → N N N N C N N N N C …
 */
export function interleaveCatechism(
  news: DisplayStory[],
  catechism: DisplayStory[],
  every: number,
): DisplayStory[] {
  const gap = Math.max(1, Math.floor(every));
  if (catechism.length === 0) return news;

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

  return out;
}

/** How many news vs catechism slots fit in maxItems at the given cadence. */
export function splitDisplayBudget(
  maxItems: number,
  every: number,
): { newsCount: number; catechismCount: number } {
  const gap = Math.max(1, Math.floor(every));
  const period = gap + 1;
  const catechismCount = Math.floor(maxItems / period);
  const newsCount = Math.max(0, maxItems - catechismCount);
  return { newsCount, catechismCount };
}
