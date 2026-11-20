import {
  normalizePath,
  TFile,
  TFolder,
  type App,
  type TAbstractFile,
} from "obsidian";
import { t } from "../i18n";

export interface FolderSummary {
  folder: TFolder;
  path: string;
  label: string;
  depth: number;
  noteCount: number;
  templatePath: string | null;
}

export class VaultFolderService {
  constructor(private readonly app: App) {}

  listFolders(): FolderSummary[] {
    return this.app.vault
      .getAllLoadedFiles()
      .filter((file): file is TFolder => file instanceof TFolder)
      .filter((folder) => !this.isExcluded(folder.path))
      .sort((first, second) => first.path.localeCompare(second.path))
      .map((folder) => {
        const directFiles = folder.children.filter(
          (child): child is TFile => child instanceof TFile && child.extension === "md",
        );
        const template = directFiles.find((file) =>
          ["template.md", "_template.md"].includes(file.name.toLowerCase()),
        );
        return {
          folder,
          path: folder.path,
          label: folder.isRoot() ? t("vault.root") : folder.name,
          depth: folder.path ? folder.path.split("/").length : 0,
          noteCount: directFiles.length,
          templatePath: template?.path ?? null,
        };
      });
  }

  listNotes(folder: TFolder): TFile[] {
    return folder.children
      .filter((child): child is TFile => child instanceof TFile && child.extension === "md")
      .sort((first, second) => first.name.localeCompare(second.name));
  }

  async renameFolder(folder: TFolder, nextName: string): Promise<string> {
    if (folder.isRoot()) throw new Error(t("vault.renameRoot"));
    const name = nextName.trim().replace(/[\\/:*?"<>|]/g, "-");
    if (!name) throw new Error(t("vault.renameEmpty"));
    const parent = folder.parent?.path ?? "";
    const nextPath = normalizePath(parent ? `${parent}/${name}` : name);
    if (nextPath === folder.path) return folder.path;
    if (this.app.vault.getAbstractFileByPath(nextPath)) {
      throw new Error(t("vault.nameExists"));
    }
    await this.app.fileManager.renameFile(folder as TAbstractFile, nextPath);
    return nextPath;
  }

  async createNote(folder: TFolder): Promise<TFile> {
    const base = t("vault.unnamed");
    let path = "";
    for (let index = 0; index < 1000; index += 1) {
      const name = index === 0 ? base : `${base} ${index}`;
      path = normalizePath(folder.path ? `${folder.path}/${name}.md` : `${name}.md`);
      if (!this.app.vault.getFileByPath(path)) break;
      path = "";
    }
    if (!path) throw new Error(t("vault.uniqueNameFailed"));
    const template = this.listFolders().find((item) => item.path === folder.path)?.templatePath;
    const content = template
      ? (await this.app.vault.cachedRead(this.app.vault.getFileByPath(template)!))
          .replace(/\{\{date\}\}/g, new Date().toISOString().slice(0, 10))
          .replace(/\{\{title\}\}/g, t("vault.unnamed"))
      : "";
    return this.app.vault.create(path, content);
  }

  private isExcluded(path: string): boolean {
    return (
      path === ".obsidian" ||
      path.startsWith(".obsidian/") ||
      path === ".trash" ||
      path.startsWith(".trash/") ||
      path === "node_modules" ||
      path.startsWith("node_modules/")
    );
  }
}
