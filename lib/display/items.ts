import { loadFeeds } from "../feeds-store";
import { DEFAULT_CLEAN_OPTIONS } from "../rss/clean";
import { fetchAndMergeFeeds } from "../rss/merge";

export type DisplayStory = {
  title: string;
  description?: string;
  source?: string;
  link?: string;
  imageUrl?: string;
  pubDate?: string;
};

function pubDateMs(pubDate?: string): number {
  if (!pubDate) return 0;
  const ms = Date.parse(pubDate);
  return Number.isNaN(ms) ? 0 : ms;
}

export async function getDisplayStories(maxItems = 30): Promise<DisplayStory[]> {
  const feeds = await loadFeeds();
  if (feeds.length === 0) return [];

  const options = {
    ...DEFAULT_CLEAN_OPTIONS,
    includeItemLinks: true,
    includeImages: true,
  };

  const merged = await fetchAndMergeFeeds(feeds, options, maxItems);

  const sorted = [...merged.items].sort((a, b) => {
    const aHasImage = a.imageUrl ? 1 : 0;
    const bHasImage = b.imageUrl ? 1 : 0;
    if (aHasImage !== bHasImage) return bHasImage - aHasImage;
    return pubDateMs(b.pubDate) - pubDateMs(a.pubDate);
  });

  return sorted.map((item) => ({
    title: item.title,
    description: item.description,
    source: item.source,
    link: item.link,
    imageUrl: item.imageUrl,
    pubDate: item.pubDate,
  }));
}
