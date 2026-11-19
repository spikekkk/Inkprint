import { describe, expect, it } from "vitest";
import { extractTimeBuoyDates } from "../src/services/TimeBuoyService";

describe("TimeBuoyService", () => {
  it("extracts one or more date buoys from note text", () => {
    expect(
      extractTimeBuoyDates("今天埋下 @2026-12-01，也想起 @2027-01-01。"),
    ).toEqual(["2026-12-01", "2027-01-01"]);
  });

  it("ignores incomplete or invalid date-like text", () => {
    expect(extractTimeBuoyDates("@2026-12 @hello @2026-13-40")).toEqual([]);
  });
});
