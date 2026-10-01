import { describe, expect, it } from "vitest";
import {
  catechismStartIndex,
  catechismToStory,
  interleaveCatechism,
  pickCatechismItems,
  splitDisplayBudget,
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

describe("splitDisplayBudget", () => {
  it("reserves catechism slots inside maxItems", () => {
    expect(splitDisplayBudget(30, 4)).toEqual({
      newsCount: 24,
      catechismCount: 6,
    });
  });
});

describe("interleaveCatechism", () => {
  it("inserts one catechism after every N news items", () => {
    const result = interleaveCatechism(
      news(8),
      sample.map(catechismToStory),
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
});

describe("pickCatechismItems", () => {
  it("rotates from an hourly start index", () => {
    const start = catechismStartIndex(sample.length, 0);
    expect(start).toBe(0);
    const picked = pickCatechismItems(sample, 3, 0);
    expect(picked.map((i) => i.number)).toEqual([1, 2, 3]);
  });
});

describe("catechismToStory", () => {
  it("maps question/answer and labels the source", () => {
    const story = catechismToStory(sample[0]!);
    expect(story.title).toBe("Q1?");
    expect(story.description).toBe("A1");
    expect(story.source).toBe("Baptist Catechism · Q. 1");
    expect(story.pubDate).toBeUndefined();
    expect(story.imageUrl).toContain("1689-confession-modern-eng");
    expect(story.imageBlur).toBe(true);
  });
});
