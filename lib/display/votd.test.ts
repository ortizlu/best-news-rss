import { describe, expect, it } from "vitest";
import {
  decodeHtmlEntities,
  replicateStory,
  votdDayKey,
  votdToStory,
} from "./votd";

describe("decodeHtmlEntities", () => {
  it("decodes numeric and named quotes from Bible Gateway", () => {
    expect(
      decodeHtmlEntities(
        "&#8220;Blessed are you&#8221; &amp; more",
      ),
    ).toBe("\u201CBlessed are you\u201D & more");
  });

  it("collapses stacked opening quotes", () => {
    expect(decodeHtmlEntities("&ldquo;&#8220;Blessed")).toBe("\u201CBlessed");
  });
});

describe("votdToStory", () => {
  it("maps reference and cleaned content", () => {
    const story = votdToStory({
      content:
        "&#8220;Blessed are you when others revile you.&#8221;",
      display_ref: "Matthew 5:11-12",
      version_id: "ESV",
    });
    expect(story?.title).toBe("Matthew 5:11-12");
    expect(story?.description).toBe(
      "\u201CBlessed are you when others revile you.\u201D",
    );
    expect(story?.source).toBe("Verse of the Day · ESV");
  });
});

describe("replicateStory", () => {
  it("makes unique links for each copy", () => {
    const copies = replicateStory(
      { title: "Matthew 5:11-12", description: "Blessed" },
      3,
    );
    expect(copies).toHaveLength(3);
    expect(copies.map((c) => c.link)).toEqual([
      "votd://copy-1",
      "votd://copy-2",
      "votd://copy-3",
    ]);
  });
});

describe("votdDayKey", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(votdDayKey(new Date("2026-10-01T18:00:00Z"))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });
});
