import {
  buildStatsSeries,
  summarizeEntries,
  type StatsEntry,
  type StatsPeriod,
} from "../services/StatsService";
import { dateKey } from "./CalendarMonth";
import type { AppShell } from "./AppShell";

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
    copy.createEl("h1", { text: "统计" });
    copy.createSpan({ text: "记录来自 Daily Markdown，不需要额外维护数据。" });

    const metrics = container.createDiv({ cls: "zss-stats-metrics" });
    this.metric(metrics, summary.noteCount, "全部笔记");
    this.metric(metrics, summary.wordCount, "全部字数");
    this.metric(metrics, summary.dayCount, "记录天数");

    const segmented = container.createDiv({
      cls: "zss-segmented",
      attr: { role: "tablist", "aria-label": "统计范围" },
    });
    (
      [
        ["week", "周"],
        ["month", "月"],
        ["year", "年"],
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
    card.createEl("strong", { text: value.toLocaleString("zh-CN") });
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
          ? `${this.anchorDate.slice(0, 4)} 年`
          : this.period === "week"
            ? "本周记录"
            : `${Number(this.anchorDate.slice(5, 7))} 月`,
    });
    head.createSpan({ text: `${bars.reduce((sum, bar) => sum + bar.count, 0)} 条` });

    const chart = this.chartHost.createDiv({
      cls: "zss-bar-chart",
      attr: { role: "img", "aria-label": "记录数量趋势" },
    });
    bars.forEach((bar) => {
      const column = chart.createDiv({ cls: "zss-bar-column" });
      column.setAttribute("aria-label", `${bar.label}：${bar.count} 条记录`);
      const track = column.createDiv({ cls: "zss-bar-track" });
      const fill = track.createDiv({ cls: "zss-bar-fill" });
      fill.style.height = `${Math.max(bar.count ? 10 : 2, (bar.count / max) * 100)}%`;
      column.createSpan({ cls: "zss-bar-label", text: bar.label });
    });
  }

  private renderSummary(summary: ReturnType<typeof summarizeEntries>): void {
    if (!this.summaryHost) return;
    this.summaryHost.empty();
    const title = this.summaryHost.createDiv({ cls: "zss-section-title" });
    title.createEl("strong", { text: "概览" });
    const grid = this.summaryHost.createDiv({ cls: "zss-stats-grid" });
    this.metric(grid, summary.tagCount, "标签");
    this.metric(
      grid,
      summary.noteCount ? Math.round(summary.wordCount / summary.noteCount) : 0,
      "平均每条字数",
    );
    this.metric(
      grid,
      summary.dayCount ? Math.round(summary.noteCount / summary.dayCount) : 0,
      "单日最多",
    );

    const tags = this.summaryHost.createDiv({ cls: "zss-stats-tags" });
    tags.createEl("strong", { text: "常用标签" });
    if (!summary.tags.length) {
      tags.createDiv({ cls: "zss-empty", text: "还没有标签。" });
      return;
    }
    summary.tags.slice(0, 12).forEach((tag) => {
      const row = tags.createDiv({ cls: "zss-tag-stat" });
      row.createSpan({ text: `#${tag.name}` });
      row.createSpan({ text: String(tag.count) });
    });
  }
}
