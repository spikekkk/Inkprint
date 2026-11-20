import {
  Component,
  MarkdownRenderer,
  normalizePath,
  Notice,
  Platform,
  TFolder,
} from "obsidian";
import {
  extractEntryImageTargets,
  stripEntryTags,
} from "../domain/entryDisplay";
import { parseDailyEntries } from "../domain/dailyEntry";
import { createEntryId, createRandomSuffix } from "../domain/ids";
import type { DailyEntry } from "../domain/types";
import { getIntlLocale, t } from "../i18n";
import { createEntryShareImage } from "../services/ShareImageService";
import type { InkprintSettings } from "../settings/defaults";
import type { AppShell } from "./AppShell";
import { CalendarMonth, dateKey, type CalendarDay } from "./CalendarMonth";
import { Composer } from "./Composer";
import { FutureTaskModal } from "./FutureTaskModal";
import { getJournalLayout } from "./JournalLayout";
import { LongformModal } from "./LongformModal";
import { RelationPanel } from "./RelationPanel";
import {
  RelationPickerModal,
  type RelationCandidate,
} from "./RelationPickerModal";
import { ShareImageModal } from "./ShareImageModal";

export class JournalPage {
  private year: number;
  private monthIndex: number;
  private selectedDateKey: string;
  private readonly entriesByDay = new Map<string, DailyEntry[]>();
  private calendarHost: HTMLElement | null = null;
  private timelineHost: HTMLElement | null = null;
  private checkboxHost: HTMLElement | null = null;
  private futureTaskHost: HTMLElement | null = null;
  private composerSlot: HTMLElement | null = null;
  private monthTitle: HTMLElement | null = null;
  private pageTitleHost: HTMLElement | null = null;
  private pageSubtitleHost: HTMLElement | null = null;
  private composer: Composer | null = null;
  private readonly timelineComponents = new Set<Component>();
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

  dispose(): void {
    this.composer?.destroy();
    this.composer = null;
    this.composerSlot = null;
    this.clearTimelineComponents();
  }

