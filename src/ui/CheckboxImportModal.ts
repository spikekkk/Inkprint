import { Modal, Notice, type App } from "obsidian";
import type {
  CheckboxCandidate,
  CheckboxService,
  DailyCheckbox,
} from "../services/CheckboxService";

export class CheckboxImportModal extends Modal {
  private readonly selected = new Set<string>();
  private importButton: HTMLButtonElement | null = null;
  private listEl: HTMLElement | null = null;
  private query = "";

  constructor(
    app: App,
    private readonly service: CheckboxService,
    private readonly targetDate: string,
    private readonly candidates: readonly CheckboxCandidate[],
    private readonly onImported: () => void | Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass("zss-checkbox-import-modal");
    this.contentEl.createEl("h2", { text: "导入原来的 Checkbox" });
    this.contentEl.createEl("p", {
      text: `从已有日记中手动选择待办，导入到 ${this.targetDate}。导入后仍使用标准 Markdown checkbox。`,
    });

    const search = this.contentEl.createEl("input", {
      cls: "zss-checkbox-import-search",
      attr: {
        type: "search",
        placeholder: "搜索 checkbox 内容或日期",
        "aria-label": "搜索 checkbox",
      },
    });
    search.addEventListener("input", () => {
      this.query = search.value.trim().toLocaleLowerCase("zh-CN");
      this.renderList();
    });
    this.listEl = this.contentEl.createDiv({ cls: "zss-checkbox-import-list" });

    const actions = this.contentEl.createDiv({ cls: "zss-form-actions" });
    const cancel = actions.createEl("button", {
      text: "取消",
      attr: { type: "button" },
    });
    cancel.addEventListener("click", () => this.close());
    this.importButton = actions.createEl("button", {
      cls: "mod-cta",
      text: "导入选中项",
      attr: { type: "button" },
    });
    this.importButton.disabled = true;
    this.importButton.addEventListener("click", () => void this.importSelected());

    this.renderList();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderList(): void {
    if (!this.listEl) return;
    this.listEl.empty();
    const filtered = this.candidates.filter((item) => {
      if (!this.query) return true;
      return `${item.date}\n${item.text}`.toLocaleLowerCase("zh-CN").includes(this.query);
    });
    if (!filtered.length) {
      this.listEl.createDiv({
        cls: "zss-empty",
        text: this.candidates.length ? "没有匹配的 Checkbox。" : "已有日记中没有找到 Checkbox。",
      });
      return;
    }

    filtered.slice(0, 300).forEach((item) => {
      const key = `${item.filePath}:${item.lineIndex}`;
      const label = this.listEl!.createEl("label", { cls: "zss-checkbox-source-row" });
      const checkbox = label.createEl("input", {
        attr: { type: "checkbox", "aria-label": item.text },
      });
      checkbox.checked = this.selected.has(key);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) this.selected.add(key);
        else this.selected.delete(key);
        this.syncImportButton();
      });
      const copy = label.createSpan({ cls: "zss-checkbox-source-copy" });
      copy.createEl("strong", { text: item.text });
      copy.createEl("span", { text: item.date });
    });
    this.syncImportButton();
  }

  private syncImportButton(): void {
    if (!this.importButton) return;
    this.importButton.disabled = this.selected.size === 0;
    this.importButton.setText(
      this.selected.size ? `导入 ${this.selected.size} 项` : "导入选中项",
    );
  }

  private async importSelected(): Promise<void> {
    const items = this.candidates
      .filter((item) => this.selected.has(`${item.filePath}:${item.lineIndex}`))
      .map<DailyCheckbox>((item) => ({
        lineIndex: item.lineIndex,
        checked: item.checked,
        text: item.text,
      }));
    if (!items.length) return;
    if (this.importButton) this.importButton.disabled = true;
    try {
      await this.service.importToDay(this.targetDate, items);
      await this.onImported();
      this.close();
      new Notice(`已导入 ${items.length} 个 Checkbox。`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "导入失败。");
      this.syncImportButton();
    }
  }
}
