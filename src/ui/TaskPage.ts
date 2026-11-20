import { Notice } from "obsidian";
import type { CheckboxCandidate } from "../services/CheckboxService";
import type { AppShell } from "./AppShell";
import { dateKey } from "./CalendarMonth";
import { FutureTaskModal } from "./FutureTaskModal";

export class TaskPage {
  private host: HTMLElement | null = null;

  constructor(private readonly shell: AppShell) {}

  async render(container: HTMLElement): Promise<void> {
    container.empty();
    this.host = container;
    const head = container.createDiv({ cls: "zss-page-heading" });
    const copy = head.createDiv();
    copy.createEl("h1", { text: "待办" });
    copy.createSpan({ text: "普通 Checkbox 与「来日」任务统一汇总。" });
    const add = head.createEl("button", {
      cls: "zss-primary-button",
      text: "＋ 来日",
      attr: { type: "button" },
    });
    add.addEventListener("click", () => this.openFutureTask());
    await this.reload();
  }

  private async reload(): Promise<void> {
    if (!this.host) return;
    const all = await this.shell.options.services.checkboxes.listSources();
    const pending = all.filter((item) => !item.checked);
    const future = pending
      .filter((item) => item.dueDate)
      .sort((first, second) => (first.dueDate ?? "").localeCompare(second.dueDate ?? ""));
    const regular = pending.filter((item) => !item.dueDate);
    const lists = this.host.querySelectorAll(".zss-task-results");
    lists.forEach((list) => list.remove());
    const results = this.host.createDiv({ cls: "zss-task-results" });
    const metrics = results.createDiv({ cls: "zss-stats-metrics" });
    this.metric(metrics, future.length, "来日");
    this.metric(metrics, regular.length, "普通待办");
    this.metric(metrics, all.length - pending.length, "已完成");
    this.renderGroup(results, "来日", future);
    this.renderGroup(results, "普通待办", regular);
  }

  private renderGroup(
    parent: HTMLElement,
    title: string,
    items: readonly CheckboxCandidate[],
  ): void {
    const section = parent.createEl("section", { cls: "zss-task-group" });
    const head = section.createDiv({ cls: "zss-section-title" });
    head.createEl("strong", { text: title });
    head.createSpan({ text: `${items.length} 件` });
    if (!items.length) {
      section.createDiv({ cls: "zss-empty", text: "没有待处理项目。" });
      return;
    }
    items.forEach((item) => {
      const row = section.createDiv({ cls: "zss-task-row" });
      const checkbox = row.createEl("input", {
        attr: { type: "checkbox", "aria-label": item.text },
      });
      checkbox.addEventListener("change", async () => {
        checkbox.disabled = true;
        try {
          await this.shell.options.services.checkboxes.setChecked(
            item.date,
            item.lineIndex,
            checkbox.checked,
          );
          await this.reload();
        } catch (error) {
          checkbox.checked = false;
          checkbox.disabled = false;
          new Notice(error instanceof Error ? error.message : "更新待办失败。");
        }
      });
      const copy = row.createDiv({ cls: "zss-task-copy" });
      copy.createSpan({
        text: item.dueDate ? item.text.replace(`@${item.dueDate}`, "").trim() : item.text,
      });
      copy.createEl("small", {
        text: item.dueDate
          ? `来日 ${item.dueDate} · 来自 ${item.date}`
          : `来自 ${item.date}`,
      });
      if (item.dueDate) {
        row.createSpan({ cls: "zss-task-date", text: item.dueDate.slice(5) });
      }
      const open = row.createEl("button", {
        cls: "zss-text-button",
        text: "来源",
        attr: { type: "button" },
      });
      open.addEventListener("click", () => this.shell.openDate(item.date));
    });
  }

  private metric(parent: HTMLElement, value: number, label: string): void {
    const card = parent.createDiv({ cls: "zss-stat-card" });
    card.createEl("strong", { text: String(value) });
    card.createSpan({ text: label });
  }

  private openFutureTask(): void {
    new FutureTaskModal(this.shell.options.app, async (task, date) => {
      await this.shell.options.services.checkboxes.importToDay(dateKey(new Date()), [
        {
          lineIndex: -1,
          checked: false,
          text: `${task} @${date}`,
          dueDate: date,
        },
      ]);
      await this.reload();
      new Notice("已加入待办，并安排到来日。");
    }).open();
  }
}
