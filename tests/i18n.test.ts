import { afterEach, describe, expect, it } from "vitest";
import { setLanguage, t } from "../src/i18n";

describe("i18n", () => {
  afterEach(() => setLanguage("auto"));

  it("provides Chinese and English translations", () => {
    setLanguage("zh");
    expect(t("composer.send")).toBe("发送");
    setLanguage("en");
    expect(t("composer.send")).toBe("Send");
  });

  it("interpolates values", () => {
    setLanguage("en");
    expect(t("journal.relationsCount", { count: 3 })).toBe("View relations 3");
  });
});
