import {
  buildStatsSeries,
  summarizeEntries,
  type StatsEntry,
  type StatsPeriod,
} from "../services/StatsService";
import type { AppShell } from "./AppShell";
import { dateKey } from "./CalendarMonth";
import { getIntlLocale, t } from "../i18n";

export class StatsPage {
  private entries: StatsEntry[] = [];
  private period: StatsPeriod = "month";
  private anchorDate = dateKey(new Date());
  private chartHost: HTMLElement | null = null;
  private summaryHost: HTMLElement | null = null;

  constructor(private readonly shell: AppShell) {}

  async render(container: HTMLElement): Promise<void> {
    container.empty();
    this.entries = await this.shell.options.services.stats.load();
    const summary = summarizeEntries(this.entries);
    const head = container.createDiv({ cls: "zss-page-heading" });
    const copy = head.createDiv();
    copy.createEl("h1", { text: t("stats.title") });
    copy.createSpan({ text: t("stats.desc") });
    const metrics = container.createDiv({ cls: "zss-stats-metrics" });
    this.metric(metrics, summary.noteCount, t("stats.allNotes"));
    this.metric(metrics, summary.wordCount, t("stats.allWords"));
    this.metric(metrics, summary.dayCount, t("stats.activeDays"));

    const segmented = container.createDiv({
      cls: "zss-segmented",
      attr: { role: "tablist", "aria-label": t("stats.title") },
    });
    (
      [
        ["week", t("stats.week")],
        ["month", t("stats.month")],
        ["year", t("stats.year")],
      ] as Array<[StatsPeriod, string]>
    ).forEach(([value, label]) => {
      const button = segmented.createEl("button", {
        text: label,
        attr: { type: "button", role: "tab" },
      });
      button.classList.toggle("is-active", value === this.period);
      button.setAttribute("aria-selected", String(value === this.period));
      button.addEventListener("click", () => {
        this.period = value;
        segmented.querySelectorAll("button").forEach((item) => {
          item.classList.toggle("is-active", item === button);
          item.setAttribute("aria-selected", String(item === button));
        });
        this.renderChart();
      });
    });
    this.chartHost = container.createDiv({ cls: "zss-chart-card" });
    this.summaryHost = container.createDiv({ cls: "zss-stats-sections" });
    this.renderChart();
    this.renderSummary(summary);
  }

  private metric(parent: HTMLElement, value: number, label: string): void {
    const card = parent.createDiv({ cls: "zss-stat-card" });
    card.createEl("strong", { text: value.toLocaleString(getIntlLocale()) });
    card.createSpan({ text: label });
  }

  private renderChart(): void {
    if (!this.chartHost) return;
    this.chartHost.empty();
    const bars = buildStatsSeries(this.entries, this.period, this.anchorDate);
    const max = Math.max(1, ...bars.map((bar) => bar.count));
    const head = this.chartHost.createDiv({ cls: "zss-chart-head" });
    head.createEl("strong", {
      text:
        this.period === "year"
          ? t("stats.yearTitle", { year: this.anchorDate.slice(0, 4) })
          : this.period === "week"
            ? t("stats.weekTitle")
            : new Intl.DateTimeFormat(getIntlLocale(), { month: "long" }).format(
                new Date(`${this.anchorDate}T12:00:00`),
              ),
    });
    head.createSpan({
      text: t("stats.count", {
        count: bars.reduce((sum, bar) => sum + bar.count, 0),
      }),
    });
    const chart = this.chartHost.createDiv({
      cls: "zss-bar-chart",
      attr: { role: "img", "aria-label": t("stats.chartAria") },
    });
    bars.forEach((bar) => {
      const column = chart.createDiv({ cls: "zss-bar-column" });
      column.setAttribute("aria-label", `${bar.label}: ${bar.count}`);
      const track = column.createDiv({ cls: "zss-bar-track" });
      const fill = track.createDiv({ cls: "zss-bar-fill" });
      fill.style.height = bar.count ? `${Math.max(10, (bar.count / max) * 100)}%` : "0";
      column.createSpan({ cls: "zss-bar-label", text: bar.label });
    });
  }

  private renderSummary(summary: ReturnType<typeof summarizeEntries>): void {
    if (!this.summaryHost) return;
    this.summaryHost.empty();
    const title = this.summaryHost.createDiv({ cls: "zss-section-title" });
    title.createEl("strong", { text: t("stats.overview") });
    const grid = this.summaryHost.createDiv({ cls: "zss-stats-grid" });
    this.metric(grid, summary.tagCount, t("stats.tagCount"));
    this.metric(
      grid,
      summary.noteCount ? Math.round(summary.wordCount / summary.noteCount) : 0,
      t("stats.avgWords"),
    );
    this.metric(
      grid,
      summary.dayCount ? Math.round(summary.noteCount / summary.dayCount) : 0,
      t("stats.maxPerDay"),
    );
    const tags = this.summaryHost.createDiv({ cls: "zss-stats-tags" });
    tags.createEl("strong", { text: t("stats.tags") });
    if (!summary.tags.length) {
      tags.createDiv({ cls: "zss-empty", text: t("empty.tags") });
      return;
    }
    summary.tags.slice(0, 12).forEach((tag) => {
      const row = tags.createDiv({ cls: "zss-tag-stat" });
      row.createSpan({ text: `#${tag.name}` });
      row.createSpan({ text: String(tag.count) });
    });
  }
}
