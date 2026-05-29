import { NextRequest } from "next/server";
import { loadFeeds } from "@/lib/feeds-store";
import { rssError, serveCleanedRss } from "@/lib/rss/serve";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Alias of /rss/[id] for API clients. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const feeds = await loadFeeds();
  const source = feeds.find((f) => f.id === id);

  if (!source) {
    return rssError("Feed not found.", 404);
  }

  try {
    return await serveCleanedRss(
      source.url,
      source.name,
      request.nextUrl.href,
      request.nextUrl.searchParams,
      source.name,
      undefined,
      source.englishOnly ?? false,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch or parse feed.";
    return rssError(message, 502);
  }
}
