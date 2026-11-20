import type { StatsEntry } from "../services/StatsService";
import { summarizeEntries } from "../services/StatsService";
import type { AppShell } from "./AppShell";

export class TagPage {
  private selectedTag: string | null = null;
  private entries: StatsEntry[] = [];
  private listHost: HTMLElement | null = null;
  private streamHost: HTMLElement | null = null;

  constructor(private readonly shell: AppShell) {}

  async render(container: HTMLElement): Promise<void> {
    container.empty();
    this.entries = await this.shell.options.services.stats.load();
    const summary = summarizeEntries(this.entries);
    if (!this.selectedTag || !summary.tags.some((tag) => tag.name === this.selectedTag)) {
      this.selectedTag = summary.tags[0]?.name ?? null;
    }

    const head = container.createDiv({ cls: "zss-page-heading" });
    const copy = head.createDiv();
    copy.createEl("h1", { text: "标签" });
    copy.createSpan({ text: "标签就是内容入口，点击一个标签即可回看全部相关记录。" });

    if (!summary.tags.length) {
      container.createDiv({ cls: "zss-empty", text: "还没有标签。" });
      return;
    }

    this.listHost = container.createDiv({ cls: "zss-tag-index" });
    this.streamHost = container.createEl("section", {
      cls: "zss-tag-stream",
      attr: { "aria-label": "标签记录" },
    });
    this.shell.setTagHandler((tag) => {
      this.selectedTag = tag;
      this.renderTags(summary.tags);
      this.renderStream();
    });
    this.renderTags(summary.tags);
    this.renderStream();
  }

  private renderTags(tags: Array<{ name: string; count: number }>): void {
    if (!this.listHost) return;
    this.listHost.empty();
    tags.forEach((tag) => {
      const button = this.listHost!.createEl("button", {
        cls: "zss-tag-index-item",
        attr: { type: "button" },
      });
      button.classList.toggle("is-active", tag.name === this.selectedTag);
      button.createSpan({ text: `#${tag.name}` });
      button.createSpan({ text: String(tag.count) });
      button.addEventListener("click", () => {
        this.selectedTag = tag.name;
        this.renderTags(tags);
        this.renderStream();
      });
    });
  }

  private renderStream(): void {
    if (!this.streamHost) return;
    const host = this.streamHost;
    host.empty();
    const matching = this.entries
      .filter((entry) => this.selectedTag && entry.tags.includes(this.selectedTag))
      .sort((first, second) => second.date.localeCompare(first.date));
    const head = host.createDiv({ cls: "zss-section-title" });
    head.createEl("strong", { text: this.selectedTag ? `#${this.selectedTag}` : "记录" });
    head.createSpan({ text: `${matching.length} 条` });
    if (!matching.length) {
      host.createDiv({ cls: "zss-empty", text: "没有匹配记录。" });
      return;
    }
    matching.forEach((entry) => {
      const row = host.createEl("article", { cls: "zss-tag-entry" });
      const meta = row.createDiv({ cls: "zss-tag-entry-meta" });
      meta.createEl("time", { text: entry.date });
      const open = meta.createEl("button", {
        text: "打开当天",
        attr: { type: "button" },
      });
      open.addEventListener("click", () => this.shell.openDate(entry.date));
      row.createEl("p", { text: entry.body });
      const tags = row.createDiv({ cls: "zss-entry-tags" });
      entry.tags.forEach((tag) => tags.createSpan({ text: `#${tag}` }));
    });
  }
}
