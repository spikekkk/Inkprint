import { describe, expect, it } from "vitest";
import { normalizeSettings } from "../src/settings/defaults";

describe("settings", () => {
  it("normalizes missing and invalid values to usable defaults", () => {
    expect(
      normalizeSettings({
        dailyFolder: "",
        quickCheckLimit: 0,
        weekStartsOn: "invalid",
      }),
    ).toMatchObject({
      dailyFolder: "Daily",
      dailyHeading: "## 记录",
      quickCheckLimit: 3,
      weekStartsOn: "monday",
      keepFocusAfterSave: true,
    });
  });
});
