import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CATECHISM_COUNT } from "@/lib/display/catechism";
import { DEFAULT_DOCTRINE_COUNT } from "@/lib/display/doctrine";
import { getDisplayStories } from "@/lib/display/items";
import { DEFAULT_VOTD_COPIES } from "@/lib/display/votd";

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
  const countRaw = Number(request.nextUrl.searchParams.get("catechismCount"));
  const catechismCount =
    Number.isFinite(countRaw) && countRaw >= 1
      ? Math.min(114, Math.floor(countRaw))
      : DEFAULT_CATECHISM_COUNT;
  const includeDoctrine = flag(request.nextUrl.searchParams.get("doctrine"));
  const doctrineRaw = Number(request.nextUrl.searchParams.get("doctrineCount"));
  const doctrineCount =
    Number.isFinite(doctrineRaw) && doctrineRaw >= 1
      ? Math.min(260, Math.floor(doctrineRaw))
      : DEFAULT_DOCTRINE_COUNT;
  const includeVotd = flag(request.nextUrl.searchParams.get("votd"));
  const votdRaw = Number(request.nextUrl.searchParams.get("votdCount"));
  const votdCount =
    Number.isFinite(votdRaw) && votdRaw >= 1
      ? Math.min(10, Math.floor(votdRaw))
      : DEFAULT_VOTD_COPIES;

  try {
    const stories = await getDisplayStories(maxItems, {
      includeImages,
      includeCatechism,
      catechismEvery,
      catechismCount,
      includeDoctrine,
      doctrineCount,
      includeVotd,
      votdCount,
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
