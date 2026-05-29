import { NextResponse } from "next/server";
import { loadFeeds } from "../feeds-store";
import type { CleanOptions } from "../types";
import { resolveCleanOptions } from "./clean";
import { buildRssXml, fetchAndCleanFeed } from "./fetch";
import { fetchAndMergeFeeds } from "./merge";

export const RSS_HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
} as const;

export function rssResponse(xml: string): NextResponse {
  return new NextResponse(xml, { headers: RSS_HEADERS });
}

export async function serveCleanedRss(
  sourceUrl: string,
  channelTitle: string,
  selfLink: string,
  searchParams: URLSearchParams,
  sourceName?: string,
  presets?: Partial<CleanOptions>,
): Promise<NextResponse> {
  const options = resolveCleanOptions(searchParams, presets);
  const cleaned = await fetchAndCleanFeed(
    sourceUrl,
    options,
    sourceName ?? channelTitle,
  );
  const xml = buildRssXml({ ...cleaned, title: channelTitle }, selfLink);
  return rssResponse(xml);
}

export async function serveMergedRss(
  selfLink: string,
  searchParams: URLSearchParams,
  presets?: Partial<CleanOptions>,
): Promise<NextResponse> {
  const feeds = await loadFeeds();
  if (feeds.length === 0) {
    return rssError("No feeds configured in data/feeds.json.", 404);
  }

  const max = Number(searchParams.get("maxItems"));
  const maxItems = Number.isFinite(max) && max > 0 ? Math.min(max, 100) : 50;

  const options = resolveCleanOptions(searchParams, presets);
  const merged = await fetchAndMergeFeeds(feeds, options, maxItems);
  const xml = buildRssXml(merged, selfLink);
  return rssResponse(xml);
}

export function rssError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
