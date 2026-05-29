import { NextResponse } from "next/server";
import { z } from "zod";
import { loadFeeds, saveFeeds, slugify } from "@/lib/feeds-store";
import type { FeedSource } from "@/lib/types";

const feedSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().url(),
});

export async function GET() {
  const feeds = await loadFeeds();
  return NextResponse.json({ feeds });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = feedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid feed. Provide a name and valid RSS URL." },
      { status: 400 },
    );
  }

  const feeds = await loadFeeds();
  const baseId = slugify(parsed.data.name) || "feed";
  let id = baseId;
  let n = 1;
  while (feeds.some((f) => f.id === id)) {
    id = `${baseId}-${n++}`;
  }

  const entry: FeedSource = {
    id,
    name: parsed.data.name.trim(),
    url: parsed.data.url.trim(),
  };

  try {
    await saveFeeds([...feeds, entry]);
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not save feeds on this host. Add feeds to data/feeds.json in your repo, or run locally.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ feed: entry }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing feed id." }, { status: 400 });
  }

  const feeds = await loadFeeds();
  const next = feeds.filter((f) => f.id !== id);
  if (next.length === feeds.length) {
    return NextResponse.json({ error: "Feed not found." }, { status: 404 });
  }

  try {
    await saveFeeds(next);
  } catch {
    return NextResponse.json(
      { error: "Could not update feeds on this host." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
