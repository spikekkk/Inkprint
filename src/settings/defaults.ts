export interface ZhenshangshuSettings {
  dailyFolder: string;
  dailyHeading: string;
  dailyTemplate: string;
  booksFolder: string;
  longformFolder: string;
  templatesFolder: string;
  goalsPath: string;
  quickCheckLimit: number;
  weekStartsOn: "monday" | "sunday";
  keepFocusAfterSave: boolean;
  reduceTransparency: boolean;
}

export const DEFAULT_SETTINGS: ZhenshangshuSettings = {
  dailyFolder: "Daily",
  dailyHeading: "## 记录",
  dailyTemplate: "Template/Daily.md",
  booksFolder: "Books",
  longformFolder: "Longform",
  templatesFolder: "Template",
  goalsPath: "Goals/目标树.md",
  quickCheckLimit: 3,
  weekStartsOn: "monday",
  keepFocusAfterSave: true,
  reduceTransparency: false,
};

export function normalizeSettings(value: unknown): ZhenshangshuSettings {
  const source =
    typeof value === "object" && value !== null
      ? (value as Partial<ZhenshangshuSettings>)
      : {};

  return {
    dailyFolder: nonEmptyString(source.dailyFolder, DEFAULT_SETTINGS.dailyFolder),
    dailyHeading:
      typeof source.dailyHeading === "string"
        ? source.dailyHeading
        : DEFAULT_SETTINGS.dailyHeading,
    dailyTemplate:
      typeof source.dailyTemplate === "string"
        ? source.dailyTemplate
        : DEFAULT_SETTINGS.dailyTemplate,
    booksFolder: nonEmptyString(source.booksFolder, DEFAULT_SETTINGS.booksFolder),
    longformFolder: nonEmptyString(source.longformFolder, DEFAULT_SETTINGS.longformFolder),
    templatesFolder: nonEmptyString(source.templatesFolder, DEFAULT_SETTINGS.templatesFolder),
    goalsPath: nonEmptyString(source.goalsPath, DEFAULT_SETTINGS.goalsPath),
    quickCheckLimit:
      Number.isSafeInteger(source.quickCheckLimit) && Number(source.quickCheckLimit) > 0
        ? Number(source.quickCheckLimit)
        : DEFAULT_SETTINGS.quickCheckLimit,
    weekStartsOn: source.weekStartsOn === "sunday" ? "sunday" : "monday",
    keepFocusAfterSave:
      typeof source.keepFocusAfterSave === "boolean"
        ? source.keepFocusAfterSave
        : DEFAULT_SETTINGS.keepFocusAfterSave,
    reduceTransparency:
      typeof source.reduceTransparency === "boolean"
        ? source.reduceTransparency
        : DEFAULT_SETTINGS.reduceTransparency,
  };
}

function nonEmptyString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
