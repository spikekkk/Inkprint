import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_ZHENSHANGSHU } from "../constants";

export { VIEW_TYPE_ZHENSHANGSHU } from "../constants";

export class ZhenshangshuView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_ZHENSHANGSHU;
  }

  getDisplayText(): string {
    return "枕上书";
  }

  getIcon(): string {
    return "notebook-pen";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("zhenshangshu-view");
    this.contentEl.createDiv({ cls: "zhenshangshu-loading", text: "正在整理今天……" });
  }
}
