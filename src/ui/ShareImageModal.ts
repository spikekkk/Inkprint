import { Modal, type App } from "obsidian";
import { t } from "../i18n";

export class ShareImageModal extends Modal {
  constructor(
    app: App,
    private readonly imagePath: string,
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("inkprint-share-modal");
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: t("share.title") });
    const preview = this.contentEl.createDiv({ cls: "zss-share-preview" });
    const image = preview.createEl("img", {
      attr: {
        src: this.app.vault.adapter.getResourcePath(this.imagePath),
        alt: t("share.alt"),
      },
    });
    image.draggable = true;
    this.contentEl.createEl("p", {
      cls: "zss-share-path",
      text: this.imagePath,
    });
    const actions = this.contentEl.createDiv({ cls: "zss-form-actions" });
    const open = actions.createEl("button", {
      text: t("share.open"),
      attr: { type: "button" },
    });
    open.addEventListener("click", () => {
      void this.app.workspace.openLinkText(this.imagePath, "", true);
      this.close();
    });
    const close = actions.createEl("button", {
      text: t("common.close"),
      attr: { type: "button" },
    });
    close.addEventListener("click", () => this.close());
  }
}
