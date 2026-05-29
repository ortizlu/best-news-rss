/** Visible bottom ends on a sentence boundary — no fade needed even if more copy is hidden. */
const SENTENCE_END = /[.!?…"”'\u2019\u201D]\s*$/;

function elementOverflows(el: HTMLElement): boolean {
  return el.scrollHeight > el.clientHeight + 2;
}

/** Text rendered up to the bottom edge of the element's visible box. */
function visibleTextBeforeBottom(el: HTMLElement): string | null {
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 4) return null;

  const x = rect.left + Math.min(16, rect.width / 2);
  const y = rect.bottom - 2;

  let range: Range | null = null;
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else {
    const pos = (
      document as Document & {
        caretPositionFromPoint?: (
          x: number,
          y: number,
        ) => { offsetNode: Node; offset: number } | null;
      }
    ).caretPositionFromPoint?.(x, y);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  }

  if (!range || !el.contains(range.startContainer)) return null;

  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString();
}

function visibleEndIsClean(el: HTMLElement): boolean {
  const visible = visibleTextBeforeBottom(el);
  if (visible == null) return false;
  return SENTENCE_END.test(visible.trim());
}

/**
 * Fade only when overflow cuts mid-thought. Stories that end visibly on
 * "espionage charges." but have more paragraphs below should not fade.
 */
export function needsDescriptionFade(
  stack: HTMLElement,
  description: HTMLElement | null,
): boolean {
  const descOverflow = Boolean(description && elementOverflows(description));
  const stackOverflow = elementOverflows(stack);

  if (!descOverflow && !stackOverflow) return false;

  const target = descOverflow && description ? description : stack;
  return !visibleEndIsClean(target);
}
