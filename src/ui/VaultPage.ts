import { Notice, Platform, setIcon, TFolder, type TFile } from "obsidian";
import type { FolderSummary } from "../services/VaultFolderService";
import type { AppShell } from "./AppShell";
import { FolderRenameModal } from "./FolderRenameModal";
import { getIntlLocale, t } from "../i18n";

export class VaultPage {
  private host: HTMLElement | null = null;
  private selectedFolderPath: string | null = null;

  constructor(private readonly shell: AppShell) {}

  render(container: HTMLElement): void {
    container.empty();
    this.host = container;
    const head = container.createDiv({ cls: "zss-page-heading" });
    const copy = head.createDiv();
    copy.createEl("h1", { text: t("vault.title") });
    copy.createSpan({ text: t("vault.desc") });
    this.host = container.createDiv({ cls: "zss-vault-content" });
    this.renderFolders();
  }

  private renderFolders(): void {
    if (!this.host) return;
    this.host.empty();
    const folders = this.shell.options.services.folders.listFolders();
    if (!this.selectedFolderPath || !folders.some((item) => item.path === this.selectedFolderPath)) {
      this.selectedFolderPath = folders[0]?.path ?? null;
    }
    const layout = this.host.createDiv({ cls: "zss-vault-layout" });
    const tree = layout.createEl("aside", {
      cls: "zss-vault-tree",
      attr: { "aria-label": t("vault.folderAria") },
    });
    const treeHead = tree.createDiv({ cls: "zss-section-title" });
    treeHead.createEl("strong", { text: t("vault.folder") });
    treeHead.createSpan({ text: String(folders.length) });
    folders.forEach((summary) => this.renderFolderRow(tree, summary));

    const selected = folders.find((item) => item.path === this.selectedFolderPath);
    if (selected) this.renderFolderDetail(layout, selected);
  }

  private renderFolderRow(parent: HTMLElement, summary: FolderSummary): void {
    const row = parent.createEl("button", {
      cls: "zss-vault-folder-row",
      attr: {
        type: "button",
        "aria-label": `${summary.label}, ${summary.noteCount}${
          summary.templatePath ? ` · ${t("vault.template")}` : ""
        }`,
      },
    });
    row.dataset.depth = String(summary.depth);
    row.classList.toggle("is-selected", summary.path === this.selectedFolderPath);
    const icon = row.createSpan({ cls: "zss-vault-folder-icon" });
    const hasChildFolders = summary.folder.children.some((child) => child instanceof TFolder);
    setIcon(
      icon,
      summary.path === this.selectedFolderPath
        ? "folder-open"
        : hasChildFolders
          ? "chevron-right"
          : "folder",
    );
    const copy = row.createSpan({ cls: "zss-vault-folder-copy" });
    copy.createEl("strong", { text: summary.label });
    if (summary.templatePath) {
      copy.createEl("small", { text: t("vault.template") });
    }
    row.createSpan({ cls: "zss-vault-folder-count", text: String(summary.noteCount) });
    row.addEventListener("click", () => {
      this.selectedFolderPath = summary.path;
      this.renderFolders();
    });
  }

  private renderFolderDetail(parent: HTMLElement, summary: FolderSummary): void {
    const detail = parent.createEl("section", {
      cls: "zss-vault-detail",
      attr: { "aria-label": t("vault.folderContentAria", { name: summary.label }) },
    });
    const head = detail.createDiv({ cls: "zss-vault-detail-head" });
    const copy = head.createDiv({ cls: "zss-vault-detail-title" });
    copy.createEl("strong", { text: summary.label });
    copy.createSpan({ text: summary.path || t("vault.root") });
    const actions = head.createDiv({ cls: "zss-vault-actions" });
    const add = actions.createEl("button", {
      cls: "zss-primary-button",
      text: t("vault.newNote"),
      attr: { type: "button" },
    });
    add.addEventListener("click", () => void this.createNote(summary.folder));
    if (!summary.folder.isRoot()) {
      const rename = actions.createEl("button", {
        cls: "zss-text-button",
        text: t("vault.rename"),
        attr: { type: "button" },
      });
      rename.addEventListener("click", () => {
        new FolderRenameModal(this.shell.options.app, summary.folder.name, async (name) => {
          await this.shell.options.services.folders.renameFolder(summary.folder, name);
          this.renderFolders();
          new Notice(t("vault.renamed"));
        }).open();
      });
    }

    if (summary.templatePath) {
      const template = detail.createDiv({ cls: "zss-vault-template" });
      template.createSpan({ text: t("vault.usesTemplate") });
      const open = template.createEl("button", {
        text: summary.templatePath,
        attr: { type: "button" },
      });
      open.addEventListener("click", async () => {
        const file = this.shell.options.vault.getFileByPath(summary.templatePath!);
        if (file) await this.openFile(file);
      });
    }

    const files = this.shell.options.services.folders.listNotes(summary.folder);
    const filesHead = detail.createDiv({ cls: "zss-section-title" });
    filesHead.createEl("strong", { text: t("vault.markdown") });
    filesHead.createSpan({ text: t("stats.count", { count: files.length }) });
    if (!files.length) {
      detail.createDiv({ cls: "zss-empty", text: t("vault.emptyFolder") });
      return;
    }
    const grid = detail.createDiv({ cls: "zss-vault-file-grid" });
    files.forEach((file) => {
      const card = grid.createEl("button", {
        cls: "zss-vault-file-card",
        attr: { type: "button" },
      });
      card.createEl("strong", { text: file.basename });
      card.createSpan({
        text: t("vault.updated", {
          date: new Date(file.stat.mtime).toLocaleDateString(
            getIntlLocale(),
          ),
        }),
      });
      card.addEventListener("click", () => void this.openFile(file));
    });
  }

  private async createNote(folder: TFolder): Promise<void> {
    try {
      const file = await this.shell.options.services.folders.createNote(folder);
      await this.openFile(file);
      this.renderFolders();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : t("sidebar.pageError"));
    }
  }

  private async openFile(file: TFile): Promise<void> {
    const leaf = this.shell.options.app.workspace.getLeaf(
      Platform.isMobile ? "tab" : "window",
    );
    await leaf.openFile(file);
  }
}
