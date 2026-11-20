import { Notice } from "obsidian";
import { buildTaskText } from "../domain/taskDraft";
import { filterTasksByRange, type TaskRange } from "../domain/taskRange";
import { summarizeTasks } from "../domain/taskSummary";
import type { CheckboxCandidate } from "../services/CheckboxService";
import type { AppShell } from "./AppShell";
import { dateKey } from "./CalendarMonth";
import { t } from "../i18n";

export class TaskPage {
  private host: HTMLElement | null = null;
  private range: TaskRange = "week";
  private creator: HTMLElement | null = null;
  private taskInput: HTMLInputElement | null = null;
  private dateInput: HTMLInputElement | null = null;
  private addButton: HTMLButtonElement | null = null;

  constructor(private readonly shell: AppShell) {}

  async render(container: HTMLElement): Promise<void> {
    container.empty();
    this.host = container;
    const head = container.createDiv({ cls: "zss-page-heading" });
    const copy = head.createDiv();
    copy.createEl("h1", { text: t("tasks.title") });
    copy.createSpan({ text: t("tasks.desc") });
    const add = head.createEl("button", {
      cls: "zss-primary-button",
      text: t("tasks.new"),
      attr: { type: "button" },
    });
    this.addButton = add;
    add.addEventListener("click", () => this.openTaskCreator());
    this.creator = container.createEl("section", {
      cls: "zss-task-creator",
      attr: { "aria-label": t("tasks.new") },
    });
    this.creator.hidden = true;
    this.renderTaskCreator(this.creator);
    await this.reload();
  }

  private async reload(): Promise<void> {
    if (!this.host) return;
    const all = await this.shell.options.services.checkboxes.listSources();
    const today = dateKey(new Date());
    const ranged = filterTasksByRange(
      all,
      this.range,
      today,
      this.shell.options.settings.weekStartsOn,
    );
    const summary = summarizeTasks(ranged, today);
    const pending = all.filter((item) => !item.checked);
    const scheduled = pending
      .filter((item) => item.dueDate)
      .sort((first, second) => (first.dueDate ?? "").localeCompare(second.dueDate ?? ""));
    const regular = pending.filter((item) => !item.dueDate);
    const lists = this.host.querySelectorAll(".zss-task-results");
    lists.forEach((list) => list.remove());
    const results = this.host.createDiv({ cls: "zss-task-results" });
    results.setAttribute("aria-live", "polite");
    if (!pending.length) {
      if (all.length) this.renderOverview(results, summary);
      this.renderEmpty(results, all.length > 0);
      return;
    }
    if (all.length) this.renderOverview(results, summary);
    this.renderGroup(results, t("tasks.scheduledGroup"), scheduled, today);
    this.renderGroup(results, t("tasks.regularGroup"), regular, today);
  }

