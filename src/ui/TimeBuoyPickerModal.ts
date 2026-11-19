import { Modal, Notice, type App } from "obsidian";

export class TimeBuoyPickerModal extends Modal {
  private dateInput: HTMLInputElement | null = null;

  constructor(
    app: App,
    private readonly onPick: (date: string) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "添加时光浮标" });
    this.contentEl.createEl("p", {
      text: "到指定日期时，这段记录会重新浮现在当天的日记里。",
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
      if (!date) {
        new Notice("请选择浮标日期。");
        this.dateInput?.focus();
        return;
      }
      this.onPick(date);
      this.close();
    });
    this.dateInput.focus();
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
