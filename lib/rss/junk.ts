/** Titles that are data tables, not news stories (common on WTOP). */
const JUNK_TITLE =
  /^(?:sports\s+)?betting\s+line$|^lottery(?:\s+numbers)?$|^stock\s+quotes?$/i;

const BETTING_ODDS_GRID =
  /\bFAVORITE\s+LINE\b[\s\S]{0,400}\bUNDERDOG\s+LINE\b/i;

const MONEYLINE_ROW =
  /\b(?:MLB|NFL|NBA|NHL|NCAA)\b.{0,40}\b[+-]\d{2,4}\b.{0,80}\bat\s+[A-Z]{2,}/i;

/**
 * Drop syndicated filler (betting lines, odds grids) that some feeds mix into
 * their main RSS stream.
 */
export function isLowValueStory(title: string, description?: string): boolean {
  const t = title.trim();
  if (!t) return true;

  if (JUNK_TITLE.test(t)) return true;

  const body = description ?? "";
  if (BETTING_ODDS_GRID.test(body)) return true;
  if (MONEYLINE_ROW.test(`${t} ${body}`)) return true;

  if (/\bBetting\s+Line$/i.test(t) && /[+-]\d{3}\b/.test(body)) return true;

  return false;
}
