import { Modal, type App } from "obsidian";
import { getIntlLocale, t } from "../i18n";
import { dateKey } from "./CalendarMonth";

export class FutureTaskModal extends Modal {
  private visibleMonth: Date;
  private readonly today = startOfDay(new Date());
  private taskInput: HTMLInputElement | null = null;

  constructor(
    app: App,
    private readonly onSelect: (date: string, task: string) => void,
  ) {
    super(app);
    this.visibleMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
  }

  onOpen(): void {
    this.modalEl.addClass("inkprint-future-task-modal");
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: t("futureTask.title") });
    this.contentEl.createEl("p", {
      cls: "zss-picker-intro",
      text: t("futureTask.desc"),
    });

    const taskField = this.contentEl.createEl("label", { cls: "zss-future-task-field" });
    taskField.createSpan({ text: t("futureTask.content") });
    this.taskInput = taskField.createEl("input", {
      attr: {
        type: "text",
        placeholder: t("futureTask.placeholder"),
        "aria-label": t("futureTask.title"),
      },
    });

    const shortcuts = this.contentEl.createDiv({ cls: "zss-future-task-shortcuts" });
    ([
      [t("common.today"), 0],
      [t("tasks.tomorrow"), 1],
      [t("futureTask.add7"), 7],
      [t("futureTask.add30"), 30],
    ] as Array<[string, number]>).forEach(([label, offset]) => {
      const button = shortcuts.createEl("button", {
        text: String(label),
        attr: { type: "button" },
      });
      button.addEventListener("click", () => this.choose(addDays(offset)));
    });

    this.contentEl.createDiv({ cls: "zss-future-task-calendar-host" });
    this.renderCalendar();
    window.setTimeout(() => this.taskInput?.focus(), 0);
  }

  private renderCalendar(): void {
    const host = this.contentEl.querySelector<HTMLElement>(
      ".zss-future-task-calendar-host",
    );
    if (!host) return;
    host.empty();

    const monthHead = host.createDiv({ cls: "zss-future-task-month-head" });
    const previous = monthHead.createEl("button", {
      attr: { type: "button", "aria-label": t("futureTask.previousMonth") },
      text: "‹",
    });
    previous.addEventListener("click", () => this.changeMonth(-1));
    monthHead.createEl("strong", {
      text: new Intl.DateTimeFormat(getIntlLocale(), {
        year: "numeric",
        month: "long",
      }).format(this.visibleMonth),
    });
    const next = monthHead.createEl("button", {
      attr: { type: "button", "aria-label": t("futureTask.nextMonth") },
      text: "›",
    });
    next.addEventListener("click", () => this.changeMonth(1));

    const grid = host.createDiv({ cls: "zss-future-task-calendar" });
    const formatter = new Intl.DateTimeFormat(getIntlLocale(), { weekday: "narrow" });
    Array.from({ length: 7 }, (_, index) => {
      const monday = new Date(2024, 0, 1 + index, 12);
      return formatter.format(monday);
    }).forEach((label) => {
      grid.createSpan({ cls: "zss-future-task-weekday", text: label });
    });

    const first = new Date(
      this.visibleMonth.getFullYear(),
      this.visibleMonth.getMonth(),
      1,
    );
    const offset = (first.getDay() + 6) % 7;
    const gridStart = addDaysTo(first, -offset);
    for (let index = 0; index < 42; index += 1) {
      const date = addDaysTo(gridStart, index);
      const button = grid.createEl("button", {
        cls: "zss-future-task-day",
        text: String(date.getDate()),
        attr: {
          type: "button",
          "aria-label": dateKey(date),
        },
      });
      button.toggleAttribute("data-outside", date.getMonth() !== this.visibleMonth.getMonth());
      button.toggleAttribute("data-today", sameDay(date, this.today));
      button.disabled = date < this.today;
      button.addEventListener("click", () => this.choose(date));
    }
  }

  private changeMonth(delta: number): void {
    this.visibleMonth = new Date(
      this.visibleMonth.getFullYear(),
      this.visibleMonth.getMonth() + delta,
      1,
    );
    this.renderCalendar();
  }

  private choose(date: Date): void {
    this.onSelect(dateKey(date), this.taskInput?.value.trim() ?? "");
    this.close();
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(days: number): Date {
  const date = startOfDay(new Date());
  date.setDate(date.getDate() + days);
  return date;
}

function addDaysTo(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function sameDay(first: Date, second: Date): boolean {
  return dateKey(first) === dateKey(second);
}
