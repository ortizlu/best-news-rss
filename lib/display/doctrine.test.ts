import { describe, expect, it } from "vitest";
import { doctrineToStory, pickDoctrineItems } from "./doctrine";

const sample = [
  { day: 1, title: "Theology", summary: "Know and enjoy God." },
  { day: 2, title: "Systematic Theology", summary: "What the whole Bible says." },
  { day: 3, title: "Divisions of Theology", summary: "True and false theology." },
];

describe("pickDoctrineItems", () => {
  it("is stable within the same hour", () => {
    const now = Date.parse("2026-10-02T20:15:00Z");
    const a = pickDoctrineItems(sample, 2, now).map((i) => i.day);
    const b = pickDoctrineItems(sample, 2, now + 60_000).map((i) => i.day);
    expect(a).toEqual(b);
  });
});

describe("doctrineToStory", () => {
  it("maps title, summary, and day label", () => {
    const story = doctrineToStory(sample[0]!);
    expect(story.title).toBe("Theology");
    expect(story.description).toBe("Know and enjoy God.");
    expect(story.source).toBe("Daily Doctrine · Day 1");
    expect(story.imageUrl).toBe("/daily-doctrine.jpeg");
  });
});
