import { Notice, setIcon } from "obsidian";

export interface ComposerOptions {
  tags: readonly string[];
  onSave(body: string): Promise<void>;
  onCreateLongform(body: string): void;
  onImportCheckboxes(): void;
  onInsertImage(file: File): Promise<string>;
  onInsertTimeBuoy(): void;
}

export class Composer {
  readonly el: HTMLElement;
  private readonly textarea: HTMLTextAreaElement;
  private readonly saveButton: HTMLButtonElement;
  private readonly toolbarButtons: HTMLButtonElement[];
  private readonly tagButtons: HTMLButtonElement[];

  constructor(parent: HTMLElement, private readonly options: ComposerOptions) {
    this.el = parent.createEl("section", {
      cls: "zss-composer",
      attr: { "aria-label": "记录输入" },
    });
    const inputArea = this.el.createDiv({ cls: "zss-composer-input-area" });
    this.textarea = inputArea.createEl("textarea", {
      attr: {
        "aria-label": "写下这一天的记录",
        placeholder: "此刻，想记下什么？",
      },
    });
    this.textarea.addEventListener("input", () => this.resize());
    this.textarea.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void this.save();
      }
    });

    const tagRow = inputArea.createDiv({ cls: "zss-composer-tag-row" });
    this.tagButtons = this.options.tags.map((tag) => {
      const button = tagRow.createEl("button", {
        cls: "zss-composer-tag",
        text: `#${tag.replace(/^#+/, "")}`,
        attr: { type: "button" },
      });
      button.addEventListener("click", () => this.appendTag(tag));
      return button;
    });

    const bar = inputArea.createDiv({ cls: "zss-composer-bar" });
    const tools = bar.createDiv({ cls: "zss-composer-tools" });
    this.toolbarButtons = [
      this.createTool(tools, "hash", "插入标签", () => this.insertText("#")),
      this.createTool(tools, "image", "插入图片", () => this.chooseImage()),
      this.createTool(tools, "calendar-clock", "添加时光浮标", () =>
        this.options.onInsertTimeBuoy(),
      ),
      this.createTool(tools, "list-todo", "导入原来的 Checkbox", () =>
        this.options.onImportCheckboxes(),
      ),
      this.createTool(tools, "file-text", "创建长文", () => this.createLongform()),
    ];

    const actions = bar.createDiv({ cls: "zss-composer-actions" });
    this.saveButton = actions.createEl("button", {
      cls: "zss-send-button",
      attr: { type: "button", "aria-label": "收进今天" },
    });
    setIcon(this.saveButton, "send");
    this.saveButton.addEventListener("click", () => void this.save());
  }

  focus(): void {
    this.focusSoon();
  }

  clear(): void {
    this.textarea.value = "";
    this.resize();
  }

  insertText(text: string): void {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    this.textarea.setRangeText(text, start, end, "end");
    this.textarea.focus();
    this.resize();
  }

  setDate(_dateText: string, state: "当下" | "曾经" | "未来", editable: boolean): void {
    this.textarea.readOnly = !editable;
    this.saveButton.disabled = !editable;
    this.toolbarButtons.forEach((button) => {
      button.disabled = !editable;
    });
    this.tagButtons.forEach((button) => {
      button.disabled = !editable;
    });
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

  private createTool(
    parent: HTMLElement,
    icon: string,
    label: string,
    action: () => void | Promise<void>,
  ): HTMLButtonElement {
    const button = parent.createEl("button", {
      cls: "zss-tool-button",
      attr: { type: "button", "aria-label": label, "data-tooltip": label },
    });
    setIcon(button, icon);
    button.addEventListener("click", () => void action());
    return button;
  }

  private createLongform(): void {
    const body = this.textarea.value.trim();
    if (!body) {
      new Notice("先写下正文，再创建长文。");
      this.textarea.focus();
      return;
    }
    this.options.onCreateLongform(body);
  }

  private chooseImage(): void {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      void this.options
        .onInsertImage(file)
        .then((markdown) => this.insertText(markdown))
        .catch((error) => {
          new Notice(error instanceof Error ? error.message : "插入图片失败。");
        });
    });
    fileInput.click();
  }

  private appendTag(tag: string): void {
    const normalized = tag.trim().replace(/^#+/, "");
    if (!normalized) return;
    const token = `#${normalized}`;
    if (this.textarea.value.includes(token)) {
      this.textarea.focus();
      return;
    }
    const start = this.textarea.selectionStart;
    const prefix =
      start > 0 && !/\s$/.test(this.textarea.value.slice(0, start)) ? " " : "";
    this.insertText(`${prefix}${token} `);
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
