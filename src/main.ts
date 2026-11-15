import { Plugin, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_ZHENSHANGSHU } from "./constants";
import { ZhenshangshuView } from "./view/ZhenshangshuView";

export default class ZhenshangshuPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(
      VIEW_TYPE_ZHENSHANGSHU,
      (leaf: WorkspaceLeaf) => new ZhenshangshuView(leaf),
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
}
