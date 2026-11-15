import { Modal, Notice, type App } from "obsidian";

export class LongformModal extends Modal {
  private titleInput: HTMLInputElement | null = null;

  constructor(
    app: App,
    private readonly body: string,
    private readonly onSubmit: (title: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "创建长文" });
    this.contentEl.createEl("p", {
      text: "正文会迁入独立 Markdown，今天的 Daily 只保留摘要和返回入口。",
    });
    this.titleInput = this.contentEl.createEl("input", {
      attr: {
        type: "text",
        placeholder: "长文标题",
        "aria-label": "长文标题",
      },
    });
    if (this.body) {
      this.contentEl.createEl("p", {
        cls: "zss-modal-preview",
        text: this.body.slice(0, 220),
      });
    }

    const actions = this.contentEl.createDiv({ cls: "zss-form-actions" });
    const cancel = actions.createEl("button", {
      text: "取消",
      attr: { type: "button" },
    });
    cancel.addEventListener("click", () => this.close());
    const create = actions.createEl("button", {
      cls: "mod-cta",
      text: "创建长文并保留入口",
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
      new Notice("请先填写长文标题。");
      this.titleInput?.focus();
      return;
    }
    button.disabled = true;
    try {
      await this.onSubmit(title);
      this.close();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "创建长文失败。");
      button.disabled = false;
    }
  }
}
