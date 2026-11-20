import { Modal, Notice, type App } from "obsidian";

export class FolderRenameModal extends Modal {
  private input: HTMLInputElement | null = null;

  constructor(
    app: App,
    private readonly currentName: string,
    private readonly onSubmit: (name: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "重命名文件夹" });
    this.input = this.contentEl.createEl("input", {
      attr: { type: "text", "aria-label": "新文件夹名称" },
    });
    this.input.value = this.currentName;
    const actions = this.contentEl.createDiv({ cls: "zss-form-actions" });
    const cancel = actions.createEl("button", {
      text: "取消",
      attr: { type: "button" },
    });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", {
      cls: "mod-cta",
      text: "保存",
      attr: { type: "button" },
    });
    save.addEventListener("click", () => void this.submit(save));
    this.input.select();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async submit(button: HTMLButtonElement): Promise<void> {
    const name = this.input?.value.trim() ?? "";
    if (!name) {
      new Notice("文件夹名称不能为空。");
      return;
    }
    button.disabled = true;
    try {
      await this.onSubmit(name);
      this.close();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "重命名失败。");
      button.disabled = false;
    }
  }
}
