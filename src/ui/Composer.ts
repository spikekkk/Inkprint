import { Notice, setIcon } from "obsidian";

export interface ComposerOptions {
  onSave(body: string): Promise<void>;
}

export class Composer {
  readonly el: HTMLElement;
  private readonly textarea: HTMLTextAreaElement;
  private readonly dateLabel: HTMLElement;
  private readonly stateLabel: HTMLElement;
  private readonly saveButton: HTMLButtonElement;
  private readonly tags: string[] = [];

  constructor(parent: HTMLElement, private readonly options: ComposerOptions) {
    this.el = parent.createEl("section", {
      cls: "zss-composer",
      attr: { "aria-label": "记录输入" },
    });
    const dateRow = this.el.createDiv({ cls: "zss-composer-date" });
    this.dateLabel = dateRow.createSpan();
    this.stateLabel = dateRow.createSpan();

    this.textarea = this.el.createEl("textarea", {
      attr: {
        "aria-label": "写下这一天的记录",
        placeholder: "此刻，想记下什么？",
      },
    });
    this.textarea.addEventListener("input", () => this.resize());

    const prompts = this.el.createDiv({ cls: "zss-prompt-row" });
    for (const tag of ["此刻的心情", "对明天说句话", "最想记录的瞬间"]) {
      const button = prompts.createEl("button", {
        cls: "zss-prompt",
        text: `#${tag}`,
        attr: { type: "button" },
      });
      button.addEventListener("click", () => this.appendTag(tag));
    }

    const footer = this.el.createDiv({ cls: "zss-composer-footer" });
    const tools = footer.createDiv({ cls: "zss-composer-tools" });
    const tagButton = tools.createEl("button", {
      cls: "zss-tool-button",
      attr: { type: "button", "aria-label": "添加标签" },
    });
    setIcon(tagButton, "hash");
    tagButton.createSpan({ text: "标签" });
    tagButton.addEventListener("click", () => this.appendTag("待整理"));

    this.saveButton = footer.createEl("button", {
      cls: "zss-save-button",
      text: "收进今天",
      attr: { type: "button" },
    });
    this.saveButton.addEventListener("click", () => void this.save());
  }

  focus(): void {
    this.focusSoon();
  }

  clear(): void {
    this.textarea.value = "";
    this.tags.length = 0;
    this.resize();
  }

  setDate(dateText: string, state: "当下" | "曾经" | "未来", editable: boolean): void {
    this.dateLabel.setText(dateText);
    this.stateLabel.setText(state);
    this.textarea.readOnly = !editable;
    this.saveButton.disabled = !editable;
    this.textarea.placeholder = editable
      ? "此刻，想记下什么？"
      : state === "曾经"
        ? "这一天的记录只读，可以查看留下的时间线。"
        : "这一天尚未到来，先看看已有计划。";
  }

  private async save(): Promise<void> {
    const body = this.textarea.value.trim();
    if (!body) {
      new Notice("先写下一点内容，再收进今天。");
      this.textarea.focus();
      return;
    }

    this.saveButton.disabled = true;
    try {
      await this.options.onSave(body);
      this.clear();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "保存失败，请重试。");
    } finally {
      this.saveButton.disabled = false;
      this.focusSoon();
    }
  }

  private appendTag(tag: string): void {
    const normalized = tag.replace(/^#+/, "");
    if (!this.tags.includes(normalized)) this.tags.push(normalized);
    const token = `#${normalized}`;
    const start = this.textarea.selectionStart;
    const prefix =
      start > 0 && !/\s$/.test(this.textarea.value.slice(0, start)) ? " " : "";
    if (!this.textarea.value.includes(token)) {
      this.textarea.setRangeText(`${prefix}${token} `, start, this.textarea.selectionEnd, "end");
    }
    this.textarea.focus();
    this.resize();
  }

  private resize(): void {
    this.textarea.style.height = "auto";
    this.textarea.style.height = `${this.textarea.scrollHeight}px`;
  }

  private focusSoon(): void {
    window.setTimeout(() => {
      this.textarea.focus();
      this.resize();
    }, 0);
  }
}
