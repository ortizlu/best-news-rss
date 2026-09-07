import { describe, expect, it } from "vitest";
import { isNewsBreakItemInRegion } from "./region";

describe("isNewsBreakItemInRegion", () => {
  it("drops Texas items from -va NewsBreak feeds", () => {
    expect(
      isNewsBreakItemInRegion("arlington-va", "Fort Worth, Texas"),
    ).toBe(false);
    expect(
      isNewsBreakItemInRegion("arlington-va", "Arlington, Texas"),
    ).toBe(false);
    expect(isNewsBreakItemInRegion("groveton-va", "Dallas, Texas")).toBe(
      false,
    );
  });

  it("keeps NOVA / DC / Maryland items on -va feeds", () => {
    expect(
      isNewsBreakItemInRegion("groveton-va", "Alexandria, Virginia"),
    ).toBe(true);
    expect(
      isNewsBreakItemInRegion(
        "groveton-va",
        "Washington, District Of Columbia",
      ),
    ).toBe(true);
    expect(isNewsBreakItemInRegion("groveton-va", "Maryland")).toBe(true);
  });

  it("does not filter non-va slugs", () => {
    expect(isNewsBreakItemInRegion("arlington-tx", "Fort Worth, Texas")).toBe(
      true,
    );
  });
});
