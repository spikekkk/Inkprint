import { Plugin, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_INKPRINT } from "./constants";
import { SettingsStore } from "./services/SettingsStore";
import { InkprintSettingTab } from "./settings/InkprintSettingTab";
import { InkprintView } from "./view/InkprintView";

export default class InkprintPlugin extends Plugin {
  private settingsStore!: SettingsStore;

  async onload(): Promise<void> {
    this.settingsStore = new SettingsStore(this);
    await this.settingsStore.load();

    this.registerView(
      VIEW_TYPE_INKPRINT,
      (leaf: WorkspaceLeaf) => new InkprintView(leaf, this.settingsStore),
    );

    this.addRibbonIcon("notebook-pen", "打开 Inkprint", () => {
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
      new InkprintSettingTab(this.app, this, this.settingsStore, () => {
        void this.refreshViews();
      }),
    );
  }

  private async activateView(): Promise<void> {
    const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_INKPRINT);
    let leaf = existingLeaves[0];

    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({
        type: VIEW_TYPE_INKPRINT,
        active: true,
      });
    }

    await this.app.workspace.revealLeaf(leaf);
  }

  private async refreshViews(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_INKPRINT);
    for (const leaf of leaves) {
      if (leaf.view instanceof InkprintView) await leaf.view.refresh();
    }
  }
}
