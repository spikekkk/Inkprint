import { Notice, Platform, type TFile, type TFolder } from "obsidian";
import type { FolderSummary } from "../services/VaultFolderService";
import type { AppShell } from "./AppShell";
import { FolderRenameModal } from "./FolderRenameModal";

export class VaultPage {
  private host: HTMLElement | null = null;
  private selectedFolderPath: string | null = null;

  constructor(private readonly shell: AppShell) {}

  render(container: HTMLElement): void {
    container.empty();
    this.host = container;
    const head = container.createDiv({ cls: "zss-page-heading" });
    const copy = head.createDiv();
    copy.createEl("h1", { text: "资料库" });
    copy.createSpan({ text: "浏览整个 Vault 的文件夹、模板和文件。" });
    this.renderFolders();
  }

  private renderFolders(): void {
    if (!this.host) return;
    this.host.empty();
    const folders = this.shell.options.services.folders.listFolders();
    if (!this.selectedFolderPath || !folders.some((item) => item.path === this.selectedFolderPath)) {
      this.selectedFolderPath = folders[0]?.path ?? null;
    }
    const head = this.host.createDiv({ cls: "zss-section-title" });
    head.createEl("strong", { text: "全部文件夹" });
    head.createSpan({ text: `${folders.length} 个` });
    const list = this.host.createDiv({ cls: "zss-folder-list" });
    folders.forEach((summary) => this.renderFolderRow(list, summary));
    const selected = folders.find((item) => item.path === this.selectedFolderPath);
    if (selected) this.renderFolderFiles(selected);
  }

  private renderFolderRow(parent: HTMLElement, summary: FolderSummary): void {
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
        if (file) await this.openFile(file);
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
    if (!this.host) return;
    const files = this.shell.options.services.folders.listNotes(summary.folder);
    const section = this.host.createEl("section", { cls: "zss-folder-files" });
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
      button.addEventListener("click", () => void this.openFile(file));
    });
  }

  private async createNote(folder: TFolder): Promise<void> {
    try {
      const file = await this.shell.options.services.folders.createNote(folder);
      await this.openFile(file);
      this.renderFolders();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "新建文件失败。");
    }
  }

  private async openFile(file: TFile): Promise<void> {
    const leaf = this.shell.options.app.workspace.getLeaf(
      Platform.isMobile ? "tab" : "window",
    );
    await leaf.openFile(file);
  }
}
