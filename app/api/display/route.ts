import { NextRequest, NextResponse } from "next/server";
import { getDisplayStories } from "@/lib/display/items";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(request: NextRequest) {
  const max = Number(request.nextUrl.searchParams.get("maxItems"));
  const maxItems = Number.isFinite(max) && max > 0 ? Math.min(max, 50) : 30;

  try {
    const stories = await getDisplayStories(maxItems);
    return NextResponse.json(
      { stories },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load display stories.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
