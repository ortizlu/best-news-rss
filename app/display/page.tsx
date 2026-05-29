import type { Metadata } from "next";
import { getDisplayStories } from "@/lib/display/items";
import DisplayPlayer from "./DisplayPlayer";

export const metadata: Metadata = {
  title: "News display — Best News RSS",
  description: "Rotating headlines with background images for Dakboard iframe blocks.",
};

export const dynamic = "force-dynamic";
export const revalidate = 300;

type PageProps = {
  searchParams: Promise<{ seconds?: string }>;
};

export default async function DisplayPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const parsed = Number(params.seconds);
  const intervalSeconds =
    Number.isFinite(parsed) && parsed >= 5 && parsed <= 120 ? parsed : 14;

  const stories = await getDisplayStories(30);

  return <DisplayPlayer stories={stories} intervalSeconds={intervalSeconds} />;
}
