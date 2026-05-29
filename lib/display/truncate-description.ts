const ELLIPSIS = "…";

function lineHeight(el: HTMLElement): number {
  const lh = parseFloat(getComputedStyle(el).lineHeight);
  if (Number.isFinite(lh) && lh > 0) return lh;
  return parseFloat(getComputedStyle(el).fontSize) * 1.18;
}

function marginBottom(el: HTMLElement): number {
  return parseFloat(getComputedStyle(el).marginBottom) || 0;
}

/** Vertical space for description from the fixed widget container (not the text stack). */
export function availableDescriptionHeight(
  container: HTMLElement,
  meta: HTMLElement | null,
  title: HTMLElement | null,
): number {
  let used = 0;
  if (meta) used += meta.offsetHeight + marginBottom(meta);
  if (title) used += title.offsetHeight + marginBottom(title);
  return Math.max(0, container.clientHeight - used);
}

function caretAt(el: HTMLElement, x: number, y: number): Range | null {
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    if (range && el.contains(range.startContainer)) return range;
    return null;
  }
  const pos = (
    document as Document & {
      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => { offsetNode: Node; offset: number } | null;
    }
  ).caretPositionFromPoint?.(x, y);
  if (!pos || !el.contains(pos.offsetNode)) return null;
  const range = document.createRange();
  range.setStart(pos.offsetNode, pos.offset);
  range.collapse(true);
  return range;
}

/** True when the last visible line is clipped at the bottom edge. */
export function lastVisibleLineIsPartial(el: HTMLElement): boolean {
  if (el.scrollHeight <= el.clientHeight + 2) return false;

  const rect = el.getBoundingClientRect();
  if (rect.height < 4) return false;

  const lh = lineHeight(el);
  const y = rect.bottom - Math.min(lh * 0.35, 8);
  const range = caretAt(el, rect.left + Math.min(24, rect.width / 3), y);
  if (!range) return true;

  const line = document.createRange();
  try {
    line.setStart(range.startContainer, range.startOffset);
    line.setEnd(range.startContainer, range.startOffset);
  } catch {
    return true;
  }

  const boxes = line.getClientRects();
  const box = boxes.length > 0 ? boxes[boxes.length - 1] : line.getBoundingClientRect();
  return box.bottom > rect.bottom + 1;
}

function fitsInBox(el: HTMLElement, text: string): boolean {
  el.textContent = text;
  return el.scrollHeight <= el.clientHeight + 2;
}

function trimWordBoundary(text: string): string {
  const t = text.trimEnd();
  const lastSpace = t.lastIndexOf(" ");
  if (lastSpace > t.length * 0.6) return t.slice(0, lastSpace).trimEnd();
  return t;
}

function applyMeasureHeight(
  desc: HTMLElement,
  available: number,
): void {
  if (available > 0) {
    desc.style.maxHeight = `${available}px`;
  } else {
    desc.style.removeProperty("max-height");
  }
}

/** Longest prefix that fits without a partial bottom line. */
function truncateToCleanEnd(el: HTMLElement, fullText: string): string {
  let lo = 0;
  let hi = fullText.length;
  let best = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    el.textContent = fullText.slice(0, mid);
    const fits = el.scrollHeight <= el.clientHeight + 2;
    const partial = fits && lastVisibleLineIsPartial(el);

    if (fits && !partial) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (best >= fullText.length) return fullText;
  if (best === 0) return "";
  return fullText.slice(0, best).trimEnd();
}

/** Prefix + ellipsis when the next line would be partial. */
function truncateWithEllipsis(el: HTMLElement, fullText: string): string {
  let lo = 0;
  let hi = fullText.length;
  let best = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = trimWordBoundary(fullText.slice(0, mid)) + ELLIPSIS;
    if (fitsInBox(el, candidate)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (best > 0) {
    return trimWordBoundary(fullText.slice(0, best)) + ELLIPSIS;
  }

  // Tight box: fit as many characters as possible before the ellipsis.
  lo = 1;
  hi = fullText.length;
  best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fitsInBox(el, fullText.slice(0, mid) + ELLIPSIS)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (best > 0) return fullText.slice(0, best).trimEnd() + ELLIPSIS;
  return fitsInBox(el, fullText) ? fullText : fullText.slice(0, 120).trimEnd() + ELLIPSIS;
}

/**
 * Fit description to the widget: ellipsis only when overflow would leave a
 * clipped line at the bottom. Clean paragraph endings keep no ellipsis.
 */
export function fitDescriptionText(
  container: HTMLElement,
  meta: HTMLElement | null,
  title: HTMLElement | null,
  desc: HTMLElement,
  fullText: string,
): string {
  const available = availableDescriptionHeight(container, meta, title);
  applyMeasureHeight(desc, available);

  desc.textContent = fullText;
  if (desc.scrollHeight <= desc.clientHeight + 2) {
    return fullText;
  }

  if (!lastVisibleLineIsPartial(desc)) {
    const clean = truncateToCleanEnd(desc, fullText);
    return clean || truncateWithEllipsis(desc, fullText);
  }

  return truncateWithEllipsis(desc, fullText);
}
