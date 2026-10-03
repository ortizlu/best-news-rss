import type { DisplayStory } from "./items";

/** Stable identity for rotation tracking (link when present). */
export function storyKey(story: DisplayStory): string {
  if (story.link) return story.link;
  return `${story.source ?? ""}|${story.title}`;
}

function dedupeByKey(stories: DisplayStory[]): DisplayStory[] {
  const seen = new Set<string>();
  const out: DisplayStory[] = [];
  for (const story of stories) {
    const key = storyKey(story);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(story);
  }
  return out;
}

/**
 * After a soft refresh: play unseen stories first, then already-shown ones,
 * and keep the active slide if it is still in the new pool.
 */
export function mergeStoriesForRotation(
  incoming: DisplayStory[],
  shown: ReadonlySet<string>,
  activeKey?: string,
): { stories: DisplayStory[]; index: number; shown: Set<string> } {
  const unique = dedupeByKey(incoming);
  if (unique.length === 0) {
    return { stories: [], index: 0, shown: new Set() };
  }

  const incomingKeys = new Set(unique.map(storyKey));
  const nextShown = new Set([...shown].filter((k) => incomingKeys.has(k)));

  const unseen = unique.filter((s) => !nextShown.has(storyKey(s)));
  const already = unique.filter((s) => nextShown.has(storyKey(s)));

  // Full cycle already done for this pool — start fresh order from the API.
  if (unseen.length === 0) {
    const index = activeKey
      ? Math.max(
          0,
          unique.findIndex((s) => storyKey(s) === activeKey),
        )
      : 0;
    const freshShown = new Set<string>();
    if (activeKey && incomingKeys.has(activeKey)) freshShown.add(activeKey);
    return { stories: unique, index, shown: freshShown };
  }

  const stories = [...unseen, ...already];
  let index = 0;
  if (activeKey) {
    const at = stories.findIndex((s) => storyKey(s) === activeKey);
    if (at >= 0) index = at;
  }

  return { stories, index, shown: nextShown };
}
