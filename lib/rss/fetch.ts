import Parser from 'rss-parser';
import { fetchAndCleanNewsBreakFeed, isNewsBreakFeedUrl } from '../newsbreak/fetch';
import type { CleanOptions } from '../types';
import {
    cleanText,
    cleanUrl,
    escapeXml,
    extractArticleText,
    extractFirstImageUrl,
    extractLeadText
} from './clean';
import { formatPubDate } from './dates';
import { isLikelyEnglish } from './language';
import { isLowValueStory } from './junk';
import { isSportsArticle } from './sports';

type CustomItem = {
    'content:encoded'?: string;
    contentEncoded?: string;
    creator?: string;
    author?: string;
    categories?: string[];
    enclosure?: { url?: string; type?: string; length?: string };
};

type CustomFeed = {
    title?: string;
    description?: string;
    link?: string;
    language?: string;
    lastBuildDate?: string;
};

const parser = new Parser<CustomFeed, CustomItem>({
    customFields: {
        item: [
            ['content:encoded', 'contentEncoded'],
            ['dc:creator', 'creator']
        ]
    }
});

export type CleanedFeed = {
    title: string;
    link?: string;
    description?: string;
    items: CleanedItem[];
};

export type CleanedItem = {
    title: string;
    link?: string;
    guid?: string;
    pubDate?: string;
    description?: string;
    imageUrl?: string;
    /** Shown in Dakboard timestamp line (e.g. "BBC News • 2 hours ago"). */
    source?: string;
};

export { formatPubDate } from './dates';

type RssItem = Parser.Item & CustomItem;

function paragraphCount(html: string): number {
    return (html.match(/<p[\s>]/gi) ?? []).length;
}

/**
 * WTOP/WordPress put a short teaser in &lt;description&gt; (rss-parser `content`)
 * and the full article in content:encoded. Prefer the richer body unless
 * dropFullContent asks for lead-only RSS output.
 */
function resolveItemHtmlBody(item: RssItem, options: CleanOptions): string | undefined {
    const encoded =
        typeof item.contentEncoded === 'string'
            ? item.contentEncoded
            : typeof item['content:encoded'] === 'string'
              ? item['content:encoded']
              : undefined;
    const content = typeof item.content === 'string' ? item.content : undefined;
    const summary = typeof item.summary === 'string' ? item.summary : undefined;

    if (options.dropFullContent && options.maxParagraphs <= 1) {
        return content ?? summary ?? encoded;
    }

    const candidates = [encoded, content, summary].filter((v): v is string => Boolean(v));
    if (candidates.length === 0) return undefined;

    return candidates.reduce((best, cur) => {
        const curParas = paragraphCount(cur);
        const bestParas = paragraphCount(best);
        if (curParas !== bestParas) return curParas > bestParas ? cur : best;
        return cur.length > best.length ? cur : best;
    });
}

function filterFeedItems(
    items: CleanedItem[],
    englishOnly: boolean,
    excludeSports = false,
): CleanedItem[] {
    return items.filter(item => {
        if (isLowValueStory(item.title, item.description, item.link)) return false;
        if (excludeSports && isSportsArticle(item.link)) return false;
        if (!englishOnly) return true;
        const sample = `${item.title} ${item.description ?? ''}`;
        return isLikelyEnglish(sample);
    });
}

