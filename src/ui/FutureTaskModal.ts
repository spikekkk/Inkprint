import { Modal, Notice, type App } from "obsidian";

export class FutureTaskModal extends Modal {
  private taskInput: HTMLInputElement | null = null;
  private dateInput: HTMLInputElement | null = null;

  constructor(
    app: App,
    private readonly onPick: (task: string, date: string) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "安排一件来日" });
    this.contentEl.createEl("p", {
      text: "这件事会保存为标准 Markdown Checkbox，并在指定日期重新浮现。",
    });
    this.taskInput = this.contentEl.createEl("input", {
      attr: { type: "text", placeholder: "要留给来日的事情", "aria-label": "待办内容" },
    });
    this.dateInput = this.contentEl.createEl("input", {
      attr: {
        type: "date",
        "aria-label": "浮标日期",
      },
    });
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    this.dateInput.value = isoDate(defaultDate);

    const actions = this.contentEl.createDiv({ cls: "zss-form-actions" });
    const cancel = actions.createEl("button", {
      text: "取消",
      attr: { type: "button" },
    });
    cancel.addEventListener("click", () => this.close());
    const insert = actions.createEl("button", {
      cls: "mod-cta",
      text: "插入浮标",
      attr: { type: "button" },
    });
    insert.addEventListener("click", () => {
      const date = this.dateInput?.value ?? "";
      const task = this.taskInput?.value.trim() ?? "";
      if (!task) {
        new Notice("请填写待办内容。");
        this.taskInput?.focus();
        return;
      }
      if (!date) {
        new Notice("请选择来日日期。");
        this.dateInput?.focus();
        return;
      }
      this.onPick(task, date);
      this.close();
    });
    this.taskInput.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

function isoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
