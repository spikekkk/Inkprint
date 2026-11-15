import { Notice } from "obsidian";
import { parseDailyEntries } from "../domain/dailyEntry";
import { createEntryId, createRandomSuffix } from "../domain/ids";
import type { DailyEntry } from "../domain/types";
import type { ZhenshangshuSettings } from "../settings/defaults";
import type { AppShell } from "./AppShell";
import { CalendarMonth, dateKey, type CalendarDay } from "./CalendarMonth";
import { Composer } from "./Composer";
import { LongformModal } from "./LongformModal";

export class JournalPage {
  private year: number;
  private monthIndex: number;
  private selectedDateKey: string;
  private readonly entriesByDay = new Map<string, DailyEntry[]>();
  private calendarHost: HTMLElement | null = null;
  private timelineHost: HTMLElement | null = null;
  private quickChecksHost: HTMLElement | null = null;
  private monthTitle: HTMLElement | null = null;
  private composer: Composer | null = null;

  constructor(
    private readonly shell: AppShell,
    private readonly settings: ZhenshangshuSettings,
  ) {
    const today = new Date();
    this.year = today.getFullYear();
    this.monthIndex = today.getMonth();
    this.selectedDateKey = dateKey(today);
  }

  async render(container: HTMLElement): Promise<void> {
    container.empty();
    const header = container.createDiv({ cls: "zss-page-heading" });
    const copy = header.createDiv();
    copy.createEl("h1", { text: "今天" });
    copy.createSpan({ text: "在日历里选一天，再写进当天的 Markdown。" });

    const monthCard = container.createEl("section", {
      cls: "zss-calendar-card",
      attr: { "aria-label": "日记日历" },
    });
    const monthHead = monthCard.createDiv({ cls: "zss-calendar-head" });
    const previous = monthHead.createEl("button", {
      cls: "zss-icon-button",
      attr: { type: "button", "aria-label": "上个月" },
    });
    previous.setText("‹");
    this.monthTitle = monthHead.createEl("strong");
    const next = monthHead.createEl("button", {
      cls: "zss-icon-button",
      attr: { type: "button", "aria-label": "下个月" },
    });
    next.setText("›");
    previous.addEventListener("click", () => this.changeMonth(-1));
    next.addEventListener("click", () => this.changeMonth(1));

    const weekdays = monthCard.createDiv({ cls: "zss-weekdays", attr: { "aria-hidden": "true" } });
    const labels =
      this.settings.weekStartsOn === "monday"
        ? ["一", "二", "三", "四", "五", "六", "日"]
        : ["日", "一", "二", "三", "四", "五", "六"];
    labels.forEach((label) => weekdays.createSpan({ text: label }));
    this.calendarHost = monthCard.createDiv({ cls: "zss-calendar" });
    this.updateMonthTitle();

    this.composer = new Composer(container, {
      onSave: (body) => this.saveEntry(body),
      onCreateLongform: (body) => this.openLongformModal(body),
    });
    this.quickChecksHost = container.createDiv({ cls: "zss-quick-checks" });
    const timeline = container.createEl("section", {
      cls: "zss-timeline",
      attr: { "aria-label": "当天记录" },
    });
    this.timelineHost = timeline;

    this.shell.setTodayHandler(() => this.selectToday());
    this.shell.setDateHandler((key) => void this.selectDate(key));
    await this.loadMonth();
    this.renderCalendar();
    await this.showSelectedDay();
  }

  private async changeMonth(delta: number): Promise<void> {
    const date = new Date(this.year, this.monthIndex + delta, 1, 12);
    this.year = date.getFullYear();
    this.monthIndex = date.getMonth();
    const targetMonth = String(this.monthIndex + 1).padStart(2, "0");
    const preferred = `${this.year}-${targetMonth}-${String(
      Math.min(new Date(this.year, this.monthIndex + 1, 0).getDate(), 14),
    ).padStart(2, "0")}`;
    this.selectedDateKey = preferred;
    this.updateMonthTitle();
    await this.loadMonth();
    this.renderCalendar();
    await this.showSelectedDay();
  }

