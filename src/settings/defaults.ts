import { getIntlLocale } from "../i18n";

export interface InkprintSettings {
  language: "auto" | "zh" | "en";
  dailyFolder: string;
  dailyHeading: string;
  dailyTemplate: string;
  booksFolder: string;
  longformFolder: string;
  templatesFolder: string;
  weekStartsOn: "monday" | "sunday";
  keepFocusAfterSave: boolean;
  reduceTransparency: boolean;
  recognizeLegacyEntries: boolean;
  composerTags: string[];
}

export const DEFAULT_COMPOSER_TAGS = [
  "此刻的心情",
  "对明天说句话",
  "最想记录的瞬间",
];

export function defaultComposerTags(forceEnglish = false): string[] {
  return forceEnglish || getIntlLocale() === "en"
    ? ["How-I-feel", "Note-to-tomorrow", "Moment-to-remember"]
    : [...DEFAULT_COMPOSER_TAGS];
}

export const DEFAULT_SETTINGS: InkprintSettings = {
  language: "auto",
  dailyFolder: "Daily",
  dailyHeading: getIntlLocale() === "en" ? "## Journal" : "## 记录",
  dailyTemplate: "Template/Daily.md",
  booksFolder: "Books",
  longformFolder: "Longform",
  templatesFolder: "Template",
  weekStartsOn: "monday",
  keepFocusAfterSave: true,
  reduceTransparency: false,
  recognizeLegacyEntries: true,
  composerTags: defaultComposerTags(),
};

export function normalizeSettings(value: unknown): InkprintSettings {
  const source =
    typeof value === "object" && value !== null
      ? (value as Partial<InkprintSettings>)
      : {};

  const language =
      source.language === "zh" || source.language === "en"
        ? source.language
        : "auto";
  const useEnglish = language === "en" || (language === "auto" && getIntlLocale() === "en");

  return {
    language,
    dailyFolder: nonEmptyString(source.dailyFolder, DEFAULT_SETTINGS.dailyFolder),
    dailyHeading:
      typeof source.dailyHeading === "string"
        ? source.dailyHeading
        : useEnglish
          ? "## Journal"
          : "## 记录",
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
    recognizeLegacyEntries:
      typeof source.recognizeLegacyEntries === "boolean"
        ? source.recognizeLegacyEntries
        : DEFAULT_SETTINGS.recognizeLegacyEntries,
    composerTags: normalizeComposerTags(source.composerTags, useEnglish),
  };
}

function nonEmptyString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeComposerTags(value: unknown, useEnglish = false): string[] {
  if (!Array.isArray(value)) return defaultComposerTags(useEnglish);
  const tags = value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean);
  return tags.length ? [...new Set(tags)] : defaultComposerTags(useEnglish);
}
