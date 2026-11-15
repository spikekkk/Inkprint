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
  DEFAULT_SETTINGS,
  type ZhenshangshuSettings,
} from "./defaults";

export class ZhenshangshuSettingTab extends PluginSettingTab {
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
          this.file("goalsPath", "目标树文件", "Goals/目标树.md"),
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
        ],
      },
      {
        type: "group",
        heading: "打卡与目标",
        items: [
          {
            name: "首页快捷打卡数",
            desc: "默认显示在前三个任务，最多四十四项。",
            control: {
              type: "number",
              key: "quickCheckLimit",
              min: 1,
              max: 44,
              step: 1,
            },
          },
          {
            name: "每周起始日",
            desc: "日历和目标热力图按此设置排列。",
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
            desc: "设置修改后可让已打开的枕上书视图重新读取配置。",
            action: () => {
              this.onSettingsChanged();
              new Notice("枕上书视图已重新载入。");
            },
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    const settings = this.store.getCached() ?? DEFAULT_SETTINGS;
    return settings[key as keyof ZhenshangshuSettings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const current = this.store.getCached() ?? DEFAULT_SETTINGS;
    const next = { ...current, [key]: value } as ZhenshangshuSettings;
    await this.store.save(next);
    this.onSettingsChanged();
    this.update();
  }

  private folder(
    key: keyof ZhenshangshuSettings,
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
    key: keyof ZhenshangshuSettings,
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
    key: keyof ZhenshangshuSettings,
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
