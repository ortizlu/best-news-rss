import { NextRequest } from "next/server";
import { rssError, serveMergedRss } from "@/lib/rss/serve";

export const runtime = "nodejs";

/** Merged feed with article links and lead images (for readers that use them). */
export async function GET(request: NextRequest) {
  try {
    return await serveMergedRss(
      request.nextUrl.href,
      request.nextUrl.searchParams,
      { includeItemLinks: true, includeImages: true },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to build merged feed.";
    return rssError(message, 502);
  }
}
