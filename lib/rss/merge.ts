import type { FeedSource } from "../types";
import type { CleanOptions } from "../types";
import type { CleanedFeed, CleanedItem } from "./fetch";
import { fetchAndCleanFeed } from "./fetch";

function itemKey(item: CleanedItem): string {
  return item.link ?? item.guid ?? item.title;
}

function pubDateMs(item: CleanedItem): number {
  if (!item.pubDate) return 0;
  const ms = Date.parse(item.pubDate);
  return Number.isNaN(ms) ? 0 : ms;
}

export async function fetchAndMergeFeeds(
  sources: FeedSource[],
  options: CleanOptions,
  maxItems = 50,
): Promise<CleanedFeed> {
  const results = await Promise.allSettled(
    sources.map((source) =>
      fetchAndCleanFeed(
        source.url,
        options,
        source.name,
        source.englishOnly ?? false,
      ),
    ),
  );

  const seen = new Set<string>();
  const merged: CleanedItem[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value.items) {
      const key = itemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  merged.sort((a, b) => pubDateMs(b) - pubDateMs(a));

  return {
    title: "My News",
    description: "Combined cleaned headlines for Dakboard",
    items: merged.slice(0, maxItems),
  };
}