  private renderGroup(
    parent: HTMLElement,
    title: string,
    items: readonly CheckboxCandidate[],
    today: string,
  ): void {
    const section = parent.createEl("section", { cls: "zss-task-group" });
    const head = section.createDiv({ cls: "zss-section-title" });
    head.createEl("strong", { text: title });
    head.createSpan({ text: t("journal.futureTaskCount", { count: items.length }) });
    if (!items.length) {
      section.createDiv({
        cls: "zss-task-group-empty",
        text:
          title === t("tasks.scheduledGroup")
            ? t("tasks.scheduledEmpty")
            : t("tasks.regularEmpty"),
      });
      return;
    }
    items.forEach((item) => {
      const row = section.createEl("label", { cls: "zss-task-row" });
      row.classList.toggle("is-overdue", !!item.dueDate && item.dueDate < today);
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
          row.classList.add("is-completing");
          window.setTimeout(() => void this.reload(), 160);
        } catch (error) {
          checkbox.checked = false;
          checkbox.disabled = false;
          new Notice(error instanceof Error ? error.message : t("tasks.updateFailed"));
        }
      });
      const copy = row.createDiv({ cls: "zss-task-copy" });
      copy.createSpan({
        text: item.dueDate ? item.text.replace(`@${item.dueDate}`, "").trim() : item.text,
      });
      copy.createEl("small", {
        text: item.dueDate
          ? t("tasks.scheduledOn", { date: item.dueDate, date2: item.date })
          : t("tasks.recordedOn", { date: item.date }),
      });
      if (item.dueDate) {
        row.createSpan({
          cls: "zss-task-date",
          text:
            item.dueDate === today
              ? t("tasks.today")
              : item.dueDate < today
                ? t("tasks.overdue", { count: item.dueDate.slice(5) })
                : item.dueDate.slice(5),
        });
      }
    });
  }

  private renderOverview(
    parent: HTMLElement,
    summary: ReturnType<typeof summarizeTasks>,
  ): void {
    const overview = parent.createEl("section", {
      cls: "zss-task-overview",
      attr: { "aria-label": t("stats.overview") },
    });
    const head = overview.createDiv({ cls: "zss-task-overview-head" });
    const title = head.createDiv({ cls: "zss-task-overview-title" });
    title.createEl("strong", { text: t("stats.overview") });
    title.createSpan({ text: t("journal.futureTaskCount", { count: summary.total }) });
    const ranges = head.createDiv({
      cls: "zss-task-range",
      attr: { role: "group", "aria-label": t("stats.title") },
    });
    (
      [
        ["week", t("stats.week")],
        ["month", t("stats.month")],
        ["all", t("tasks.all")],
      ] as const
    ).forEach(([range, label]) => {
      const button = ranges.createEl("button", {
        text: label,
        attr: {
          type: "button",
          "aria-pressed": String(this.range === range),
        },
      });
      button.classList.toggle("is-active", this.range === range);
      button.addEventListener("click", () => {
        if (this.range === range) return;
        this.range = range;
        void this.reload();
      });
    });

    const metrics = overview.createDiv({ cls: "zss-task-metrics" });
    this.metric(metrics, String(summary.pending), t("tasks.pending"));
    this.metric(metrics, String(summary.dueToday), t("tasks.today"));
    this.metric(metrics, `${summary.completionRate}%`, t("tasks.completion"));

    const progress = overview.createDiv({ cls: "zss-task-progress" });
    const track = progress.createDiv({
      cls: "zss-task-progress-track",
      attr: {
        role: "progressbar",
        "aria-label": t("tasks.completion"),
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(summary.completionRate),
      },
    });
    const fill = track.createSpan();
    fill.style.setProperty("--zss-progress", `${summary.completionRate}%`);

    const foot = overview.createDiv({ cls: "zss-task-overview-foot" });
    foot.createSpan({ text: t("tasks.completed", { count: summary.completed }) });
    foot.createSpan({ text: t("tasks.scheduled", { count: summary.scheduled }) });
    const overdue = foot.createSpan({
      text:
        summary.overdue
          ? t("tasks.overdue", { count: summary.overdue })
          : t("tasks.noOverdue"),
    });
    overdue.classList.toggle("is-warning", summary.overdue > 0);
  }

  private metric(parent: HTMLElement, value: string, label: string): void {
    const item = parent.createDiv({ cls: "zss-task-metric" });
    item.createEl("strong", { text: value });
    item.createSpan({ text: label });
  }

  private renderEmpty(parent: HTMLElement, hasHistory: boolean): void {
    const empty = parent.createEl("section", { cls: "zss-task-empty" });
    empty.createEl("strong", {
      text: hasHistory ? t("tasks.emptyAllDone") : t("tasks.empty"),
    });
    empty.createSpan({
      text: hasHistory
        ? t("tasks.emptyHint")
        : t("tasks.emptyHintFirst"),
    });
    const add = empty.createEl("button", {
      cls: "zss-text-button",
      text: t("tasks.new"),
      attr: { type: "button" },
    });
    add.addEventListener("click", () => this.openTaskCreator());
  }

  private renderTaskCreator(container: HTMLElement): void {
    const form = container.createEl("form", { cls: "zss-task-creator-form" });
    const head = form.createDiv({ cls: "zss-task-creator-head" });
    const copy = head.createDiv();
    copy.createEl("strong", { text: t("tasks.new") });
    copy.createSpan({ text: t("tasks.desc") });
    const close = head.createEl("button", {
      cls: "zss-icon-button",
      attr: { type: "button", "aria-label": t("common.close") },
    });
    close.setText("×");
    close.addEventListener("click", () => this.closeTaskCreator());

    const fields = form.createDiv({ cls: "zss-task-creator-fields" });
    const taskField = fields.createEl("label", { cls: "zss-task-creator-main" });
    taskField.createSpan({ text: t("tasks.task") });
    this.taskInput = taskField.createEl("input", {
      attr: {
        type: "text",
        placeholder: t("tasks.taskPlaceholder"),
        "aria-label": t("tasks.task"),
      },
    });
    const dateField = fields.createEl("label", { cls: "zss-task-creator-date" });
    dateField.createSpan({ text: t("tasks.dateOptional") });
    this.dateInput = dateField.createEl("input", {
      attr: { type: "date", "aria-label": t("tasks.dateOptional") },
    });

    const actions = form.createDiv({ cls: "zss-task-creator-actions" });
    const cancel = actions.createEl("button", {
      cls: "zss-text-button",
      text: t("common.cancel"),
      attr: { type: "button" },
    });
    cancel.addEventListener("click", () => this.closeTaskCreator());
    const create = actions.createEl("button", {
      cls: "zss-primary-button",
      text: t("tasks.create"),
      attr: { type: "submit" },
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.createTask(create);
    });
    form.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeTaskCreator();
      }
    });
  }

  private openTaskCreator(): void {
    if (!this.creator) return;
    this.creator.hidden = false;
    this.taskInput?.focus();
  }

  private closeTaskCreator(): void {
    if (!this.creator) return;
    this.creator.hidden = true;
    this.taskInput?.blur();
    this.addButton?.focus();
  }

  private async createTask(button: HTMLButtonElement): Promise<void> {
    const task = this.taskInput?.value.trim() ?? "";
    const date = this.dateInput?.value ?? "";
    if (!task) {
      new Notice(t("tasks.needsContent"));
      this.taskInput?.focus();
      return;
    }

    button.disabled = true;
    try {
      await this.shell.options.services.checkboxes.appendToDay(dateKey(new Date()), [
        {
          lineIndex: -1,
          checked: false,
          text: buildTaskText(task, date),
          ...(date ? { dueDate: date } : {}),
        },
      ]);
      if (this.taskInput) this.taskInput.value = "";
      if (this.dateInput) this.dateInput.value = "";
      this.closeTaskCreator();
      await this.reload();
      new Notice(t("tasks.created"));
    } catch (error) {
      new Notice(error instanceof Error ? error.message : t("composer.saveFailed"));
    } finally {
      button.disabled = false;
    }
  }
}
