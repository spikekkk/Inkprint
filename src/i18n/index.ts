import { getLanguage } from "obsidian";
import { en } from "./en";
import { zh } from "./zh";

export type TranslationKey = keyof typeof en;
export type LanguageSetting = "auto" | "zh" | "en";

let selectedLanguage: LanguageSetting = "auto";

export function setLanguage(language: LanguageSetting): void {
  selectedLanguage = language;
}

export function getIntlLocale(): "zh-CN" | "en" {
  return resolveLanguage() === "zh" ? "zh-CN" : "en";
}

export function t(
  key: TranslationKey,
  variables?: Record<string, string | number>,
): string {
  const table = resolveLanguage() === "zh" ? zh : en;
  let value: string = table[key] ?? en[key] ?? key;
  Object.entries(variables ?? {}).forEach(([name, replacement]) => {
    value = value.split(`{${name}}`).join(String(replacement));
  });
  return value;
}

function resolveLanguage(): "zh" | "en" {
  if (selectedLanguage !== "auto") return selectedLanguage;
  return getLanguage().toLowerCase().startsWith("zh") ? "zh" : "en";
}
