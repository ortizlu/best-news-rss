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
  searchParams: Promise<{
    seconds?: string;
    progress?: string;
    photos?: string;
    transparent?: string;
  }>;
};

function flag(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

function photosEnabled(value: string | undefined): boolean {
  return value !== "0" && value !== "false";
}

export default async function DisplayPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const parsed = Number(params.seconds);
  const intervalSeconds =
    Number.isFinite(parsed) && parsed >= 5 && parsed <= 120 ? parsed : 14;
  const showProgress = flag(params.progress);
  const showPhotos = photosEnabled(params.photos);
  const transparent = flag(params.transparent);

  const stories = await getDisplayStories(30, { includeImages: showPhotos });

  return (
    <DisplayPlayer
      stories={stories}
      intervalSeconds={intervalSeconds}
      showProgress={showProgress}
      showPhotos={showPhotos}
      transparent={transparent}
    />
  );
}
