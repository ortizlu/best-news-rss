import { applyDisplayImageOverrides } from "./story-image";
import { loadFeeds } from "../feeds-store";
import { DEFAULT_CLEAN_OPTIONS } from "../rss/clean";
import { enrichStoriesWithOgImages } from "../rss/og-image";
import { fetchAndMergeFeeds } from "../rss/merge";
import {
  DEFAULT_CATECHISM_COUNT,
  catechismToStory,
  interleaveCatechism,
  loadCatechismItems,
  pickCatechismItems,
} from "./catechism";

export type DisplayStory = {
  title: string;
  description?: string;
  source?: string;
  link?: string;
  imageUrl?: string;
  imageBlur?: boolean;
  pubDate?: string;
};

export type GetDisplayStoriesOptions = {
  includeImages?: boolean;
  includeCatechism?: boolean;
  /** Insert cadence hint (default 4). Large catechism pools fall back to even mix. */
  catechismEvery?: number;
  /** How many random Q&As to add on top of news (default 19). */
  catechismCount?: number;
};

function pubDateMs(pubDate?: string): number {
  if (!pubDate) return 0;
  const ms = Date.parse(pubDate);
  return Number.isNaN(ms) ? 0 : ms;
}

export async function getDisplayStories(
  maxItems = 30,
  {
    includeImages = true,
    includeCatechism = false,
    catechismEvery = 4,
    catechismCount = DEFAULT_CATECHISM_COUNT,
  }: GetDisplayStoriesOptions = {},
): Promise<DisplayStory[]> {
  const every = Math.max(1, Math.min(20, Math.floor(catechismEvery) || 4));
  const qCount = Math.max(
    0,
    Math.min(114, Math.floor(catechismCount) || DEFAULT_CATECHISM_COUNT),
  );

  const feeds = await loadFeeds();
  let news: DisplayStory[] = [];

  if (feeds.length > 0 && maxItems > 0) {
    const options = {
      ...DEFAULT_CLEAN_OPTIONS,
      includeItemLinks: true,
      includeImages,
      maxDescriptionLength: 1000,
      maxParagraphs: 8,
      dropFullContent: false,
      excludeSports: true,
    };

    // Over-fetch so filtering out body-less items still fills the rotation.
    const fetchLimit = Math.min(maxItems * 4, 120);
    const merged = await fetchAndMergeFeeds(feeds, options, fetchLimit);

    const sorted = [...merged.items].sort(
      (a, b) => pubDateMs(b.pubDate) - pubDateMs(a.pubDate),
    );

    news = sorted.slice(0, maxItems).map((item) => ({
      title: item.title,
      description: item.description,
      source: item.source,
      link: item.link,
      imageUrl: item.imageUrl,
      pubDate: item.pubDate,
    }));
  }

  let stories = news;

  if (includeCatechism && qCount > 0) {
    const items = await loadCatechismItems();
    const picked = pickCatechismItems(items, qCount).map(catechismToStory);
    stories = interleaveCatechism(news, picked, every);
  }

  if (!includeImages) return stories;

  // No RSS image → use the article page's og:image (hero photo).
  const enriched = await enrichStoriesWithOgImages(stories);
  return enriched.map(applyDisplayImageOverrides);
}
