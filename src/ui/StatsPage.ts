import { Notice, Platform, type TFile, type TFolder } from "obsidian";
import {
  buildStatsSeries,
  summarizeEntries,
  type StatsEntry,
  type StatsPeriod,
} from "../services/StatsService";
import type { FolderSummary } from "../services/VaultFolderService";
import type { AppShell } from "./AppShell";
import { dateKey } from "./CalendarMonth";
import { FolderRenameModal } from "./FolderRenameModal";

export class StatsPage {
  private entries: StatsEntry[] = [];
  private period: StatsPeriod = "month";
  private anchorDate = dateKey(new Date());
  private chartHost: HTMLElement | null = null;
  private summaryHost: HTMLElement | null = null;
  private folderHost: HTMLElement | null = null;
  private selectedFolderPath: string | null = null;

  constructor(private readonly shell: AppShell) {}

  async render(container: HTMLElement): Promise<void> {
    container.empty();
    this.entries = await this.shell.options.services.stats.load();
    const head = container.createDiv({ cls: "zss-page-heading" });
    const copy = head.createDiv();
    copy.createEl("h1", { text: "资料库" });
    copy.createSpan({ text: "记录统计与整个 Vault 的文件夹视图。" });

    const statsHost = container.createDiv({ cls: "zss-library-panel" });
    this.folderHost = container.createDiv({ cls: "zss-library-panel" });
    this.folderHost.hidden = true;
    const tabs = container.createDiv({
      cls: "zss-library-tabs",
      attr: { role: "tablist", "aria-label": "资料库视图" },
    });
    const statsTab = tabs.createEl("button", {
      cls: "is-active",
      text: "统计",
      attr: { type: "button", role: "tab", "aria-selected": "true" },
    });
    const foldersTab = tabs.createEl("button", {
      text: "文件夹",
      attr: { type: "button", role: "tab", "aria-selected": "false" },
    });
    const setView = (folder: boolean) => {
      statsHost.hidden = folder;
      this.folderHost!.hidden = !folder;
      statsTab.classList.toggle("is-active", !folder);
      foldersTab.classList.toggle("is-active", folder);
      statsTab.setAttribute("aria-selected", String(!folder));
      foldersTab.setAttribute("aria-selected", String(folder));
      if (folder) this.renderFolders();
    };
    statsTab.addEventListener("click", () => setView(false));
    foldersTab.addEventListener("click", () => setView(true));
    container.insertBefore(tabs, statsHost);

    this.renderStats(statsHost);
    this.renderFolders();
  }

  private renderStats(container: HTMLElement): void {
    const summary = summarizeEntries(this.entries);
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

  private renderFolders(): void {
    if (!this.folderHost) return;
    this.folderHost.empty();
    const folders = this.shell.options.services.folders.listFolders();
    if (!this.selectedFolderPath || !folders.some((item) => item.path === this.selectedFolderPath)) {
      this.selectedFolderPath = folders[0]?.path ?? null;
    }
    const head = this.folderHost.createDiv({ cls: "zss-section-title" });
    head.createEl("strong", { text: "全部文件夹" });
    head.createSpan({ text: `${folders.length} 个` });
    const list = this.folderHost.createDiv({ cls: "zss-folder-list" });
    folders.forEach((summary) => this.renderFolderRow(list, summary));
    const selected = folders.find((item) => item.path === this.selectedFolderPath);
    if (selected) this.renderFolderFiles(selected);
  }

  private renderFolderRow(
    parent: HTMLElement,
    summary: FolderSummary,
  ): void {
    const row = parent.createDiv({ cls: "zss-folder-row" });
    row.dataset.depth = String(summary.depth);
    row.classList.toggle("is-selected", summary.path === this.selectedFolderPath);
    const main = row.createEl("button", {
      cls: "zss-folder-main",
      attr: { type: "button" },
    });
    main.createEl("strong", { text: summary.label });
    main.createSpan({
      text: `${summary.noteCount} 篇${summary.templatePath ? " · 有模板" : ""}`,
    });
    main.addEventListener("click", () => {
      this.selectedFolderPath = summary.path;
      this.renderFolders();
    });

    if (summary.templatePath) {
      const template = row.createEl("button", {
        cls: "zss-template-badge",
        text: "Template",
        attr: { type: "button", "aria-label": "打开模板" },
      });
      template.addEventListener("click", async () => {
        const file = this.shell.options.vault.getFileByPath(summary.templatePath!);
        if (file) await this.openFileInNewWindow(file);
      });
    }

    const add = row.createEl("button", {
      cls: "zss-folder-action",
      text: "+",
      attr: { type: "button", "aria-label": `在 ${summary.label} 新建笔记` },
    });
    add.addEventListener("click", () => void this.createNote(summary.folder));

    if (!summary.folder.isRoot()) {
      const rename = row.createEl("button", {
        cls: "zss-folder-action",
        text: "✎",
        attr: { type: "button", "aria-label": `重命名 ${summary.label}` },
      });
      rename.addEventListener("click", () => {
        new FolderRenameModal(this.shell.options.app, summary.folder.name, async (name) => {
          await this.shell.options.services.folders.renameFolder(summary.folder, name);
          this.renderFolders();
          new Notice("文件夹已重命名。");
        }).open();
      });
    }
  }

  private renderFolderFiles(summary: FolderSummary): void {
    if (!this.folderHost) return;
    const files = this.shell.options.services.folders.listNotes(summary.folder);
    const section = this.folderHost.createEl("section", { cls: "zss-folder-files" });
    const head = section.createDiv({ cls: "zss-section-title" });
    head.createEl("strong", { text: summary.path || "Vault 根目录" });
    head.createSpan({ text: `${files.length} 篇 Markdown` });
    if (!files.length) {
      section.createDiv({ cls: "zss-empty", text: "这个文件夹里还没有 Markdown 文件。" });
      return;
    }
    files.forEach((file) => {
      const button = section.createEl("button", {
        cls: "zss-folder-file",
        attr: { type: "button" },
      });
      button.createSpan({ text: file.basename });
      button.createSpan({
        text: new Date(file.stat.mtime).toLocaleDateString("zh-CN"),
      });
      button.addEventListener("click", async () => {
        const leaf = this.shell.options.app.workspace.getLeaf(
          Platform.isMobile ? "tab" : "window",
        );
        await leaf.openFile(file);
      });
    });
  }

  private async createNote(folder: TFolder): Promise<void> {
    try {
      const file = await this.shell.options.services.folders.createNote(folder);
      const leaf = this.shell.options.app.workspace.getLeaf(
        Platform.isMobile ? "tab" : "window",
      );
      await leaf.openFile(file);
      this.renderFolders();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "新建文件失败。");
    }
  }

  private async openFileInNewWindow(file: TFile): Promise<void> {
    const leaf = this.shell.options.app.workspace.getLeaf(
      Platform.isMobile ? "tab" : "window",
    );
    await leaf.openFile(file);
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
