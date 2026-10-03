import { describe, expect, it } from "vitest";
import {
  cleanVotdContent,
  decodeHtmlEntities,
  replicateStory,
  stripVotdHtml,
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

describe("stripVotdHtml", () => {
  it("uppercases small-caps Lord and drops the span", () => {
    expect(
      stripVotdHtml(
        'trusts in the <span class="small-caps" >Lord</span> is safe.',
      ),
    ).toBe("trusts in the LORD is safe.");
  });

  it("strips other tags without uppercasing", () => {
    expect(stripVotdHtml("Blessed are <i>you</i>.")).toBe("Blessed are you.");
  });
});

describe("cleanVotdContent", () => {
  it("handles today's Proverbs verse with small-caps", () => {
    expect(
      cleanVotdContent(
        'The fear of man lays a snare, but whoever trusts in the <span class="small-caps" >Lord</span> is safe.',
      ),
    ).toBe(
      "The fear of man lays a snare, but whoever trusts in the LORD is safe.",
    );
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

  it("strips small-caps markup from content", () => {
    const story = votdToStory({
      content:
        'whoever trusts in the <span class="small-caps" >Lord</span> is safe.',
      display_ref: "Proverbs 29:25",
      version_id: "ESV",
    });
    expect(story?.description).toBe(
      "whoever trusts in the LORD is safe.",
    );
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
  it("returns the UTC calendar day", () => {
    // Still evening Oct 2 in ET, already Oct 3 UTC.
    expect(votdDayKey(new Date("2026-10-03T01:00:00Z"))).toBe("2026-10-03");
    expect(votdDayKey(new Date("2026-10-02T23:59:59Z"))).toBe("2026-10-02");
  });
});
