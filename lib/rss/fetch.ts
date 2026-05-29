import Parser from "rss-parser";
import {
  fetchAndCleanNewsBreakFeed,
  isNewsBreakFeedUrl,
} from "../newsbreak/fetch";
import type { CleanOptions } from "../types";
import {
  cleanText,
  cleanUrl,
  escapeXml,
  extractFirstImageUrl,
  extractLeadText,
} from "./clean";
import { formatPubDate } from "./dates";

type CustomItem = {
  "content:encoded"?: string;
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
      ["content:encoded", "contentEncoded"],
      ["dc:creator", "creator"],
    ],
  },
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

export { formatPubDate } from "./dates";

export async function fetchAndCleanFeed(
  feedUrl: string,
  options: CleanOptions,
  sourceName?: string,
): Promise<CleanedFeed> {
  if (isNewsBreakFeedUrl(feedUrl)) {
    return fetchAndCleanNewsBreakFeed(feedUrl, options, sourceName);
  }

  const parsed = await parser.parseURL(feedUrl);

  const items: CleanedItem[] = (parsed.items ?? []).map((item) => {
    const htmlBody =
      item.content ??
      item.contentEncoded ??
      item["content:encoded"] ??
      item.summary;
    const plainSnippet = item.contentSnippet;

    const description = options.dropFullContent
      ? extractLeadText(htmlBody ?? plainSnippet, options) ??
        extractLeadText(plainSnippet, options)
      : extractLeadText(htmlBody ?? plainSnippet, options);

    const articleLink = cleanUrl(item.link, options.removeTrackingParams);
    const imageFromHtml = extractFirstImageUrl(
      typeof htmlBody === "string" ? htmlBody : undefined,
    );
    const enclosureUrl = item.enclosure?.url;
    const enclosureIsImage =
      !item.enclosure?.type || item.enclosure.type.startsWith("image");
    const imageUrl = options.includeImages
      ? cleanUrl(
          imageFromHtml ??
            (enclosureIsImage ? enclosureUrl : undefined),
          options.removeTrackingParams,
        )
      : undefined;

    const cleaned: CleanedItem = {
      title: cleanText(item.title ?? "Untitled", {
        ...options,
        maxDescriptionLength: 500,
      })!,
      link: options.includeItemLinks ? articleLink : undefined,
      guid:
        cleanUrl(item.guid, options.removeTrackingParams) ??
        articleLink ??
        `${item.title ?? "item"}-${item.pubDate ?? item.isoDate ?? ""}`,
      pubDate: formatPubDate(item.pubDate ?? item.isoDate),
      description,
      imageUrl,
      source: sourceName,
    };

    if (!options.dropAuthors) {
      const author = item.creator ?? item.author;
      if (author) {
        (cleaned as CleanedItem & { author?: string }).author = cleanText(
          author,
          options,
        );
      }
    }

    return cleaned;
  });

  return {
    title: parsed.title ?? "Cleaned feed",
    link: cleanUrl(parsed.link, options.removeTrackingParams),
    description: cleanText(parsed.description, options),
    items,
  };
}

export function buildRssXml(
  feed: CleanedFeed,
  selfLink: string,
): string {
  const channelLink = feed.link ?? selfLink;
  const itemsXml = feed.items
    .map((item) => {
      const link = item.link;
      const guid = item.guid ?? link;
      const parts = [
        "    <item>",
        `      <title>${escapeXml(item.title)}</title>`,
      ];
      if (link) {
        parts.push(`      <link>${escapeXml(link)}</link>`);
      }
      if (guid) {
        const isPermaLink = link && guid === link ? "true" : "false";
        parts.push(
          `      <guid isPermaLink="${isPermaLink}">${escapeXml(guid)}</guid>`,
        );
      }
      if (item.pubDate) {
        parts.push(`      <pubDate>${escapeXml(item.pubDate)}</pubDate>`);
      }
      if (item.source) {
        parts.push(
          `      <dc:creator>${escapeXml(item.source)}</dc:creator>`,
        );
      }
      if (item.description) {
        parts.push(
          `      <description>${escapeXml(item.description)}</description>`,
        );
      }
      if (item.imageUrl) {
        parts.push(
          `      <enclosure url="${escapeXml(item.imageUrl)}" type="image/jpeg" length="0" />`,
        );
      }
      parts.push("    </item>");
      return parts.join("\n");
    })
    .join("\n");

  const descriptionBlock = feed.description
    ? `    <description>${escapeXml(feed.description)}</description>\n`
    : "";

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
