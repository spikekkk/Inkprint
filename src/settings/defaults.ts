export interface InkprintSettings {
  dailyFolder: string;
  dailyHeading: string;
  dailyTemplate: string;
  booksFolder: string;
  longformFolder: string;
  templatesFolder: string;
  weekStartsOn: "monday" | "sunday";
  keepFocusAfterSave: boolean;
  reduceTransparency: boolean;
  composerTags: string[];
}

export const DEFAULT_COMPOSER_TAGS = [
  "此刻的心情",
  "对明天说句话",
  "最想记录的瞬间",
];

export const DEFAULT_SETTINGS: InkprintSettings = {
  dailyFolder: "Daily",
  dailyHeading: "## 记录",
  dailyTemplate: "Template/Daily.md",
  booksFolder: "Books",
  longformFolder: "Longform",
  templatesFolder: "Template",
  weekStartsOn: "monday",
  keepFocusAfterSave: true,
  reduceTransparency: false,
  composerTags: [...DEFAULT_COMPOSER_TAGS],
};

export function normalizeSettings(value: unknown): InkprintSettings {
  const source =
    typeof value === "object" && value !== null
      ? (value as Partial<InkprintSettings>)
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
    weekStartsOn: source.weekStartsOn === "sunday" ? "sunday" : "monday",
    keepFocusAfterSave:
      typeof source.keepFocusAfterSave === "boolean"
        ? source.keepFocusAfterSave
        : DEFAULT_SETTINGS.keepFocusAfterSave,
    reduceTransparency:
      typeof source.reduceTransparency === "boolean"
        ? source.reduceTransparency
        : DEFAULT_SETTINGS.reduceTransparency,
    composerTags: normalizeComposerTags(source.composerTags),
  };
}

function nonEmptyString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeComposerTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_COMPOSER_TAGS];
  const tags = value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean);
  return tags.length ? [...new Set(tags)] : [...DEFAULT_COMPOSER_TAGS];
}
