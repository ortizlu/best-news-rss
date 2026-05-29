const SPORTS_PATH =
  /\/(?:sports?|sporting|athletics|nfl|nba|mlb|nhl|mls|soccer|football|basketball|baseball|hockey|tennis|golf|racing|olympics|cfb|ncaa)(?:\/|$)/i;

const SPORTS_CATEGORY = /\bsports?\b/i;

function normalizeCategories(categories: unknown): string[] {
  if (!categories) return [];
  const list = Array.isArray(categories) ? categories : [categories];
  return list.map(String);
}

/** True when the item is sports-section copy (URL path or RSS category). */
export function isSportsArticle(
  link?: string,
  categories?: string[] | string,
): boolean {
  for (const category of normalizeCategories(categories)) {
    if (SPORTS_CATEGORY.test(category)) return true;
  }

  if (!link) return false;

  try {
    return SPORTS_PATH.test(new URL(link).pathname);
  } catch {
    return /\b(?:\/sports?\/|sports\.)/i.test(link);
  }
}
