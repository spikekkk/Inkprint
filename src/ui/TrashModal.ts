import { Modal, normalizePath, setIcon, type App } from "obsidian";
import { t } from "../i18n";

export class TrashModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("inkprint-trash-modal");
    this.contentEl.empty();
    const heading = this.contentEl.createDiv({ cls: "zss-trash-heading" });
    const icon = heading.createSpan({ cls: "zss-trash-heading-icon" });
    setIcon(icon, "trash-2");
    const copy = heading.createDiv();
    copy.createEl("h2", { text: t("trash.title") });
    copy.createSpan({ text: t("trash.desc") });
    const body = this.contentEl.createDiv({
      cls: "zss-trash-body",
      text: t("trash.checking"),
    });
    void this.renderTrashState(body);
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async renderTrashState(body: HTMLElement): Promise<void> {
    const trashPath = normalizePath(".trash");
    let files: string[] = [];
    try {
      const listing = await this.app.vault.adapter.list(trashPath);
      files = listing.files;
    } catch {
      // A Vault using the OS trash has no accessible .trash directory.
    }

    body.empty();
    if (files.length) {
      const count = body.createDiv({ cls: "zss-trash-summary" });
      count.createEl("strong", { text: String(files.length) });
      count.createSpan({ text: t("trash.countSuffix") });
      const list = body.createDiv({ cls: "zss-trash-list" });
      files.slice(0, 40).forEach((path) => {
        const row = list.createDiv({ cls: "zss-trash-row" });
        row.createSpan({ text: path.split("/").pop() ?? path });
        row.createEl("small", { text: path });
      });
      body.createEl("p", {
        cls: "zss-trash-note",
        text: t("trash.restoreHint"),
      });
      return;
    }

    const status = body.createDiv({ cls: "zss-trash-system" });
    const statusIcon = status.createSpan();
    setIcon(statusIcon, "hard-drive");
    const statusCopy = status.createDiv();
    statusCopy.createEl("strong", { text: t("trash.systemTitle") });
    statusCopy.createEl("span", {
      text: t("trash.systemDesc"),
    });
    body.createEl("p", {
      cls: "zss-trash-note",
      text: t("trash.apiNote"),
    });
  }
}
