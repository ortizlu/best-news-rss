import { readFile, writeFile } from "fs/promises";
import path from "path";
import type { FeedSource, FeedsConfig } from "./types";

const FEEDS_PATH = path.join(process.cwd(), "data", "feeds.json");

export async function loadFeeds(): Promise<FeedSource[]> {
  try {
    const raw = await readFile(FEEDS_PATH, "utf-8");
    const config = JSON.parse(raw) as FeedsConfig;
    return config.feeds ?? [];
  } catch {
    return [];
  }
}

export async function saveFeeds(feeds: FeedSource[]): Promise<void> {
  const config: FeedsConfig = { feeds };
  await writeFile(FEEDS_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
