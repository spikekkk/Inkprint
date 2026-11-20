import { Modal, Notice, type App } from "obsidian";
import { t } from "../i18n";

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
    this.contentEl.createEl("h2", { text: t("vault.renameTitle") });
    this.input = this.contentEl.createEl("input", {
      attr: { type: "text", "aria-label": t("vault.newFolderName") },
    });
    this.input.value = this.currentName;
    const actions = this.contentEl.createDiv({ cls: "zss-form-actions" });
    const cancel = actions.createEl("button", {
      text: t("common.cancel"),
      attr: { type: "button" },
    });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", {
      cls: "mod-cta",
      text: t("common.save"),
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
      new Notice(t("vault.renameEmpty"));
      return;
    }
    button.disabled = true;
    try {
      await this.onSubmit(name);
      this.close();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : t("vault.renameFailed"));
      button.disabled = false;
    }
  }
}
