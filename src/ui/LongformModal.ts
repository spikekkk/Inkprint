import { Modal, Notice, type App } from "obsidian";
import { t } from "../i18n";

export class LongformModal extends Modal {
  private titleInput: HTMLInputElement | null = null;
  private folderSelect: HTMLSelectElement | null = null;
  private templateHint: HTMLElement | null = null;

  constructor(
    app: App,
    private readonly body: string,
    private readonly folders: readonly string[],
    private readonly defaultFolder: string,
    private readonly templatePathFor: (folder: string) => string | null,
    private readonly onSubmit: (title: string, folder: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: t("longform.title") });
    this.contentEl.createEl("p", {
      text: t("longform.desc"),
    });
    this.titleInput = this.contentEl.createEl("input", {
      attr: {
        type: "text",
        placeholder: t("longform.titlePlaceholder"),
        "aria-label": t("longform.titleLabel"),
      },
    });
    const folderLabel = this.contentEl.createEl("label", { cls: "zss-longform-folder" });
    folderLabel.createSpan({ text: t("longform.folder") });
    this.folderSelect = folderLabel.createEl("select", {
      attr: { "aria-label": t("longform.folderAria") },
    });
    this.folders.forEach((folder) => {
      this.folderSelect?.createEl("option", {
        value: folder,
        text: folder || t("longform.root"),
      });
    });
    this.folderSelect.value = this.defaultFolder;
    this.templateHint = this.contentEl.createDiv({ cls: "zss-template-hint" });
    this.folderSelect.addEventListener("change", () => this.updateTemplateHint());
    this.updateTemplateHint();
    if (this.body) {
      this.contentEl.createEl("p", {
        cls: "zss-modal-preview",
        text: this.body.slice(0, 220),
      });
    }

    const actions = this.contentEl.createDiv({ cls: "zss-form-actions" });
    const cancel = actions.createEl("button", {
      text: t("common.cancel"),
      attr: { type: "button" },
    });
    cancel.addEventListener("click", () => this.close());
    const create = actions.createEl("button", {
      cls: "mod-cta",
      text: t("longform.create"),
      attr: { type: "button" },
    });
    create.addEventListener("click", () => void this.submit(create));
    this.titleInput.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async submit(button: HTMLButtonElement): Promise<void> {
    const title = this.titleInput?.value.trim() ?? "";
    if (!title) {
      new Notice(t("longform.needsTitle"));
      this.titleInput?.focus();
      return;
    }
    button.disabled = true;
    try {
      await this.onSubmit(title, this.folderSelect?.value ?? this.defaultFolder);
      this.close();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : t("longform.failed"));
      button.disabled = false;
    }
  }

  private updateTemplateHint(): void {
    if (!this.templateHint || !this.folderSelect) return;
    const template = this.templatePathFor(this.folderSelect.value);
    this.templateHint.setText(
      template
        ? t("longform.templateUses", { path: template })
        : t("longform.noTemplate"),
    );
  }
}