  async render(container: HTMLElement): Promise<void> {
    this.composer?.destroy();
    this.composer = null;
    container.empty();
    const layout = getJournalLayout(Platform.isMobile);
    container.setAttribute("data-zss-journal-layout", layout.mode);
    const header = container.createDiv({ cls: "zss-page-heading" });
    const copy = header.createDiv();
    this.pageTitleHost = copy.createEl("h1", { text: t("journal.today") });
    this.pageSubtitleHost = copy.createSpan({
      text: Platform.isMobile
        ? t("journal.mobileSubtitle")
        : t("journal.desktopSubtitle"),
    });

    const monthCard = container.createEl("section", {
      cls: "zss-calendar-card",
      attr: { "aria-label": t("journal.calendarAria") },
    });
    const monthHead = monthCard.createDiv({ cls: "zss-calendar-head" });
    const previous = monthHead.createEl("button", {
      cls: "zss-icon-button",
      attr: { type: "button", "aria-label": t("journal.previousMonth") },
    });
    previous.setText("‹");
    this.monthTitle = monthHead.createEl("strong");
    const next = monthHead.createEl("button", {
      cls: "zss-icon-button",
      attr: { type: "button", "aria-label": t("journal.nextMonth") },
    });
    next.setText("›");
    previous.addEventListener("click", () => this.changeMonth(-1));
    next.addEventListener("click", () => this.changeMonth(1));

    const weekdays = monthCard.createDiv({ cls: "zss-weekdays", attr: { "aria-hidden": "true" } });
    const labels = this.weekdayLabels();
    labels.forEach((label) => weekdays.createSpan({ text: label }));
    this.calendarHost = monthCard.createDiv({ cls: "zss-calendar" });
    this.updateMonthTitle();
    if (!layout.showCalendar) {
      monthCard.remove();
      this.calendarHost = null;
    }

    const composerSlot = container.createDiv({
      cls: "zss-composer-slot",
      attr: { "data-zss-composer-placement": layout.composerPlacement },
    });
    this.composerSlot = composerSlot;
    this.composer = new Composer(composerSlot, {
      tags: this.settings.composerTags,
      onSave: (body) => this.saveEntry(body),
      onUpdate: (entryId, body) => this.updateEntry(entryId, body),
      onOpenRelations: () => void this.openRelationPicker(),
      onOpenFutureTask: () => this.openFutureTaskPicker(),
      onCreateLongform: (body) => this.openLongformModal(body),
      onInsertImage: (file) => this.insertImage(file),
    });
    this.checkboxHost = container.createDiv({ cls: "zss-checkbox-section" });
    this.futureTaskHost = container.createDiv({ cls: "zss-future-tasks" });
    const timeline = container.createEl("section", {
      cls: "zss-timeline",
      attr: { "aria-label": t("journal.timelineAria") },
    });
    this.timelineHost = timeline;

    this.shell.setTodayHandler(() => this.selectToday());
    this.shell.setDateHandler((key) => void this.selectDate(key));
    if (layout.showCalendar) {
      await this.loadMonth();
      this.renderCalendar();
    }
    await this.showSelectedDay();
    if (layout.mode === "desktop") this.composer?.focus();
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
        this.entriesByDay.set(
          day.key,
          parseDailyEntries(markdown, {
            dateKey: day.key,
            includeLegacy: this.settings.recognizeLegacyEntries,
          }),
        );
      }),
    );
  }

  private renderCalendar(): void {
    if (!Platform.isMobile || !this.calendarHost) return;
    this.calendarHost.empty();
    const days = CalendarMonth.build(
      this.year,
      this.monthIndex,
      this.settings.weekStartsOn,
    );
    const today = dateKey(new Date());

    for (let index = 0; index < days.length; index += 7) {
      const week = this.calendarHost.createDiv({ cls: "zss-calendar-week" });
      const weekDays = days.slice(index, index + 7);
      for (const day of weekDays) {
        this.renderDay(week, day, today);
      }
      if (
        this.composerSlot &&
        weekDays.some((day) => day.key === this.selectedDateKey)
      ) {
        week.appendChild(this.composerSlot);
      }
    }
  }

  private renderDay(parent: HTMLElement, day: CalendarDay, today: string): void {
    const button = parent.createEl("button", {
      cls: "zss-calendar-day",
      attr: {
        type: "button",
        "aria-label": t("journal.dayAria", {
          date: new Intl.DateTimeFormat(getIntlLocale(), {
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(new Date(day.year, day.monthIndex, day.day, 12)),
        }),
      },
    });
    if (!day.inCurrentMonth) button.addClass("is-outside");
    if (day.key === today) button.addClass("is-today");
    if (day.key === this.selectedDateKey) {
      button.addClass("is-selected");
      button.setAttribute("aria-pressed", "true");
    }
    button.createSpan({ cls: "zss-calendar-number", text: String(day.day) });
    const entries = this.entriesByDay.get(day.key) ?? [];
    const count = entries.length;
    const images = [...new Set(
      entries.flatMap((entry) => extractEntryImageTargets(entry.body)),
    )];
    if (images.length) {
      button.addClass("has-media");
      this.renderCalendarImages(button, images);
      button.setAttribute(
        "aria-label",
        `${day.year}/${day.monthIndex + 1}/${day.day} · ${t("journal.imageCount", {
          count: images.length,
        })}`,
      );
    } else if (count) {
      button.createSpan({
        cls: "zss-calendar-marker",
        text: count > 1 ? t("journal.recordCount", { count }) : t("journal.oneRecord"),
      });
    }
    button.addEventListener("click", () => {
      this.selectedDateKey = day.key;
      this.renderCalendar();
      void this.showSelectedDay();
    });
  }

  private renderCalendarImages(
    button: HTMLButtonElement,
    targets: readonly string[],
  ): void {
    const visible = targets.slice(0, 4);
    const media = button.createSpan({
      cls: "zss-calendar-media",
      attr: { "data-count": String(visible.length) },
    });
    visible.forEach((target, index) => {
      const tile = media.createSpan({ cls: "zss-calendar-media-tile" });
      const resource = this.resolveCalendarImage(target);
      if (resource) {
        tile.style.backgroundImage = `url(${JSON.stringify(resource)})`;
      } else {
        tile.addClass("is-missing");
        tile.setText("◫");
      }
      if (index === visible.length - 1 && targets.length > visible.length) {
        tile.setText(`+${targets.length - visible.length + 1}`);
        tile.addClass("is-overflow");
      }
    });
  }

  private resolveCalendarImage(target: string): string | null {
    if (/^https?:\/\//i.test(target)) return target;
    let decoded = target;
    try {
      decoded = decodeURIComponent(target);
    } catch {
      // Keep the original vault path when a link contains malformed escaping.
    }
    const direct = this.shell.options.vault.getFileByPath(
      normalizePath(decoded.replace(/^\/+/, "")),
    );
    const file =
      direct ??
      this.shell.options.app.metadataCache.getFirstLinkpathDest(decoded, "");
    return file
      ? this.shell.options.vault.adapter.getResourcePath(file.path)
      : null;
  }

  private async showSelectedDay(): Promise<void> {
    if (!this.timelineHost || !this.composer) return;
    const selected = new Date(`${this.selectedDateKey}T12:00:00`);
    const today = dateKey(new Date());
    const isToday = this.selectedDateKey === today;
    const isPast = this.selectedDateKey < today;
    const dateText = new Intl.DateTimeFormat(getIntlLocale(), {
      month: "short",
      day: "numeric",
      weekday: "short",
    }).format(selected);
    this.composer.setDate(
      isToday ? `${t("journal.today")} · ${dateText}` : dateText,
      isToday ? "当下" : isPast ? "曾经" : "未来",
      isToday,
    );
    this.pageTitleHost?.setText(
      isToday ? t("journal.today") : isPast ? t("journal.past") : t("journal.future"),
    );
    this.pageSubtitleHost?.setText(
      isToday
        ? t("journal.subtitleCurrent")
        : isPast
          ? t("journal.subtitlePast", { date: dateText })
          : t("journal.subtitleFuture", { date: dateText }),
    );
    this.composer.el.toggleAttribute("data-zss-today-composer", isToday);

    if (!this.entriesByDay.has(this.selectedDateKey)) {
      const markdown = await this.shell.options.services.daily.read(this.selectedDateKey);
      this.entriesByDay.set(
        this.selectedDateKey,
        parseDailyEntries(markdown, {
          dateKey: this.selectedDateKey,
          includeLegacy: this.settings.recognizeLegacyEntries,
        }),
      );
    }
    await this.shell.options.services.relations.rebuild(
      this.shell.options.vault,
      this.settings.dailyFolder,
      this.settings.recognizeLegacyEntries,
    );
    this.renderTimeline(this.entriesByDay.get(this.selectedDateKey) ?? []);
    await this.renderCheckboxes();
    await this.renderFutureTasks();
  }

  private renderTimeline(entries: DailyEntry[]): void {
    if (!this.timelineHost) return;
    this.timelineHost.empty();
    this.clearTimelineComponents();
    if (!entries.length) {
      this.timelineHost.createDiv({
        cls: "zss-empty",
        text: this.selectedDateKey < dateKey(new Date())
          ? t("journal.emptyPast")
          : t("journal.empty"),
      });
      return;
    }

    for (const entry of entries) {
      const item = this.timelineHost.createEl("article", { cls: "zss-entry" });
      const meta = item.createDiv({ cls: "zss-entry-meta" });
      const timing = meta.createDiv({ cls: "zss-entry-meta-primary" });
      timing.createEl("time", {
        text: entry.createdAt.match(/T(\d{2}:\d{2})/)?.[1] ?? "",
      });
      if (entry.editedAt) {
        timing.createSpan({
          cls: "zss-entry-edited",
          text: t("journal.editedAt", {
            time: entry.editedAt.match(/T(\d{2}:\d{2})/)?.[1] ?? "",
          }),
        });
      }
      meta.createSpan({
        text:
          entry.source === "legacy"
            ? t("journal.legacyMeta")
            : entry.kind === "longform-ref"
              ? t("journal.longformMeta")
              : t("journal.oneRecord"),
      });
      const body = stripEntryTags(entry.body, entry.tags);
      if (body) {
        const bodyEl = item.createDiv({ cls: "zss-entry-body markdown-rendered" });
        const component = new Component();
        component.load();
        this.timelineComponents.add(component);
        void MarkdownRenderer.render(
          this.shell.options.app,
          body,
          bodyEl,
          normalizePath(`${this.settings.dailyFolder}/${this.selectedDateKey}.md`),
          component,
        ).catch(() => {
          bodyEl.empty();
          bodyEl.createEl("p", { text: body });
        });
      }
      if (entry.tags.length) {
        const tags = item.createDiv({ cls: "zss-entry-tags" });
        entry.tags.forEach((tag) => tags.createSpan({ text: `#${tag}` }));
      }
      const actions = item.createDiv({ cls: "zss-entry-actions" });
      if (
        entry.source !== "legacy" &&
        this.selectedDateKey === dateKey(new Date()) &&
        entry.kind !== "longform-ref"
      ) {
        const editButton = actions.createEl("button", {
          cls: "zss-entry-action",
          text: t("journal.edit"),
          attr: { type: "button" },
        });
        editButton.addEventListener("click", () => {
          this.composer?.beginEdit(entry.entryId, entry.body);
          this.scrollComposerIntoView();
        });
      }
      const shareButton = actions.createEl("button", {
        cls: "zss-entry-action",
        text: t("journal.shareImage"),
        attr: { type: "button" },
      });
      shareButton.addEventListener("click", () => void this.shareEntry(entry));

      if (entry.source !== "legacy") {
        const target = {
          path: normalizePath(`${this.settings.dailyFolder}/${this.selectedDateKey}`),
          blockId: entry.blockId,
        };
        const incoming = this.shell.options.services.relations.getReferrers(target);
        const outgoing = this.shell.options.services.relations.getOutgoing(entry.entryId);
        const relationButton = actions.createEl("button", {
          cls: "zss-entry-action",
          text: incoming.length || outgoing.length
            ? t("journal.relationsCount", {
                count: incoming.length + outgoing.length,
              })
            : t("journal.viewRelations"),
          attr: { type: "button" },
        });
        relationButton.addEventListener("click", () => {
          this.relationPanel.openEntry({
            title: `${this.selectedDateKey} · ${
              entry.createdAt.match(/T(\d{2}:\d{2})/)?.[1] ?? ""
            }`,
            subtitle: t("relationPicker.daily"),
            body: entry.body,
            incoming,
            outgoing,
          });
        });
      }
    }
  }

  private scrollComposerIntoView(): void {
    if (!this.composer) return;
    const page = this.composer.el.closest<HTMLElement>(".zss-page");
    if (!page) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    page.scrollTo({
      top: Math.max(0, this.composer.el.offsetTop - 12),
      behavior: reduced ? "auto" : "smooth",
    });
    this.composer.focus();
  }

  private async updateEntry(entryId: string, body: string): Promise<void> {
    await this.shell.options.services.daily.update(
      this.selectedDateKey,
      entryId,
      body,
    );
    await this.refreshEntriesAfterMutation();
    new Notice(t("journal.updated"));
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
    await this.refreshEntriesAfterMutation();
    new Notice(t("journal.saved"));
  }

  private async refreshEntriesAfterMutation(): Promise<void> {
    const markdown = await this.shell.options.services.daily.read(this.selectedDateKey);
    this.entriesByDay.set(
      this.selectedDateKey,
      parseDailyEntries(markdown, {
        dateKey: this.selectedDateKey,
        includeLegacy: this.settings.recognizeLegacyEntries,
      }),
    );
    await this.shell.options.services.relations.rebuild(
      this.shell.options.vault,
      this.settings.dailyFolder,
      this.settings.recognizeLegacyEntries,
    );
    if (Platform.isMobile) this.renderCalendar();
    this.renderTimeline(this.entriesByDay.get(this.selectedDateKey) ?? []);
    await this.renderCheckboxes();
    await this.renderFutureTasks();
  }

  private async shareEntry(entry: DailyEntry): Promise<void> {
    try {
      const style = getComputedStyle(this.shell.options.container);
      const token = (name: string, fallback: string) =>
        style.getPropertyValue(name).trim() || fallback;
      const result = await createEntryShareImage(
        this.shell.options.vault,
        this.selectedDateKey,
        entry,
        {
          background: token("--background-secondary", "#f4f4f4"),
          surface: token("--background-primary", "#ffffff"),
          text: token("--text-normal", "#202020"),
          muted: token("--text-muted", "#666666"),
          accent: token("--interactive-accent", "#5b6cff"),
          border: token("--background-modifier-border", "#dddddd"),
        },
      );
      new ShareImageModal(this.shell.options.app, result.path).open();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : t("journal.shareFailed"));
    }
  }

  private async openRelationPicker(): Promise<void> {
    try {
      const candidates = await this.collectRelationCandidates();
      new RelationPickerModal(
        this.shell.options.app,
        candidates,
        (link) => this.composer?.insertText(` ${link} `),
      ).open();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : t("journal.relationLoadFailed"));
    }
  }

  private openFutureTaskPicker(): void {
    new FutureTaskModal(this.shell.options.app, (date, task) => {
      this.composer?.insertTask(task, date);
    }).open();
  }

  private async collectRelationCandidates(): Promise<RelationCandidate[]> {
    const vault = this.shell.options.vault;
    const dailyFolder = normalizePath(this.settings.dailyFolder);
    const longformFolder = normalizePath(this.settings.longformFolder);
    const files = vault
      .getFiles()
      .filter((file) => file.extension === "md");
    const candidates: RelationCandidate[] = [];

    for (const file of files) {
      const markdown = await vault.cachedRead(file);
      if (file.path.startsWith(`${dailyFolder}/`)) {
        const date = file.basename;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        for (const entry of parseDailyEntries(markdown, {
          dateKey: date,
          includeLegacy: this.settings.recognizeLegacyEntries,
        })) {
          if (entry.source === "legacy") continue;
          const time = entry.createdAt.match(/T(\d{2}:\d{2})/)?.[1] ?? "";
          const excerpt = stripEntryTags(entry.body, entry.tags).replace(/\s+/g, " ").slice(0, 140);
          const target = file.path.replace(/\.md$/i, "");
          candidates.push({
            title: `${date}${time ? ` · ${time}` : ""}`,
            meta: t("relationPicker.daily"),
            excerpt,
            link: `[[${target}#^${entry.blockId}|${date}${time ? ` ${time}` : ""}]]`,
            searchable: `${date}\n${entry.body}\n${entry.tags.join(" ")}`.toLocaleLowerCase("zh-CN"),
          });
        }
        continue;
      }

      if (!file.path.startsWith(`${longformFolder}/`)) continue;
      const blockMatches = Array.from(markdown.matchAll(/^\^([A-Za-z0-9-]+)\s*$/gm));
      const blockId = blockMatches.at(-1)?.[1];
      if (!blockId) continue;
      const title =
        typeof this.shell.options.app.metadataCache.getFileCache(file)?.frontmatter?.title ===
        "string"
          ? String(this.shell.options.app.metadataCache.getFileCache(file)?.frontmatter?.title)
          : file.basename;
      const body = markdown
        .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
        .replace(/^# .+$/m, "")
        .trim();
      const target = file.path.replace(/\.md$/i, "");
      candidates.push({
        title,
        meta: t("relationPicker.longform"),
        excerpt: body.replace(/\s+/g, " ").slice(0, 140),
        link: `[[${target}#^${blockId}|${title}]]`,
        searchable: `${title}\n${body}`.toLocaleLowerCase("zh-CN"),
      });
    }

    return candidates.sort((first, second) =>
      second.title.localeCompare(first.title),
    );
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
        body: `${t("journal.longformEntry", { title })}\n\n${result.link}`,
        tags: [t("journal.longformMeta")],
        kind: "longform-ref",
        longformPath: result.path,
      });
      this.entriesByDay.delete(this.selectedDateKey);
      this.composer?.clear();
      await this.showSelectedDay();
      void this.shell.invalidatePage("vault");
      new Notice(t("journal.longformCreated"));
      },
    ).open();
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
    header.createEl("strong", {
      text:
        this.selectedDateKey === dateKey(new Date())
          ? t("journal.todayTasks")
          : t("journal.dayTasks"),
    });
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
          new Notice(error instanceof Error ? error.message : t("tasks.updateFailed"));
        } finally {
          input.disabled = false;
        }
      });
      label.createSpan({ text: item.text });
    }
  }

  private async renderFutureTasks(): Promise<void> {
    if (!this.futureTaskHost) return;
    this.futureTaskHost.empty();
    const items = await this.shell.options.services.futureTasks.listForDate(
      this.selectedDateKey,
    );
    if (!items.length) return;

    const host = this.futureTaskHost;
    const header = host.createDiv({ cls: "zss-future-task-head" });
    header.createEl("strong", { text: t("journal.futureTasks") });
    header.createSpan({ text: t("journal.futureTaskCount", { count: items.length }) });
    items.forEach((item) => {
      const row = host.createEl("article", { cls: "zss-future-task-item" });
      row.createEl("small", {
        text: `${item.sourceDate} · ${
          item.createdAt.match(/T(\d{2}:\d{2})/)?.[1] ?? ""
        }`,
      });
      row.createEl("p", { text: item.body.replace(/@\d{4}-\d{2}-\d{2}/g, "").trim() });
      const button = row.createEl("button", {
        text: t("journal.backToSource"),
        attr: { type: "button" },
      });
      button.addEventListener("click", () => void this.selectDate(item.sourceDate));
    });
  }

  private updateMonthTitle(): void {
    this.monthTitle?.setText(
      new Intl.DateTimeFormat(getIntlLocale(), {
        year: "numeric",
        month: "long",
      }).format(new Date(this.year, this.monthIndex, 1, 12)),
    );
  }

  private weekdayLabels(): string[] {
    const formatter = new Intl.DateTimeFormat(getIntlLocale(), {
      weekday: "narrow",
    });
    const monday = new Date(2024, 0, 1, 12);
    const labels = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return formatter.format(date);
    });
    return this.settings.weekStartsOn === "sunday"
      ? [labels[6], ...labels.slice(0, 6)]
      : labels;
  }

  private clearTimelineComponents(): void {
    this.timelineComponents.forEach((component) => component.unload());
    this.timelineComponents.clear();
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