  private async loadMonth(): Promise<void> {
    const days = CalendarMonth.build(
      this.year,
      this.monthIndex,
      this.settings.weekStartsOn,
    ).filter((day) => day.inCurrentMonth);
    await Promise.all(
      days.map(async (day) => {
        if (this.entriesByDay.has(day.key)) return;
        const markdown = await this.shell.options.services.daily.read(day.key);
        this.entriesByDay.set(day.key, parseDailyEntries(markdown));
      }),
    );
  }

  private renderCalendar(): void {
    if (!this.calendarHost || !this.composer) return;
    this.calendarHost.empty();
    const days = CalendarMonth.build(
      this.year,
      this.monthIndex,
      this.settings.weekStartsOn,
    );
    const today = dateKey(new Date());

    for (let index = 0; index < days.length; index += 7) {
      const week = this.calendarHost.createDiv({ cls: "zss-calendar-week" });
      for (const day of days.slice(index, index + 7)) {
        this.renderDay(week, day, today);
      }
      if (days.slice(index, index + 7).some((day) => day.key === this.selectedDateKey)) {
        week.appendChild(this.composer.el);
      }
    }
  }

  private renderDay(parent: HTMLElement, day: CalendarDay, today: string): void {
    const button = parent.createEl("button", {
      cls: "zss-calendar-day",
      attr: {
        type: "button",
        "aria-label": `${day.year} 年 ${day.monthIndex + 1} 月 ${day.day} 日`,
      },
    });
    if (!day.inCurrentMonth) button.addClass("is-outside");
    if (day.key === today) button.addClass("is-today");
    if (day.key === this.selectedDateKey) {
      button.addClass("is-selected");
      button.setAttribute("aria-pressed", "true");
    }
    button.createSpan({ cls: "zss-calendar-number", text: String(day.day) });
    const count = this.entriesByDay.get(day.key)?.length ?? 0;
    if (count) {
      button.createSpan({
        cls: "zss-calendar-marker",
        text: count > 1 ? `${count} 条` : "记录",
      });
    }
    button.addEventListener("click", () => {
      this.selectedDateKey = day.key;
      this.renderCalendar();
      void this.showSelectedDay();
    });
  }

  private async showSelectedDay(): Promise<void> {
    if (!this.timelineHost || !this.composer) return;
    const selected = new Date(`${this.selectedDateKey}T12:00:00`);
    const today = dateKey(new Date());
    const isToday = this.selectedDateKey === today;
    const isPast = this.selectedDateKey < today;
    const dateText = `${selected.getMonth() + 1} 月 ${selected.getDate()} 日 · 周${
      "日一二三四五六"[selected.getDay()]
    }`;
    this.composer.setDate(
      isToday ? `今天 · ${dateText}` : dateText,
      isToday ? "当下" : isPast ? "曾经" : "未来",
      isToday,
    );
    this.composer.el.toggleAttribute("data-zss-today-composer", isToday);

    if (!this.entriesByDay.has(this.selectedDateKey)) {
      const markdown = await this.shell.options.services.daily.read(this.selectedDateKey);
      this.entriesByDay.set(this.selectedDateKey, parseDailyEntries(markdown));
    }
    this.renderTimeline(this.entriesByDay.get(this.selectedDateKey) ?? []);
    await this.renderQuickChecks();
  }

  private renderTimeline(entries: DailyEntry[]): void {
    if (!this.timelineHost) return;
    this.timelineHost.empty();
    if (!entries.length) {
      this.timelineHost.createDiv({
        cls: "zss-empty",
        text: this.selectedDateKey < dateKey(new Date())
          ? "这一天没有留下记录。可以从今天的输入框写一条回望。"
          : "还没有记录。",
      });
      return;
    }

    for (const entry of entries) {
      const item = this.timelineHost.createEl("article", { cls: "zss-entry" });
      const meta = item.createDiv({ cls: "zss-entry-meta" });
      meta.createEl("time", { text: entry.createdAt.match(/T(\d{2}:\d{2})/)?.[1] ?? "" });
      meta.createSpan({ text: entry.kind === "longform-ref" ? "长文" : "此刻" });
      item.createEl("p", { text: entry.body });
      if (entry.tags.length) {
        const tags = item.createDiv({ cls: "zss-entry-tags" });
        entry.tags.forEach((tag) => tags.createSpan({ text: `#${tag}` }));
      }
    }
  }

