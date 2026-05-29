import type { CleanOptions } from '../types';
import type { CleanedFeed, CleanedItem } from '../rss/fetch';
import { formatPubDate } from '../rss/dates';
import { cleanText, extractLeadText } from '../rss/clean';
import { isLowValueStory } from '../rss/junk';
import { isSportsArticle } from '../rss/sports';

type NewsBreakFeedItem = {
    docid: string;
    title?: string;
    summary?: string;
    date?: string;
    source?: string;
    city_name?: string;
};

type NewsBreakPageProps = {
    id?: string;
    title?: string;
    feed?: NewsBreakFeedItem[];
};

const USER_AGENT = 'Mozilla/5.0 (compatible; best-news-rss/1.0; +https://github.com/)';

export function isNewsBreakFeedUrl(url: string): boolean {
    try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        return host === 'newsbreak.com';
    } catch {
        return false;
    }
}

export function newsBreakLocationSlug(url: string): string {
    const pathname = new URL(url).pathname.replace(/^\/|\/$/g, '');
    return pathname || 'groveton-va';
}

function parseNextData(html: string): NewsBreakPageProps | null {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match?.[1]) return null;
    try {
        const data = JSON.parse(match[1]) as {
            props?: { pageProps?: NewsBreakPageProps };
        };
        return data.props?.pageProps ?? null;
    } catch {
        return null;
    }
}

export async function fetchAndCleanNewsBreakFeed(
    pageUrl: string,
    options: CleanOptions,
    sourceName?: string
): Promise<CleanedFeed> {
    const slug = newsBreakLocationSlug(pageUrl);
    const fetchUrl = `https://www.newsbreak.com/${slug}`;

    const res = await fetch(fetchUrl, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        next: { revalidate: 300 }
    });

    if (!res.ok) {
        throw new Error(`NewsBreak returned ${res.status} for ${fetchUrl}`);
    }

    const html = await res.text();
    const page = parseNextData(html);
    if (!page?.feed?.length) {
        throw new Error(`No feed data found on NewsBreak page: ${fetchUrl}`);
    }

    const channelTitle = sourceName ?? page.title ?? `NewsBreak · ${slug.replace(/-/g, ' ')}`;

    const dropSports = options.excludeSports === true;

    const items: CleanedItem[] = page.feed
        .filter(item => item.title && item.docid)
        .map(item => {
            const description = extractLeadText(item.summary, options);
            const publisher = item.source?.trim();

            return {
                title: cleanText(item.title, {
                    ...options,
                    maxDescriptionLength: 1000
                })!,
                link: options.includeItemLinks ? `https://www.newsbreak.com/n/${item.docid}` : undefined,
                guid: item.docid,
                pubDate: formatPubDate(item.date?.replace(' ', 'T') + 'Z'),
                description,
                source: publisher || channelTitle
            };
        })
        .filter(item => !isLowValueStory(item.title, item.description))
        .filter(item => !dropSports || !isSportsArticle(item.link));

    return {
        title: channelTitle,
        link: fetchUrl,
        description: `Local headlines from NewsBreak (${slug})`,
        items
    };
}
