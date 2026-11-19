import { normalizePath, type TFile } from "obsidian";
import type { AppShell } from "./AppShell";
import { RelationPanel } from "./RelationPanel";

export class ContentPage {
  private readonly panel: RelationPanel;

  constructor(private readonly shell: AppShell) {
    this.panel = new RelationPanel(shell);
  }

  async render(container: HTMLElement): Promise<void> {
    container.empty();
    const head = container.createDiv({ cls: "zss-page-heading" });
    const copy = head.createDiv();
    copy.createEl("h1", { text: "内容" });
    copy.createSpan({ text: "长文正文独立保存，引用与来源集中在这里回看。" });

    const folder = normalizePath(this.shell.options.settings.longformFolder);
    const files = this.shell.options.vault
      .getFiles()
      .filter((file) => file.extension === "md" && file.path.startsWith(`${folder}/`))
      .sort((first, second) => second.stat.mtime - first.stat.mtime);
    await this.shell.options.services.relations.rebuild(
      this.shell.options.vault,
      this.shell.options.settings.dailyFolder,
    );

    const list = container.createDiv({ cls: "zss-content-list" });
    if (!files.length) {
      list.createDiv({
        cls: "zss-empty",
        text: "还没有长文。可以在日记输入框里写完后选择“长文”。",
      });
      return;
    }

    for (const file of files) {
      await this.renderLongformCard(list, file);
    }
  }

  private async renderLongformCard(parent: HTMLElement, file: TFile): Promise<void> {
    const markdown = await this.shell.options.vault.cachedRead(file);
    const frontmatter = this.shell.options.app.metadataCache.getFileCache(file)?.frontmatter;
    const title =
      typeof frontmatter?.title === "string" && frontmatter.title.trim()
        ? frontmatter.title
        : file.basename;
    const excerpt = markdown
      .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
      .replace(/^# .+$/m, "")
      .trim()
      .slice(0, 180);
    const target = { path: file.path.replace(/\.md$/i, ""), blockId: "source" };
    const referrers = this.shell.options.services.relations.getReferrers(target);

    const card = parent.createEl("article", { cls: "zss-content-card" });
    card.createEl("small", {
      text: `长文 · ${new Date(file.stat.mtime).toLocaleDateString("zh-CN")}`,
    });
    card.createEl("strong", { text: title });
    card.createEl("p", { text: excerpt || "这篇长文还没有摘要。" });
    const actions = card.createDiv({ cls: "zss-content-actions" });
    const relation = actions.createEl("button", {
      cls: "zss-relation-button",
      text: `被 ${referrers.length} 条记录引用 · 查看关联详情`,
      attr: { type: "button" },
    });
    relation.addEventListener("click", () => this.panel.open(title, referrers));
    const open = actions.createEl("button", {
      cls: "zss-text-button",
      text: "打开原文",
      attr: { type: "button" },
    });
    open.addEventListener("click", async () => {
      const leaf = this.shell.options.app.workspace.getLeaf(false);
      await leaf.openFile(file);
    });
  }
}
