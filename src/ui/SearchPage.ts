import { normalizePath, Notice, type App } from "obsidian";
import { parseDailyEntries } from "../domain/dailyEntry";
import type { AppShell } from "./AppShell";

interface SearchResult {
  path: string;
  title: string;
  excerpt: string;
  searchable: string;
  blockId?: string;
}

export class SearchPage {
  constructor(private readonly shell: AppShell) {}

  async render(container: HTMLElement): Promise<void> {
    container.empty();
    const head = container.createDiv({ cls: "zss-page-heading" });
    const copy = head.createDiv();
    copy.createEl("h1", { text: "搜索" });
    copy.createSpan({ text: "搜索日记、长文和标签。" });
    const global = head.createEl("button", {
      cls: "zss-text-button",
      text: "打开 Obsidian 全局搜索",
      attr: { type: "button" },
    });
    global.addEventListener("click", () => {
      const app = this.shell.options.app as App & {
        commands: { executeCommandById(id: string): boolean };
      };
      if (!app.commands.executeCommandById("global-search:open")) {
        new Notice("没有找到 Obsidian 全局搜索命令。");
      }
    });

    const field = container.createEl("label", { cls: "zss-search-field" });
    const input = field.createEl("input", {
      attr: {
        type: "search",
        placeholder: "输入正文、书名或标签",
        "aria-label": "搜索日记和长文",
      },
    });
    const results = container.createDiv({ cls: "zss-search-results" });
    const sources = await this.collectSources();
    const draw = () => {
      const query = input.value.trim().toLocaleLowerCase("zh-CN");
      results.empty();
      const matches = sources
        .filter((source) => !query || source.searchable.includes(query))
        .slice(0, 40);
      if (!matches.length) {
        results.createDiv({ cls: "zss-empty", text: "没有找到匹配记录。" });
        return;
      }
      matches.forEach((result) => {
        const button = results.createEl("button", {
          cls: "zss-search-result",
          attr: { type: "button" },
        });
        button.createEl("small", { text: result.title });
        button.createEl("p", { text: result.excerpt });
        button.addEventListener("click", () => {
          void this.shell.options.app.workspace.openLinkText(
            result.blockId ? `${result.path}#^${result.blockId}` : result.path,
            "",
            false,
          );
        });
      });
    };
    input.addEventListener("input", draw);
    draw();
  }

  private async collectSources(): Promise<SearchResult[]> {
    const vault = this.shell.options.vault;
    const settings = this.shell.options.settings;
    const dailyFolder = normalizePath(settings.dailyFolder);
    const longformFolder = normalizePath(settings.longformFolder);
    const files = vault
      .getFiles()
      .filter(
        (file) =>
          file.extension === "md" &&
          (file.path.startsWith(`${dailyFolder}/`) ||
            file.path.startsWith(`${longformFolder}/`)),
      );
    const results: SearchResult[] = [];

    for (const file of files) {
      const markdown = await vault.cachedRead(file);
      if (file.path.startsWith(`${dailyFolder}/`)) {
        for (const entry of parseDailyEntries(markdown)) {
          results.push({
            path: file.path,
            blockId: entry.blockId,
            title: `${file.basename} · ${entry.createdAt.match(/T(\d{2}:\d{2})/)?.[1] ?? ""}`,
            excerpt: entry.body.slice(0, 180),
            searchable: `${file.basename}\n${entry.body}\n${entry.tags.join(" ")}`.toLocaleLowerCase(
              "zh-CN",
            ),
          });
        }
      } else {
        const frontmatter = this.shell.options.app.metadataCache.getFileCache(file)?.frontmatter;
        const title =
          typeof frontmatter?.title === "string" ? frontmatter.title : file.basename;
        const body = markdown
          .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
          .replace(/^# .+$/m, "")
          .trim();
        results.push({
          path: file.path,
          title: `长文 · ${title}`,
          excerpt: body.slice(0, 180),
          searchable: `${title}\n${body}`.toLocaleLowerCase("zh-CN"),
        });
      }
    }
    return results;
  }
}
