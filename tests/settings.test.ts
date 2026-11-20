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
      language: "auto",
      dailyHeading: "## 记录",
      weekStartsOn: "monday",
      keepFocusAfterSave: true,
      recognizeLegacyEntries: true,
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

  it("uses English defaults when English is selected", () => {
    expect(normalizeSettings({ language: "en" })).toMatchObject({
      language: "en",
      dailyHeading: "## Journal",
      composerTags: ["How-I-feel", "Note-to-tomorrow", "Moment-to-remember"],
    });
  });
});
