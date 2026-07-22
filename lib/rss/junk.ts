/** Titles that are data tables, not news stories (common on WTOP). */
const JUNK_TITLE =
  /^(?:sports\s+)?betting\s+line$|^lottery(?:\s+numbers)?$|^stock\s+quotes?$|^wholesale\s+cash\s+prices$|^cash\s+prices$/i;

const WEEKDAY =
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;
const WEEKDAY_WORD =
  /^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i;

const BETTING_ODDS_GRID =
  /\bFAVORITE\s+LINE\b[\s\S]{0,400}\bUNDERDOG\s+LINE\b/i;

const MONEYLINE_ROW =
  /\b(?:MLB|NFL|NBA|NHL|NCAA)\b.{0,40}\b[+-]\d{2,4}\b.{0,80}\bat\s+[A-Z]{2,}/i;

/** Sportsbook promos syndicated as “articles”. */
const SPORTSBOOK_TITLE =
  /\b(?:betmgm|draftkings|fanduel|caesars|fanatics|bet365|espn\s+bet)\b|\bbonus\s+code\b|\bpromo\s+code\b/i;

const SPORTSBOOK_BODY =
  /\bbonus\s+code\b|\bfirst\s+bet\s+offer\b|\bbet\s+\$?\d+[\s,]*get\s+\$?\d+/i;

/** Scoreboard / results roundups (French Open Results, etc.). */
const RESULTS_TITLE = /\bresults$/i;

const TENNIS_RESULT_LINE =
  /^[^\n]{0,120}\bdef\.\s+[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+)?,/gimu;

const SET_SCORE = /\d-\d\s*\(\d+\)/;

/** Local news daily recap roundups (ALXnow, etc.). */
const DAILY_DEBRIEF_TITLE = /\bdaily\s+debrief\b/i;

/** Individual lottery draw result posts (WTOP syndication). */
const LOTTERY_DRAW_TITLE = /\bwinning\s+numbers\s+drawn\s+in\b/i;

/** Tennis tournament scoreboard roundups (French Open, etc.). */
const FRENCH_OPEN_TITLE = /\bfrench\s+open\b/i;

/** AP/Zacks automated earnings blurbs syndicated as news. */
const EARNINGS_SNAPSHOT_TITLE =
  /\b(?:earnings|revenue)\s+snapshot\b|\bfiscal\s+q[1-4]\s+earnings\b/i;

/** AP and others publish image-only galleries with little or no article text. */
const PHOTO_GALLERY_URL = /\/photo-gallery(?:\/|$)/i;
const PHOTO_GALLERY_TITLE = /\bin photos\b/i;

const AUTOMATED_FINANCE_BODY =
  /\b(?:generated|produced)\s+by\s+automated\s+insights\b|\bautomatedinsights\.com\b|\bzacks\s+investment\s+research\b|\baccess\s+a\s+zacks\s+stock\s+report\b/i;

function countMatches(text: string, re: RegExp): number {
  return [...text.matchAll(re)].length;
}

function normalizeBlurb(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** One-line market/data rows where the body just repeats the title (+ weekday). */
function isRedundantDataBlurb(title: string, description?: string): boolean {
  const body = description?.trim() ?? "";
  if (!body || body.length > 100) return false;

  const words = body.split(/\s+/);
  if (words.length > 8) return false;

  const t = normalizeBlurb(title);
  const b = normalizeBlurb(body);
  if (!t || t.length < 4) return false;

  const bWithoutDay = b.replace(WEEKDAY, "").replace(/\s+/g, " ").trim();
  if (bWithoutDay === t || b.startsWith(t) || t.startsWith(bWithoutDay)) {
    return true;
  }

  const titleWords = new Set(t.split(" ").filter(Boolean));
  const bodyWords = b
    .split(" ")
    .filter((w) => w && !WEEKDAY_WORD.test(w));
  return (
    bodyWords.length >= 2 && bodyWords.every((word) => titleWords.has(word))
  );
}

export function hasStoryBody(description?: string): boolean {
  return Boolean(description?.trim());
}

/**
 * Drop syndicated filler (betting lines, odds grids, sportsbook ads, score lists)
 * that some feeds mix into their main RSS stream.
 */
export function isLowValueStory(
  title: string,
  description?: string,
  link?: string,
): boolean {
  const t = title.trim();
  if (!t) return true;

  if (!hasStoryBody(description)) return true;

  if (link && PHOTO_GALLERY_URL.test(link)) return true;
  if (PHOTO_GALLERY_TITLE.test(t)) return true;

  if (JUNK_TITLE.test(t)) return true;
  if (isRedundantDataBlurb(t, description)) return true;

  const combined = `${t}\n${description ?? ""}`;
  const body = description ?? "";

  if (BETTING_ODDS_GRID.test(body)) return true;
  if (MONEYLINE_ROW.test(combined)) return true;
  if (/\bBetting\s+Line$/i.test(t) && /[+-]\d{3}\b/.test(body)) return true;

  if (SPORTSBOOK_TITLE.test(t)) return true;
  if (SPORTSBOOK_BODY.test(combined)) return true;

  if (RESULTS_TITLE.test(t)) {
    if (countMatches(body, TENNIS_RESULT_LINE) >= 2) return true;
    if (SET_SCORE.test(body) && countMatches(body, TENNIS_RESULT_LINE) >= 1) return true;
  }

  // Pure scoreboard copy with no narrative hook.
  if (countMatches(body, TENNIS_RESULT_LINE) >= 3) return true;

  if (DAILY_DEBRIEF_TITLE.test(t)) return true;
  if (LOTTERY_DRAW_TITLE.test(t)) return true;
  if (FRENCH_OPEN_TITLE.test(t)) return true;

  if (EARNINGS_SNAPSHOT_TITLE.test(t)) return true;
  if (AUTOMATED_FINANCE_BODY.test(combined)) return true;

  return false;
}
