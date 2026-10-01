import { NextRequest, NextResponse } from "next/server";
import { getDisplayStories } from "@/lib/display/items";

export const runtime = "nodejs";
export const revalidate = 300;

function flag(value: string | null): boolean {
  return value === "1" || value === "true";
}

export async function GET(request: NextRequest) {
  const max = Number(request.nextUrl.searchParams.get("maxItems"));
  const maxItems = Number.isFinite(max) && max > 0 ? Math.min(max, 50) : 30;
  const includeImages = request.nextUrl.searchParams.get("includeImages") !== "0";
  const includeCatechism = flag(request.nextUrl.searchParams.get("catechism"));
  const everyRaw = Number(request.nextUrl.searchParams.get("catechismEvery"));
  const catechismEvery =
    Number.isFinite(everyRaw) && everyRaw >= 1
      ? Math.min(20, Math.floor(everyRaw))
      : 4;

  try {
    const stories = await getDisplayStories(maxItems, {
      includeImages,
      includeCatechism,
      catechismEvery,
    });
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
