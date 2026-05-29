import { NextRequest } from "next/server";
import { rssError, serveMergedRss } from "@/lib/rss/serve";

export const runtime = "nodejs";

/** All saved feeds merged into one RSS stream — use this URL in Dakboard. */
export async function GET(request: NextRequest) {
  try {
    return await serveMergedRss(
      request.nextUrl.href,
      request.nextUrl.searchParams,
      { includeItemLinks: false, includeImages: false },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to build merged feed.";
    return rssError(message, 502);
  }
}
