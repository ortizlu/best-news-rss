const USER_AGENT =
  "Mozilla/5.0 (compatible; best-news-rss/1.0; +https://vercel.com)";

const OG_IMAGE_PATTERNS = [
  /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:secure_url["']/i,
  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
];

export function parseOgImageFromHtml(
  html: string,
  pageUrl: string,
): string | undefined {
  const head = html.slice(0, 200_000);
  for (const pattern of OG_IMAGE_PATTERNS) {
    const match = head.match(pattern);
    if (!match?.[1]) continue;
    try {
      const resolved = new URL(match[1].trim(), pageUrl).toString();
      if (resolved.startsWith("http")) return resolved;
    } catch {
      continue;
    }
  }
  return undefined;
}

/** Article hero image from Open Graph / Twitter meta tags. */
export async function fetchOgImage(
  articleUrl: string,
): Promise<string | undefined> {
  try {
    const res = await fetch(articleUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
      next: { revalidate: 3600 },
    });
    if (!res.ok) return undefined;
    const html = await res.text();
    return parseOgImageFromHtml(html, res.url || articleUrl);
  } catch {
    return undefined;
  }
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  }
  const n = Math.min(concurrency, items.length);
  if (n === 0) return;
  await Promise.all(Array.from({ length: n }, () => run()));
}

/** Fill missing imageUrl from each story's article link (og:image). */
export async function enrichStoriesWithOgImages<
  T extends { link?: string; imageUrl?: string },
>(stories: T[], concurrency = 6): Promise<T[]> {
  const out = stories.map((s) => ({ ...s }));
  const needsOg = out.filter((s) => !s.imageUrl && s.link);

  await runPool(needsOg, concurrency, async (story) => {
    const og = await fetchOgImage(story.link!);
    if (og) story.imageUrl = og;
  });

  return out;
}
