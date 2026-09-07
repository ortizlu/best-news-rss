/** NewsBreak slugs ending in -va should cover NOVA / DC / Maryland — not Texas, etc. */
const VA_SLUG = /-va$/i;

const VA_METRO =
  /\b(?:virginia|maryland|district of columbia|washington, d\.?c\.?)\b/i;

const OUT_OF_VA_METRO =
  /\b(?:texas|tarrant county|fort worth|dallas(?:,|\b)|grand prairie|duncanville|crowley|irving|hurst|euless|bedford|grapevine|colleyville|north richland hills)\b/i;

export function isNewsBreakItemInRegion(
  slug: string,
  cityName?: string,
): boolean {
  if (!VA_SLUG.test(slug)) return true;
  if (!cityName?.trim()) return true;

  const city = cityName.trim().toLowerCase();
  if (OUT_OF_VA_METRO.test(city)) return false;
  if (VA_METRO.test(city)) return true;

  // Explicit non-local state suffix (e.g. "Greenville County, South Carolina").
  const stateSuffix = city.match(/,\s*([a-z .]+)$/);
  if (stateSuffix && !VA_METRO.test(stateSuffix[1])) return false;

  return true;
}
