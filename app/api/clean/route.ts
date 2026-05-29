import { NextRequest } from "next/server";
import { rssError, serveCleanedRss } from "@/lib/rss/serve";

export const runtime = "nodejs";

/** Alias of /rss?url=… for API clients. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url");

  if (!url) {
    return rssError("Missing url query parameter (RSS feed URL).", 400);
  }

  try {
    new URL(url);
  } catch {
    return rssError("Invalid feed URL.", 400);
  }

  try {
    return await serveCleanedRss(
      url,
      "Cleaned feed",
      request.nextUrl.href,
      searchParams,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch or parse feed.";
    return rssError(message, 502);
  }
}
