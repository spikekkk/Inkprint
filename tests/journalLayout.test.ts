import { describe, expect, it } from "vitest";
import { getJournalLayout } from "../src/ui/JournalLayout";

describe("journal layout", () => {
  it("places the composer immediately after the selected week on mobile", () => {
    expect(getJournalLayout(true)).toEqual({
      mode: "mobile",
      showCalendar: true,
      composerPlacement: "after-selected-week",
    });
  });

  it("uses the writing-only layout on desktop", () => {
    expect(getJournalLayout(false)).toEqual({
      mode: "desktop",
      showCalendar: false,
      composerPlacement: "top",
    });
  });
});
