import { stripEntryTags } from "../domain/entryDisplay";
import { t } from "../i18n";
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
    copy.createEl("h1", { text: t("tag.title") });
    copy.createSpan({ text: t("tag.desc") });

    if (!summary.tags.length) {
      container.createDiv({ cls: "zss-empty", text: t("tag.empty") });
      return;
    }

    this.listHost = container.createDiv({ cls: "zss-tag-index" });
    this.streamHost = container.createEl("section", {
      cls: "zss-tag-stream",
      attr: { "aria-label": t("tag.records") },
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
      button.setAttribute("aria-pressed", String(tag.name === this.selectedTag));
      button.createSpan({ cls: "zss-tag-index-name", text: `#${tag.name}` });
      button.createSpan({ cls: "zss-tag-index-count", text: String(tag.count) });
      button.addEventListener("click", () => this.shell.openTag(tag.name));
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
    head.createEl("strong", {
      text: this.selectedTag ? `#${this.selectedTag}` : t("common.record"),
    });
    head.createSpan({ text: t("journal.recordCount", { count: matching.length }) });
    if (!matching.length) {
      host.createDiv({ cls: "zss-empty", text: t("tag.noMatches") });
      return;
    }
    matching.forEach((entry) => {
      const row = host.createEl("article", { cls: "zss-tag-entry" });
      const meta = row.createDiv({ cls: "zss-tag-entry-meta" });
      meta.createEl("time", { text: entry.date });
      const open = meta.createEl("button", {
        text: t("common.openDay"),
        attr: { type: "button" },
      });
      open.addEventListener("click", () => this.shell.openDate(entry.date));
      const body = stripEntryTags(entry.body, entry.tags);
      if (body) row.createEl("p", { text: body });
      const tags = row.createDiv({ cls: "zss-entry-tags" });
      entry.tags.forEach((tag) => tags.createSpan({ text: `#${tag}` }));
    });
  }
}
