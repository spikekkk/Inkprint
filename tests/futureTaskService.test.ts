import { describe, expect, it } from "vitest";
import { extractFutureTaskDates } from "../src/services/FutureTaskService";

describe("FutureTaskService", () => {
  it("extracts one or more date buoys from note text", () => {
    expect(
      extractFutureTaskDates("今天埋下 @2026-12-01，也想起 @2027-01-01。"),
    ).toEqual(["2026-12-01", "2027-01-01"]);
  });

  it("ignores incomplete or invalid date-like text", () => {
    expect(extractFutureTaskDates("@2026-12 @hello @2026-13-40")).toEqual([]);
  });
});
