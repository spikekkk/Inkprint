import { normalizePath, Notice, Platform, TFolder } from "obsidian";
import { parseDailyEntries } from "../domain/dailyEntry";
import { createEntryId, createRandomSuffix } from "../domain/ids";
import type { DailyEntry } from "../domain/types";
import type { InkprintSettings } from "../settings/defaults";
import type { AppShell } from "./AppShell";
import { CalendarMonth, dateKey, type CalendarDay } from "./CalendarMonth";
import { CheckboxImportModal } from "./CheckboxImportModal";
import { Composer } from "./Composer";
import { LongformModal } from "./LongformModal";
import { RelationPanel } from "./RelationPanel";
import { TimeBuoyPickerModal } from "./TimeBuoyPickerModal";

export class JournalPage {
  private year: number;
  private monthIndex: number;
  private selectedDateKey: string;
  private readonly entriesByDay = new Map<string, DailyEntry[]>();
  private calendarHost: HTMLElement | null = null;
  private monthCardHost: HTMLElement | null = null;
  private timelineHost: HTMLElement | null = null;
  private checkboxHost: HTMLElement | null = null;
  private timeBuoyHost: HTMLElement | null = null;
  private monthTitle: HTMLElement | null = null;
  private composer: Composer | null = null;
  private readonly relationPanel: RelationPanel;

  constructor(
    private readonly shell: AppShell,
    private readonly settings: InkprintSettings,
  ) {
    const today = new Date();
    this.year = today.getFullYear();
    this.monthIndex = today.getMonth();
    this.selectedDateKey = dateKey(today);
    this.relationPanel = new RelationPanel(shell);
  }

  async render(container: HTMLElement): Promise<void> {
    container.empty();
    const header = container.createDiv({ cls: "zss-page-heading" });
    const copy = header.createDiv();
    copy.createEl("h1", { text: "今天" });
    copy.createSpan({
      text: Platform.isMobile
        ? "在日历里选一天，再写进当天的 Markdown。"
        : "把此刻写下来，保存到今天的 Daily。",
    });

    const monthCard = container.createEl("section", {
      cls: "zss-calendar-card",
      attr: { "aria-label": "日记日历" },
    });
    this.monthCardHost = monthCard;
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
    if (!Platform.isMobile) {
      monthCard.remove();
      this.monthCardHost = null;
      this.calendarHost = null;
    }

    this.composer = new Composer(container, {
      tags: this.settings.composerTags,
      onSave: (body) => this.saveEntry(body),
      onCreateLongform: (body) => this.openLongformModal(body),
      onImportCheckboxes: () => void this.openCheckboxImport(),
      onInsertImage: (file) => this.insertImage(file),
      onInsertTimeBuoy: () => this.openTimeBuoyPicker(),
    });
    this.checkboxHost = container.createDiv({ cls: "zss-checkbox-section" });
    this.timeBuoyHost = container.createDiv({ cls: "zss-time-buoys" });
    const timeline = container.createEl("section", {
      cls: "zss-timeline",
      attr: { "aria-label": "当天记录" },
    });
    this.timelineHost = timeline;

    this.shell.setTodayHandler(() => this.selectToday());
    this.shell.setDateHandler((key) => void this.selectDate(key));
    if (Platform.isMobile) {
      await this.loadMonth();
      this.renderCalendar();
    }
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
    if (!Platform.isMobile || !this.calendarHost || !this.composer) return;
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
      if (
        Platform.isMobile &&
        days.slice(index, index + 7).some((day) => day.key === this.selectedDateKey)
      ) {
        week.appendChild(this.composer.el);
      }
    }
    if (!Platform.isMobile && this.monthCardHost) {
      this.monthCardHost.insertAdjacentElement("afterend", this.composer.el);
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
    await this.shell.options.services.relations.rebuild(
      this.shell.options.vault,
      this.settings.dailyFolder,
    );
    this.renderTimeline(this.entriesByDay.get(this.selectedDateKey) ?? []);
    await this.renderCheckboxes();
    await this.renderTimeBuoys();
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
      const target = {
        path: normalizePath(`${this.settings.dailyFolder}/${this.selectedDateKey}`),
        blockId: entry.blockId,
      };
      const incoming = this.shell.options.services.relations.getReferrers(target);
      const outgoing = this.shell.options.services.relations.getOutgoing(entry.entryId);
      const actions = item.createDiv({ cls: "zss-entry-actions" });
      const relationButton = actions.createEl("button", {
        cls: "zss-entry-relation",
        text: incoming.length || outgoing.length
          ? `关联 ${incoming.length + outgoing.length}`
          : "添加关联",
        attr: { type: "button" },
      });
      relationButton.addEventListener("click", () => {
        this.relationPanel.openEntry({
          title: `${this.selectedDateKey} · ${
            entry.createdAt.match(/T(\d{2}:\d{2})/)?.[1] ?? ""
          }`,
          subtitle: "Daily 记录",
          body: entry.body,
          incoming,
          outgoing,
        });
      });
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
    await this.shell.options.services.relations.rebuild(
      this.shell.options.vault,
      this.settings.dailyFolder,
    );
    if (Platform.isMobile) this.renderCalendar();
    this.renderTimeline(this.entriesByDay.get(this.selectedDateKey) ?? []);
    await this.renderCheckboxes();
    await this.renderTimeBuoys();
    new Notice("已收进今天的日记。");
  }

