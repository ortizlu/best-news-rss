import { describe, expect, it } from "vitest";
import {
  catechismToStory,
  interleaveCatechism,
  interleaveEvenly,
  pickCatechismItems,
  stripScriptureReferences,
  type CatechismItem,
} from "./catechism";
import type { DisplayStory } from "./items";

const sample: CatechismItem[] = [
  { number: 1, question: "Q1?", answer: "A1" },
  { number: 2, question: "Q2?", answer: "A2" },
  { number: 3, question: "Q3?", answer: "A3" },
  { number: 4, question: "Q4?", answer: "A4" },
];

function news(n: number): DisplayStory[] {
  return Array.from({ length: n }, (_, i) => ({ title: `News ${i + 1}` }));
}

describe("interleaveCatechism", () => {
  it("inserts one catechism after every N news items when the pool is small", () => {
    const result = interleaveCatechism(
      news(8),
      sample.slice(0, 2).map(catechismToStory),
      4,
    );
    expect(result.map((s) => s.title)).toEqual([
      "News 1",
      "News 2",
      "News 3",
      "News 4",
      "Q1?",
      "News 5",
      "News 6",
      "News 7",
      "News 8",
      "Q2?",
    ]);
  });

  it("uses even merge when many catechism items are added on top of news", () => {
    const cats = sample.map(catechismToStory);
    const result = interleaveCatechism(news(4), cats, 4);
    expect(result).toHaveLength(8);
    expect(result.filter((s) => s.title.startsWith("News"))).toHaveLength(4);
    expect(result.filter((s) => s.title.startsWith("Q"))).toHaveLength(4);
  });
});

describe("interleaveEvenly", () => {
  it("alternates equal-length pools", () => {
    const result = interleaveEvenly(news(2), [
      { title: "C1" },
      { title: "C2" },
    ]);
    expect(result.map((s) => s.title)).toEqual(["News 1", "C1", "News 2", "C2"]);
  });
});

describe("pickCatechismItems", () => {
  it("returns a stable hourly sample of the requested size", () => {
    const a = pickCatechismItems(sample, 3, 0);
    const b = pickCatechismItems(sample, 3, 0);
    expect(a.map((i) => i.number)).toEqual(b.map((i) => i.number));
    expect(a).toHaveLength(3);
  });
});

describe("stripScriptureReferences", () => {
  it("removes verse parentheses and cleans punctuation", () => {
    expect(
      stripScriptureReferences(
        "God is the first and chiefest being. (Isa. 44:6; 48:12)",
      ),
    ).toBe("God is the first and chiefest being.");
    expect(
      stripScriptureReferences(
        "Everyone ought to believe there is a God; (Heb. 11:6) and it is their great sin and folly who do not. (Psa. 14:1)",
      ),
    ).toBe(
      "Everyone ought to believe there is a God, and it is their great sin and folly who do not.",
    );
  });

  it("keeps non-verse parentheticals", () => {
    expect(
      stripScriptureReferences(
        "a promise of long life and prosperity (as far as it shall serve for God’s glory, and their own good) to all such as keep this commandment. (Deut. 5:16; Eph. 6:2–3)",
      ),
    ).toBe(
      "a promise of long life and prosperity (as far as it shall serve for God’s glory, and their own good) to all such as keep this commandment.",
    );
  });
});

describe("catechismToStory", () => {
  it("maps question/answer and strips scripture by default", () => {
    const story = catechismToStory({
      number: 1,
      question: "Who is the first and chiefest being?",
      answer: "God is the first and chiefest being. (Isa. 44:6; 48:12)",
    });
    expect(story.title).toBe("Who is the first and chiefest being?");
    expect(story.description).toBe("God is the first and chiefest being.");
    expect(story.source).toBe("Baptist Catechism · Question 1");
    expect(story.pubDate).toBeUndefined();
    expect(story.imageUrl).toBe("/catechism-wallpaper.jpeg");
    expect(story.imageBlur).toBeUndefined();
  });
});
