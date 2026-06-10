import { loadFeeds } from '../feeds-store';
import { DEFAULT_CLEAN_OPTIONS } from '../rss/clean';
import { enrichStoriesWithOgImages } from '../rss/og-image';
import { fetchAndMergeFeeds } from '../rss/merge';

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

export async function getDisplayStories(
    maxItems = 30,
    { includeImages = true }: { includeImages?: boolean } = {},
): Promise<DisplayStory[]> {
    const feeds = await loadFeeds();
    if (feeds.length === 0) return [];

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

    const sorted = [...merged.items].sort((a, b) => pubDateMs(b.pubDate) - pubDateMs(a.pubDate));

    const stories: DisplayStory[] = sorted.slice(0, maxItems).map(item => ({
        title: item.title,
        description: item.description,
        source: item.source,
        link: item.link,
        imageUrl: item.imageUrl,
        pubDate: item.pubDate
    }));

    if (!includeImages) return stories;

    // No RSS image → use the article page's og:image (hero photo).
    return enrichStoriesWithOgImages(stories);
}
