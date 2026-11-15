import { Plugin, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_ZHENSHANGSHU } from "./constants";
import { SettingsStore } from "./services/SettingsStore";
import { ZhenshangshuSettingTab } from "./settings/ZhenshangshuSettingTab";
import { ZhenshangshuView } from "./view/ZhenshangshuView";

export default class ZhenshangshuPlugin extends Plugin {
  private settingsStore!: SettingsStore;

  async onload(): Promise<void> {
    this.settingsStore = new SettingsStore(this);
    await this.settingsStore.load();

    this.registerView(
      VIEW_TYPE_ZHENSHANGSHU,
      (leaf: WorkspaceLeaf) => new ZhenshangshuView(leaf, this.settingsStore),
    );

    this.addRibbonIcon("notebook-pen", "打开枕上书", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-journal",
      name: "打开日记",
      callback: () => {
        void this.activateView();
      },
    });

    this.addSettingTab(
      new ZhenshangshuSettingTab(this.app, this, this.settingsStore, () => {
        void this.refreshViews();
      }),
    );
  }

  private async activateView(): Promise<void> {
    const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ZHENSHANGSHU);
    let leaf = existingLeaves[0];

    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({
        type: VIEW_TYPE_ZHENSHANGSHU,
        active: true,
      });
    }

    await this.app.workspace.revealLeaf(leaf);
  }

  private async refreshViews(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ZHENSHANGSHU);
    for (const leaf of leaves) {
      if (leaf.view instanceof ZhenshangshuView) await leaf.view.refresh();
    }
  }
}
