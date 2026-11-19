import { describe, expect, it } from "vitest";
import { normalizeSettings } from "../src/settings/defaults";

describe("settings", () => {
  it("normalizes missing and invalid values to usable defaults", () => {
    expect(
      normalizeSettings({
        dailyFolder: "",
        weekStartsOn: "invalid",
      composerTags: [],
      }),
    ).toMatchObject({
      dailyFolder: "Daily",
      dailyHeading: "## 记录",
      weekStartsOn: "monday",
      keepFocusAfterSave: true,
      composerTags: ["此刻的心情", "对明天说句话", "最想记录的瞬间"],
    });
  });

  it("accepts custom composer tags", () => {
    expect(
      normalizeSettings({
        composerTags: ["灵感", "#复盘", " 灵感 "],
      }).composerTags,
    ).toEqual(["灵感", "复盘"]);
  });
});
