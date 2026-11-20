import { Menu, Notice, Platform, setIcon } from "obsidian";
import { t } from "../i18n";
import { ComposerEditor } from "./ComposerEditor";
import { getTaskInsertion } from "./composerTasks";

export interface ComposerOptions {
  tags: readonly string[];
  onSave(body: string): Promise<void>;
  onUpdate(entryId: string, body: string): Promise<void>;
  onOpenRelations(): void;
  onOpenFutureTask(): void;
  onCreateLongform(body: string): void;
  onInsertImage(file: File): Promise<string>;
  resolveImage?(path: string): string | null;
}

export class Composer {
  readonly el: HTMLElement;
  private readonly editor: ComposerEditor;
  private readonly saveButton: HTMLButtonElement;
  private readonly cancelEditButton: HTMLButtonElement;
  private readonly saveLabel: HTMLSpanElement;
  private readonly toolbar: HTMLElement;
  private readonly toolbarButtons: HTMLButtonElement[];
  private readonly overflowButton: HTMLButtonElement;
  private readonly tagButtons: HTMLButtonElement[];
  private editable = true;
  private editingEntryId: string | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(parent: HTMLElement, private readonly options: ComposerOptions) {
    this.el = parent.createEl("section", {
      cls: "zss-composer",
      attr: { "aria-label": t("composer.writeLabel") },
    });
    const inputArea = this.el.createDiv({ cls: "zss-composer-input-area" });
    const editorHost = inputArea.createDiv({ cls: "zss-composer-editor-host" });
    this.editor = new ComposerEditor(
      editorHost,
      t("composer.writeLabel"),
      t("composer.writePlaceholder"),
      (value) => this.updateAvailability(value),
      this.options.resolveImage,
    );
    this.el.addEventListener("pointerdown", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("button, input, a, [role='menu']")) return;
      this.editor.focus();
    });
    this.editor.view.contentDOM.addEventListener("keydown", (event) => {
      const submitModifier = (event.metaKey || event.ctrlKey) && event.key === "Enter";
      const submitPlain =
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.isComposing &&
        !this.editor.view.composing;
      if (submitModifier || submitPlain) {
        event.preventDefault();
        event.stopPropagation();
        void this.save();
      }
    }, { capture: true });

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
    this.toolbar = tools;
    this.toolbarButtons = [
      this.createTool(tools, "hash", t("composer.tag"), () => this.insertText("#")),
      this.createTool(tools, "link-2", t("composer.relate"), () =>
        this.options.onOpenRelations(),
      ),
      this.createTool(tools, "image", t("composer.image"), () => this.chooseImage()),
      this.createTool(tools, "list-todo", t("composer.futureTask"), () =>
        this.options.onOpenFutureTask(),
      ),
      this.createTool(tools, "file-text", t("composer.longform"), () =>
        this.createLongform(),
      ),
    ];
    this.overflowButton = this.createTool(
      tools,
      "ellipsis",
      t("composer.more"),
      (event) => this.openToolbarOverflow(event),
    );
    this.overflowButton.hidden = true;

    const actions = bar.createDiv({ cls: "zss-composer-actions" });
    this.cancelEditButton = actions.createEl("button", {
      cls: "zss-cancel-button",
      text: t("composer.cancelEdit"),
      attr: { type: "button", "aria-label": t("composer.cancelEditAria") },
    });
    this.cancelEditButton.hidden = true;
    this.cancelEditButton.addEventListener("click", () => this.cancelEdit());
    this.saveButton = actions.createEl("button", {
      cls: "zss-send-button",
      attr: {
        type: "button",
        "aria-label": this.defaultSaveLabel(),
        "aria-keyshortcuts": "Enter Meta+Enter Control+Enter",
      },
    });
    const saveIcon = this.saveButton.createSpan({ cls: "zss-send-icon" });
    setIcon(saveIcon, "arrow-up");
    this.saveLabel = this.saveButton.createSpan({
      cls: "zss-send-label",
      text: this.defaultSaveLabel(),
    });
    this.saveButton.addEventListener("click", () => void this.save());
    this.updateAvailability("");
    this.observeToolbar();
  }

  focus(): void {
    this.focusSoon();
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this.scheduleToolbarRefresh);
    this.editor.destroy();
    this.el.remove();
  }

  clear(): void {
    this.cancelEdit(false);
    this.editor.reset();
  }

  insertText(text: string): void {
    this.editor.insertText(text);
  }

  insertTask(content = "", dueDate = ""): void {
    const suffix = [content.trim(), dueDate ? `@${dueDate}` : ""]
      .filter(Boolean)
      .join(" ");
    const insertion = getTaskInsertion(this.editor.value, this.editor.selectionStart);
    this.insertText(`${insertion.insert}${suffix}${suffix ? " " : ""}`);
  }

  beginEdit(entryId: string, body: string): void {
    this.editingEntryId = entryId;
    this.cancelEditButton.hidden = false;
    this.saveLabel.setText(t("composer.saveChanges"));
    this.saveButton.setAttribute("aria-label", t("composer.saveChanges"));
    this.editor.reset(body);
    this.editor.setPlaceholder(t("composer.editPlaceholder"));
    this.updateAvailability(body);
  }

  cancelEdit(clearEditor = true): void {
    this.editingEntryId = null;
    this.cancelEditButton.hidden = true;
    this.saveLabel.setText(this.defaultSaveLabel());
    this.saveButton.setAttribute("aria-label", this.defaultSaveLabel());
    this.editor.setPlaceholder(t("composer.writePlaceholder"));
    if (clearEditor) {
      this.editor.reset();
      this.updateAvailability("");
    }
  }

  setDate(_dateText: string, state: "当下" | "曾经" | "未来", editable: boolean): void {
    if (this.editingEntryId) this.cancelEdit();
    this.editable = editable;
    this.editor.setEditable(editable);
    this.toolbarButtons.forEach((button) => {
      button.disabled = !editable;
    });
    this.overflowButton.disabled = !editable;
    this.tagButtons.forEach((button) => {
      button.disabled = !editable;
    });
    this.editor.setPlaceholder(editable
      ? t("composer.writePlaceholder")
      : state === "曾经"
        ? t("composer.pastPlaceholder")
        : t("composer.futurePlaceholder"));
    this.updateAvailability(this.editor.value);
  }

  private async save(): Promise<void> {
    if (!this.editable) return;
    const body = this.editor.value.trim();
    if (!body) {
      new Notice(t("composer.empty"));
      this.editor.focus();
      return;
    }

    this.saveButton.disabled = true;
    try {
      if (this.editingEntryId) {
        await this.options.onUpdate(this.editingEntryId, body);
      } else {
        await this.options.onSave(body);
      }
      this.clear();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : t("composer.saveFailed"));
    } finally {
      this.updateAvailability(this.editor.value);
      this.focusSoon();
    }
  }

  private createTool(
    parent: HTMLElement,
    icon: string,
    label: string,
    action: (event: MouseEvent) => void | Promise<void>,
  ): HTMLButtonElement {
    const button = parent.createEl("button", {
      cls: "zss-tool-button",
      attr: { type: "button", "aria-label": label, "data-tooltip": label },
    });
    const iconEl = button.createSpan({ cls: "zss-tool-icon" });
    setIcon(iconEl, icon);
    button.createSpan({ cls: "zss-tool-label", text: label });
    button.addEventListener("click", (event) => void action(event));
    return button;
  }

  private createLongform(): void {
    const body = this.editor.value.trim();
    if (!body) {
      new Notice(t("composer.longformNeedsBody"));
      this.editor.focus();
      return;
    }
    this.options.onCreateLongform(body);
  }

  private observeToolbar(): void {
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.refreshToolbarOverflow());
      this.resizeObserver.observe(this.toolbar);
    }
    window.addEventListener("resize", this.scheduleToolbarRefresh);
    this.scheduleToolbarRefresh();
  }

  private readonly scheduleToolbarRefresh = (): void => {
    window.setTimeout(() => this.refreshToolbarOverflow(), 0);
  };

  private refreshToolbarOverflow(): void {
    this.toolbarButtons.forEach((button) => {
      button.hidden = false;
    });
    this.overflowButton.hidden = true;
    if (this.toolbar.scrollWidth <= this.toolbar.clientWidth) return;

    this.overflowButton.hidden = false;
    for (let index = this.toolbarButtons.length - 1; index >= 0; index -= 1) {
      this.toolbarButtons[index].hidden = true;
      if (this.toolbar.scrollWidth <= this.toolbar.clientWidth) break;
    }
  }

  private openToolbarOverflow(event: MouseEvent): void {
    const menu = new Menu();
    this.toolbarButtons
      .filter((button) => button.hidden && !button.disabled)
      .forEach((button) => {
        menu.addItem((item) => {
          item
            .setTitle(button.getAttribute("aria-label") ?? button.textContent ?? "")
            .onClick(() => button.click());
        });
      });
    menu.showAtMouseEvent(event);
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
          new Notice(error instanceof Error ? error.message : t("journal.imageInsertFailed"));
        });
    });
    fileInput.click();
  }

  private appendTag(tag: string): void {
    const normalized = tag.trim().replace(/^#+/, "");
    if (!normalized) return;
    const token = `#${normalized}`;
    if (this.editor.value.includes(token)) {
      this.editor.focus();
      return;
    }
    const start = this.editor.selectionStart;
    const prefix =
      start > 0 && !/\s$/.test(this.editor.value.slice(0, start)) ? " " : "";
    this.insertText(`${prefix}${token} `);
  }

  private focusSoon(): void {
    window.setTimeout(() => {
      this.editor.focus();
    }, 0);
  }

  private updateAvailability(value: string): void {
    const hasContent = value.trim().length > 0;
    this.el.toggleAttribute("data-empty", !hasContent);
    this.saveButton.disabled = !this.editable || !hasContent;
  }

  private defaultSaveLabel(): string {
    return Platform.isMobile ? t("composer.send") : t("composer.saveToday");
  }
}
