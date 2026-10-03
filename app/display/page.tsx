import type { Metadata } from "next";
import { DEFAULT_CATECHISM_COUNT } from "@/lib/display/catechism";
import { DEFAULT_DOCTRINE_COUNT } from "@/lib/display/doctrine";
import { getDisplayStories } from "@/lib/display/items";
import { DEFAULT_VOTD_COPIES } from "@/lib/display/votd";
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
    ios?: string;
    align?: string;
    catechism?: string;
    catechismEvery?: string;
    catechismCount?: string;
    doctrine?: string;
    doctrineCount?: string;
    votd?: string;
    votdCount?: string;
  }>;
};

function flag(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

function photosEnabled(value: string | undefined): boolean {
  return value !== "0" && value !== "false";
}

function textAlign(value: string | undefined): "left" | "right" {
  return value === "right" ? "right" : "left";
}

function catechismEvery(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 4;
  return Math.min(20, Math.floor(n));
}

function parseCatechismCount(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_CATECHISM_COUNT;
  return Math.min(114, Math.floor(n));
}

function parseDoctrineCount(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_DOCTRINE_COUNT;
  return Math.min(260, Math.floor(n));
}

function parseVotdCount(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_VOTD_COPIES;
  return Math.min(10, Math.floor(n));
}

export default async function DisplayPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const parsed = Number(params.seconds);
  const intervalSeconds =
    Number.isFinite(parsed) && parsed >= 5 && parsed <= 120 ? parsed : 14;
  const showProgress = flag(params.progress);
  const showPhotos = photosEnabled(params.photos);
  const transparent = flag(params.transparent);
  const iosStyle = flag(params.ios);
  const align = textAlign(params.align);
  const includeCatechism = flag(params.catechism);
  const every = catechismEvery(params.catechismEvery);
  const count = parseCatechismCount(params.catechismCount);
  const includeDoctrine = flag(params.doctrine);
  const doctrineCopies = parseDoctrineCount(params.doctrineCount);
  const includeVotd = flag(params.votd);
  const votdCopies = parseVotdCount(params.votdCount);

  const stories = await getDisplayStories(30, {
    includeImages: showPhotos,
    includeCatechism,
    catechismEvery: every,
    catechismCount: count,
    includeDoctrine,
    doctrineCount: doctrineCopies,
    includeVotd,
    votdCount: votdCopies,
  });

  return (
    <DisplayPlayer
      stories={stories}
      intervalSeconds={intervalSeconds}
      showProgress={showProgress}
      showPhotos={showPhotos}
      transparent={transparent}
      iosStyle={iosStyle}
      textAlign={align}
      includeCatechism={includeCatechism}
      catechismEvery={every}
      catechismCount={count}
      includeDoctrine={includeDoctrine}
      doctrineCount={doctrineCopies}
      includeVotd={includeVotd}
      votdCount={votdCopies}
    />
  );
}
