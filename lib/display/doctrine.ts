import { readFile } from "fs/promises";
import path from "path";
import type { DisplayStory } from "./items";

export type DoctrineItem = {
  day: number;
  title: string;
  summary: string;
  section?: string;
};

type DoctrineFile = {
  source?: string;
  title?: string;
  items: DoctrineItem[];
};

const DOCTRINE_PATH = path.join(process.cwd(), "data", "daily-doctrine.json");

const SOURCE_LABEL = "Daily Doctrine";

/** Local wallpaper served from /public. */
export const DOCTRINE_BACKGROUND_URL = "/daily-doctrine.jpeg";

/** Default readings mixed in when doctrine=true. */
export const DEFAULT_DOCTRINE_COUNT = 5;

let cached: DoctrineItem[] | null = null;

export async function loadDoctrineItems(): Promise<DoctrineItem[]> {
  if (cached) return cached;
  const raw = await readFile(DOCTRINE_PATH, "utf-8");
  const data = JSON.parse(raw) as DoctrineFile;
  cached = Array.isArray(data.items) ? data.items : [];
  return cached;
}

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
export function pickDoctrineItems(
  items: DoctrineItem[],
  count: number,
  now = Date.now(),
): DoctrineItem[] {
  if (items.length === 0 || count <= 0) return [];
  const rng = mulberry32(hourSeed(now) ^ 0xd0c701);
  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function doctrineToStory(item: DoctrineItem): DisplayStory {
  return {
    title: item.title,
    description: item.summary,
    source: `${SOURCE_LABEL} · Day ${item.day}`,
    imageUrl: DOCTRINE_BACKGROUND_URL,
  };
}
