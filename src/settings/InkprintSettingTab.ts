import {
  Notice,
  PluginSettingTab,
  type App,
  type Plugin,
  type SettingGroupItem,
  type SettingDefinitionItem,
} from "obsidian";
import type { SettingsStore } from "../services/SettingsStore";
import {
  DEFAULT_COMPOSER_TAGS,
  DEFAULT_SETTINGS,
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
        items: [
          this.folder("dailyFolder", "日记目录", "Daily Notes 使用的目录。"),
          this.text("dailyHeading", "日记写入标题", "例如：## 记录"),
          this.file("dailyTemplate", "日记模板", "Template/Daily.md，可为空。"),
          this.folder("templatesFolder", "模板目录", "日记模板所在的目录。"),
          this.folder("booksFolder", "书籍目录", "书籍索引文件的位置。"),
          this.folder("longformFolder", "长文目录", "长文正文所在的目录。"),
        ],
      },
      {
        type: "group",
        heading: "写作",
        items: [
          {
            name: "保存后保留焦点",
            desc: "保存一条记录后，继续在当前输入框里写。",
            control: {
              type: "toggle",
              key: "keepFocusAfterSave",
            },
          },
          {
            name: "输入框快捷标签",
            desc: `每行一个标签。留空时恢复默认三个标签：${DEFAULT_COMPOSER_TAGS.join("、")}。`,
            control: {
              type: "textarea",
              key: "composerTags",
              defaultValue: DEFAULT_COMPOSER_TAGS.join("\n"),
            },
          },
        ],
      },
      {
        type: "group",
        heading: "日历",
        items: [
          {
            name: "每周起始日",
            desc: "日历按此设置排列。",
            control: {
              type: "dropdown",
              key: "weekStartsOn",
              options: {
                monday: "周一",
                sunday: "周日",
              },
            },
          },
        ],
      },
      {
        type: "group",
        heading: "外观",
        items: [
          {
            name: "减少透明效果",
            desc: "移动端导航、抽屉和关联详情使用实色背景。",
            control: {
              type: "toggle",
              key: "reduceTransparency",
            },
          },
        ],
      },
      {
        type: "group",
        heading: "高级",
        items: [
          {
            name: "重新载入视图",
            desc: "设置修改后可让已打开的 Inkprint 视图重新读取配置。",
            action: () => {
              this.onSettingsChanged();
              new Notice("Inkprint 视图已重新载入。");
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
