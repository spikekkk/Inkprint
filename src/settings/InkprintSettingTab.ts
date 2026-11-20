import {
  Notice,
  PluginSettingTab,
  type App,
  type Plugin,
  type SettingGroupItem,
  type SettingDefinitionItem,
} from "obsidian";
import type { SettingsStore } from "../services/SettingsStore";
import { setLanguage, t } from "../i18n";
import {
  DEFAULT_SETTINGS,
  defaultComposerTags,
  type InkprintSettings,
} from "./defaults";

export class InkprintSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: Plugin,
    private readonly store: SettingsStore,
    private readonly onSettingsChanged: () => void,
  ) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        heading: t("settings.language"),
        items: [
          {
            name: t("settings.language"),
            desc: t("settings.languageDesc"),
            control: {
              type: "dropdown",
              key: "language",
              options: {
                auto: t("settings.auto"),
                zh: t("settings.zh"),
                en: t("settings.en"),
              },
            },
          },
        ],
      },
      {
        type: "group",
        heading: t("settings.group.storage"),
        items: [
          this.folder("dailyFolder", t("settings.dailyFolder"), t("settings.dailyFolderDesc")),
          this.text("dailyHeading", t("settings.dailyHeading"), t("settings.dailyHeadingDesc")),
          this.file("dailyTemplate", t("settings.dailyTemplate"), t("settings.dailyTemplateDesc")),
          this.folder(
            "templatesFolder",
            t("settings.templatesFolder"),
            t("settings.templatesFolderDesc"),
          ),
          this.folder("booksFolder", t("settings.booksFolder"), t("settings.booksFolderDesc")),
          this.folder(
            "longformFolder",
            t("settings.longformFolder"),
            t("settings.longformFolderDesc"),
          ),
        ],
      },
      {
        type: "group",
        heading: t("settings.writing"),
        items: [
          {
            name: t("settings.recognizeLegacy"),
            desc: t("settings.recognizeLegacyDesc"),
            control: {
              type: "toggle",
              key: "recognizeLegacyEntries",
            },
          },
          {
            name: t("settings.keepFocus"),
            desc: t("settings.keepFocusDesc"),
            control: {
              type: "toggle",
              key: "keepFocusAfterSave",
            },
          },
          {
            name: t("settings.composerTags"),
            desc: t("settings.composerTagsDesc", {
              tags: defaultComposerTags().join("、"),
            }),
            control: {
              type: "textarea",
              key: "composerTags",
              defaultValue: defaultComposerTags().join("\n"),
            },
          },
        ],
      },
      {
        type: "group",
        heading: t("settings.calendar"),
        items: [
          {
            name: t("settings.weekStart"),
            desc: t("settings.weekStartDesc"),
            control: {
              type: "dropdown",
              key: "weekStartsOn",
              options: {
                monday: t("settings.monday"),
                sunday: t("settings.sunday"),
              },
            },
          },
        ],
      },
      {
        type: "group",
        heading: t("settings.appearance"),
        items: [
          {
            name: t("settings.reduceTransparency"),
            desc: t("settings.reduceTransparencyDesc"),
            control: {
              type: "toggle",
              key: "reduceTransparency",
            },
          },
        ],
      },
      {
        type: "group",
        heading: t("settings.advanced"),
        items: [
          {
            name: t("settings.reloadView"),
            desc: t("settings.reloadViewDesc"),
            action: () => {
              this.onSettingsChanged();
              new Notice(t("settings.reloaded"));
            },
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    const settings = this.store.getCached() ?? DEFAULT_SETTINGS;
    if (key === "composerTags") return settings.composerTags.join("\n");
    return settings[key as keyof InkprintSettings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const current = this.store.getCached() ?? DEFAULT_SETTINGS;
    const normalizedValue =
      key === "composerTags"
        ? String(value)
            .split(/[\n,，]+/)
            .map((tag) => tag.trim().replace(/^#+/, ""))
            .filter(Boolean)
        : value;
    const next = { ...current, [key]: normalizedValue } as InkprintSettings;
    if (key === "language") setLanguage(next.language);
    await this.store.save(next);
    this.onSettingsChanged();
    this.update();
  }

  private folder(
    key: keyof InkprintSettings,
    name: string,
    desc: string,
  ): SettingGroupItem {
    return {
      name,
      desc,
      control: {
        type: "folder",
        key,
        defaultValue: String(DEFAULT_SETTINGS[key]),
      },
    };
  }

  private file(
    key: keyof InkprintSettings,
    name: string,
    desc: string,
  ): SettingGroupItem {
    return {
      name,
      desc,
      control: {
        type: "file",
        key,
        defaultValue: String(DEFAULT_SETTINGS[key]),
        filter: (file) => file.extension === "md",
      },
    };
  }

  private text(
    key: keyof InkprintSettings,
    name: string,
    desc: string,
  ): SettingGroupItem {
    return {
      name,
      desc,
      control: {
        type: "text",
        key,
        defaultValue: String(DEFAULT_SETTINGS[key]),
      },
    };
  }
}
