import { applyDisplayImageOverrides } from "./story-image";
import { loadFeeds } from "../feeds-store";
import { DEFAULT_CLEAN_OPTIONS } from "../rss/clean";
import { enrichStoriesWithOgImages } from "../rss/og-image";
import { fetchAndMergeFeeds } from "../rss/merge";
import {
  catechismToStory,
  interleaveCatechism,
  loadCatechismItems,
  pickCatechismItems,
  splitDisplayBudget,
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
  /** Insert one catechism Q&A after this many news stories (default 4). */
  catechismEvery?: number;
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
  }: GetDisplayStoriesOptions = {},
): Promise<DisplayStory[]> {
  const every = Math.max(1, Math.min(20, Math.floor(catechismEvery) || 4));
  const { newsCount, catechismCount } = includeCatechism
    ? splitDisplayBudget(maxItems, every)
    : { newsCount: maxItems, catechismCount: 0 };

  const feeds = await loadFeeds();
  let news: DisplayStory[] = [];

  if (feeds.length > 0 && newsCount > 0) {
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
    const fetchLimit = Math.min(newsCount * 4, 120);
    const merged = await fetchAndMergeFeeds(feeds, options, fetchLimit);

    const sorted = [...merged.items].sort(
      (a, b) => pubDateMs(b.pubDate) - pubDateMs(a.pubDate),
    );

    news = sorted.slice(0, newsCount).map((item) => ({
      title: item.title,
      description: item.description,
      source: item.source,
      link: item.link,
      imageUrl: item.imageUrl,
      pubDate: item.pubDate,
    }));
  }

  let stories = news;

  if (includeCatechism && catechismCount > 0) {
    const items = await loadCatechismItems();
    const picked = pickCatechismItems(items, catechismCount).map(catechismToStory);
    stories = interleaveCatechism(news, picked, every);
  }

  if (!includeImages) return stories;

  // No RSS image → use the article page's og:image (hero photo).
  // Catechism items have no image; enrichment skips empty links gracefully.
  const enriched = await enrichStoriesWithOgImages(stories);
  return enriched.map(applyDisplayImageOverrides);
}