export async function fetchAndCleanFeed(
    feedUrl: string,
    options: CleanOptions,
    sourceName?: string,
    englishOnly = false,
    excludeSports = false,
): Promise<CleanedFeed> {
    const dropSports = excludeSports || options.excludeSports === true;

    if (isNewsBreakFeedUrl(feedUrl)) {
        const feed = await fetchAndCleanNewsBreakFeed(feedUrl, options, sourceName);
        return { ...feed, items: filterFeedItems(feed.items, englishOnly, dropSports) };
    }

    const parsed = await parser.parseURL(feedUrl);

    const items: CleanedItem[] = (parsed.items ?? [])
        .filter(item => !dropSports || !isSportsArticle(item.link, item.categories))
        .map(item => {
        const htmlBody = resolveItemHtmlBody(item, options);
        const plainSnippet = item.contentSnippet;

        const description =
            options.maxParagraphs > 1
                ? (extractArticleText(
                      typeof htmlBody === 'string' ? htmlBody : undefined,
                      options
                  ) ??
                  extractLeadText(htmlBody ?? plainSnippet, options) ??
                  extractLeadText(plainSnippet, options))
                : options.dropFullContent
                  ? (extractLeadText(htmlBody ?? plainSnippet, options) ??
                    extractLeadText(plainSnippet, options))
                  : extractLeadText(htmlBody ?? plainSnippet, options);

        const articleLink = cleanUrl(item.link, options.removeTrackingParams);
        const imageFromHtml = extractFirstImageUrl(typeof htmlBody === 'string' ? htmlBody : undefined);
        const enclosureUrl = item.enclosure?.url;
        const enclosureIsImage = !item.enclosure?.type || item.enclosure.type.startsWith('image');
        const imageUrl = options.includeImages
            ? cleanUrl(imageFromHtml ?? (enclosureIsImage ? enclosureUrl : undefined), options.removeTrackingParams)
            : undefined;

        const cleaned: CleanedItem = {
            title: cleanText(item.title ?? 'Untitled', {
                ...options,
                maxDescriptionLength: 1000
            })!,
            link: options.includeItemLinks ? articleLink : undefined,
            guid:
                cleanUrl(item.guid, options.removeTrackingParams) ??
                articleLink ??
                `${item.title ?? 'item'}-${item.pubDate ?? item.isoDate ?? ''}`,
            pubDate: formatPubDate(item.pubDate ?? item.isoDate),
            description,
            imageUrl,
            source: sourceName
        };

        if (!options.dropAuthors) {
            const author = item.creator ?? item.author;
            if (author) {
                (cleaned as CleanedItem & { author?: string }).author = cleanText(author, options);
            }
        }

        return cleaned;
    });

    return {
        title: parsed.title ?? 'Cleaned feed',
        link: cleanUrl(parsed.link, options.removeTrackingParams),
        description: cleanText(parsed.description, options),
        items: filterFeedItems(items, englishOnly, dropSports),
    };
}

export function buildRssXml(feed: CleanedFeed, selfLink: string): string {
    const channelLink = feed.link ?? selfLink;
    const itemsXml = feed.items
        .map(item => {
            const link = item.link;
            const guid = item.guid ?? link;
            const parts = ['    <item>', `      <title>${escapeXml(item.title)}</title>`];
            if (link) {
                parts.push(`      <link>${escapeXml(link)}</link>`);
            }
            if (guid) {
                const isPermaLink = link && guid === link ? 'true' : 'false';
                parts.push(`      <guid isPermaLink="${isPermaLink}">${escapeXml(guid)}</guid>`);
            }
            if (item.pubDate) {
                parts.push(`      <pubDate>${escapeXml(item.pubDate)}</pubDate>`);
            }
            if (item.source) {
                parts.push(`      <dc:creator>${escapeXml(item.source)}</dc:creator>`);
            }
            if (item.description) {
                parts.push(`      <description>${escapeXml(item.description)}</description>`);
            }
            if (item.imageUrl) {
                parts.push(`      <enclosure url="${escapeXml(item.imageUrl)}" type="image/jpeg" length="0" />`);
            }
            parts.push('    </item>');
            return parts.join('\n');
        })
        .join('\n');

    const descriptionBlock = feed.description ? `    <description>${escapeXml(feed.description)}</description>\n` : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(channelLink)}</link>
${descriptionBlock}    <atom:link href="${escapeXml(selfLink)}" rel="self" type="application/rss+xml" />
    <generator>best-news-rss</generator>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>
`;
}