  private async saveEntry(body: string): Promise<void> {
    const now = new Date();
    const entryId = createEntryId(now, createRandomSuffix());
    const tags = Array.from(body.matchAll(/#([^\s#]+)/g), (match) => match[1]);
    await this.shell.options.services.daily.append(this.selectedDateKey, {
      entryId,
      createdAt: localTimestamp(now),
      body,
      tags,
    });
    const markdown = await this.shell.options.services.daily.read(this.selectedDateKey);
    this.entriesByDay.set(this.selectedDateKey, parseDailyEntries(markdown));
    this.renderCalendar();
    this.renderTimeline(this.entriesByDay.get(this.selectedDateKey) ?? []);
    await this.renderQuickChecks();
    new Notice("已收进今天的日记。");
  }

  private selectToday(): void {
    const today = new Date();
    this.year = today.getFullYear();
    this.monthIndex = today.getMonth();
    this.selectedDateKey = dateKey(today);
    this.updateMonthTitle();
    void this.loadMonth().then(() => {
      this.renderCalendar();
      return this.showSelectedDay();
    });
  }

  private async selectDate(key: string): Promise<void> {
    const date = new Date(`${key}T12:00:00`);
    if (Number.isNaN(date.getTime())) return;
    this.year = date.getFullYear();
    this.monthIndex = date.getMonth();
    this.selectedDateKey = key;
    this.updateMonthTitle();
    await this.loadMonth();
    this.renderCalendar();
    await this.showSelectedDay();
  }

  private openLongformModal(body: string): void {
    new LongformModal(this.shell.options.app, body, async (title) => {
      const now = new Date();
      const sourceEntryId = createEntryId(now, createRandomSuffix());
      const createdAt = localTimestamp(now);
      const result = await this.shell.options.services.longform.create({
        title,
        body,
        sourceEntryId,
        journalDay: this.selectedDateKey,
      });
      await this.shell.options.services.daily.append(this.selectedDateKey, {
        entryId: sourceEntryId,
        createdAt,
        body: `创建长文：${title}\n\n${result.link}`,
        tags: ["长文"],
        kind: "longform-ref",
        longformPath: result.path,
      });
      this.entriesByDay.delete(this.selectedDateKey);
      this.composer?.clear();
      await this.showSelectedDay();
      this.shell.invalidatePage("content");
      new Notice("长文已创建，Daily 入口和引用已保留。");
    }).open();
  }

  private async renderQuickChecks(): Promise<void> {
    if (!this.quickChecksHost) return;
    this.quickChecksHost.empty();
    if (this.selectedDateKey !== dateKey(new Date())) return;
    const completedTaskIds =
      await this.shell.options.services.checkin.getCompletedTaskIds(this.selectedDateKey);
    const goals = (await this.shell.options.services.goals.load()).map((node) =>
      node.kind === "task"
        ? { ...node, done: completedTaskIds.has(node.id) }
        : node,
    );
    const tasks = goals
      .filter((node) => node.kind === "task" && !node.archived)
      .slice(0, this.settings.quickCheckLimit);
    if (!tasks.length) {
      this.quickChecksHost.createDiv({
        cls: "zss-quick-empty",
        text: "还没有快捷打卡任务，可以到“打卡”里新建。",
      });
      return;
    }

    this.quickChecksHost.createEl("strong", { text: "今日打卡" });
    const row = this.quickChecksHost.createDiv({ cls: "zss-quick-row" });
    for (const task of tasks) {
      const button = row.createEl("button", {
        cls: "zss-check",
        attr: { type: "button", "aria-pressed": String(task.done) },
      });
      button.toggleClass("is-done", task.done);
      button.createSpan({ cls: "zss-check-mark", text: task.done ? "✓" : "" });
      button.createSpan({ text: task.title });
      button.addEventListener("click", async () => {
        await this.shell.options.services.checkin.setTaskDone(
          this.selectedDateKey,
          task,
          !task.done,
        );
        await this.renderQuickChecks();
        this.shell.invalidatePage("checkin");
      });
    }
  }

  private updateMonthTitle(): void {
    this.monthTitle?.setText(`${this.year} 年 ${this.monthIndex + 1} 月`);
  }
}

function localTimestamp(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 19);
  return `${local}${sign}${hours}:${minutes}`;
}
