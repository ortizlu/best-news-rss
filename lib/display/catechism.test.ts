import { describe, expect, it } from "vitest";
import {
  catechismToStory,
  interleaveCatechism,
  interleaveEvenly,
  pickCatechismItems,
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