  private selectToday(): void {
    const today = new Date();
    this.year = today.getFullYear();
    this.monthIndex = today.getMonth();
    this.selectedDateKey = dateKey(today);
    this.updateMonthTitle();
    if (Platform.isMobile) {
      void this.loadMonth().then(() => {
        this.renderCalendar();
        return this.showSelectedDay();
      });
    } else {
      void this.showSelectedDay();
    }
  }

  private async selectDate(key: string): Promise<void> {
    const date = new Date(`${key}T12:00:00`);
    if (Number.isNaN(date.getTime())) return;
    this.year = date.getFullYear();
    this.monthIndex = date.getMonth();
    this.selectedDateKey = key;
    this.updateMonthTitle();
    if (Platform.isMobile) {
      await this.loadMonth();
      this.renderCalendar();
    }
    await this.showSelectedDay();
  }

  private openLongformModal(body: string): void {
    const folders = [
      this.settings.longformFolder,
      ...this.shell.options.vault
        .getAllLoadedFiles()
        .filter((file): file is TFolder => file instanceof TFolder)
        .map((folder) => folder.path)
        .filter((folder) => folder !== this.settings.longformFolder),
    ].sort((first, second) => first.localeCompare(second));
    new LongformModal(
      this.shell.options.app,
      body,
      folders,
      this.settings.longformFolder,
      (folder) => this.shell.options.services.longform.findTemplate(folder)?.path ?? null,
      async (title, folder) => {
      const now = new Date();
      const sourceEntryId = createEntryId(now, createRandomSuffix());
      const createdAt = localTimestamp(now);
      const result = await this.shell.options.services.longform.create({
        title,
        body,
        sourceEntryId,
        journalDay: this.selectedDateKey,
        folder,
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
      },
    ).open();
  }

  private async openCheckboxImport(): Promise<void> {
    const candidates = await this.shell.options.services.checkboxes.listSources();
    new CheckboxImportModal(
      this.shell.options.app,
      this.shell.options.services.checkboxes,
      this.selectedDateKey,
      candidates,
      () => this.renderCheckboxes(),
    ).open();
  }

  private openTimeBuoyPicker(): void {
    new TimeBuoyPickerModal(this.shell.options.app, (date) => {
      this.composer?.insertText(` @${date} `);
    }).open();
  }

  private async insertImage(file: File): Promise<string> {
    const vault = this.shell.options.vault;
    const folder = normalizePath("Attachments");
    if (!vault.getAbstractFileByPath(folder)) await vault.createFolder(folder);
    const safeName = file.name
      .replace(/[\\/:*?"<>|#[\]^]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "");
    const path = normalizePath(
      `${folder}/${Date.now()}-${safeName || "image.png"}`,
    );
    await vault.createBinary(path, await file.arrayBuffer());
    return `![[${path}]]`;
  }

  private async renderCheckboxes(): Promise<void> {
    if (!this.checkboxHost) return;
    this.checkboxHost.empty();
    const items = await this.shell.options.services.checkboxes.listForDay(
      this.selectedDateKey,
    );
    if (!items.length) return;

    const header = this.checkboxHost.createDiv({ cls: "zss-checkbox-head" });
    header.createEl("strong", { text: "Checkbox" });
    header.createSpan({ text: `${items.filter((item) => item.checked).length} / ${items.length}` });
    const list = this.checkboxHost.createDiv({ cls: "zss-checkbox-list" });
    for (const item of items) {
      const label = list.createEl("label", { cls: "zss-checkbox-row" });
      const input = label.createEl("input", {
        attr: { type: "checkbox", "aria-label": item.text },
      });
      input.checked = item.checked;
      input.addEventListener("change", async () => {
        input.disabled = true;
        try {
          await this.shell.options.services.checkboxes.setChecked(
            this.selectedDateKey,
            item.lineIndex,
            input.checked,
          );
          await this.renderCheckboxes();
        } catch (error) {
          input.checked = item.checked;
          new Notice(error instanceof Error ? error.message : "更新 Checkbox 失败。");
        } finally {
          input.disabled = false;
        }
      });
      label.createSpan({ text: item.text });
    }
  }

  private async renderTimeBuoys(): Promise<void> {
    if (!this.timeBuoyHost) return;
    this.timeBuoyHost.empty();
    const items = await this.shell.options.services.timeBuoys.listForDate(
      this.selectedDateKey,
    );
    if (!items.length) return;

    const host = this.timeBuoyHost;
    const header = host.createDiv({ cls: "zss-time-buoy-head" });
    header.createEl("strong", { text: "此刻浮现" });
    header.createSpan({ text: `${items.length} 条旧记录` });
    items.forEach((item) => {
      const row = host.createEl("article", { cls: "zss-time-buoy-item" });
      row.createEl("small", {
        text: `${item.sourceDate} · ${
          item.createdAt.match(/T(\d{2}:\d{2})/)?.[1] ?? ""
        }`,
      });
      row.createEl("p", { text: item.body.replace(/@\d{4}-\d{2}-\d{2}/g, "").trim() });
      const button = row.createEl("button", {
        text: "回到来源",
        attr: { type: "button" },
      });
      button.addEventListener("click", () => void this.selectDate(item.sourceDate));
    });
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
