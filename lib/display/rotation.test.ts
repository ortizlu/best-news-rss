import { describe, expect, it } from "vitest";
import { mergeStoriesForRotation, storyKey } from "./rotation";
import type { DisplayStory } from "./items";

function story(title: string, link?: string): DisplayStory {
  return { title, link, description: title };
}

describe("storyKey", () => {
  it("prefers link", () => {
    expect(storyKey(story("A", "https://example.com/a"))).toBe(
      "https://example.com/a",
    );
  });

  it("falls back to source|title", () => {
    expect(
      storyKey({ title: "Theology", source: "Daily Doctrine · Day 1" }),
    ).toBe("Daily Doctrine · Day 1|Theology");
  });
});

describe("mergeStoriesForRotation", () => {
  it("puts unseen stories before already-shown ones", () => {
    const incoming = [
      story("Old A", "a"),
      story("Old B", "b"),
      story("New C", "c"),
    ];
    const shown = new Set(["a", "b"]);
    const merged = mergeStoriesForRotation(incoming, shown, "b");
    expect(merged.stories.map((s) => s.link)).toEqual(["c", "a", "b"]);
    expect(merged.index).toBe(2); // stay on active "b"
    expect([...merged.shown].sort()).toEqual(["a", "b"]);
  });

  it("starts a fresh cycle when everything was already shown", () => {
    const incoming = [story("A", "a"), story("B", "b")];
    const shown = new Set(["a", "b"]);
    const merged = mergeStoriesForRotation(incoming, shown, "a");
    expect(merged.stories.map((s) => s.link)).toEqual(["a", "b"]);
    expect(merged.index).toBe(0);
    expect([...merged.shown]).toEqual(["a"]);
  });

  it("dedupes incoming by key", () => {
    const incoming = [story("A", "a"), story("A copy", "a"), story("B", "b")];
    const merged = mergeStoriesForRotation(incoming, new Set(), undefined);
    expect(merged.stories).toHaveLength(2);
  });
});
