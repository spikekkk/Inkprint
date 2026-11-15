import { normalizePath, type Vault } from "obsidian";

export interface LongformInput {
  title: string;
  body: string;
  sourceEntryId: string;
  journalDay: string;
}

export interface LongformResult {
  path: string;
  link: string;
  blockId: string;
}

export class LongformService {
  constructor(
    private readonly vault: Vault,
    private readonly config: { longformFolder: string },
  ) {}

  async create(input: LongformInput): Promise<LongformResult> {
    const title = input.title.trim();
    if (!title) throw new Error("Longform title is required.");
    if (!input.body.trim()) throw new Error("Longform body cannot be empty.");

    const folder = normalizePath(this.config.longformFolder);
    await this.ensureFolder(folder);
    const baseName = sanitizeFileName(title);
    const path = await this.findAvailablePath(folder, baseName);
    const blockId = "source";
    const markdown = [
      "---",
      `title: ${JSON.stringify(title)}`,
      `source-entry-id: ${input.sourceEntryId}`,
      `journal-day: ${input.journalDay}`,
      "---",
      "",
      `# ${title}`,
      "",
      input.body.trim(),
      "",
      `^${blockId}`,
      "",
    ].join("\n");

    await this.vault.create(path, markdown);
    const target = path.replace(/\.md$/i, "");
    return {
      path,
      blockId,
      link: `[[${target}#^${blockId}|${title}]]`,
    };
  }

  private async findAvailablePath(folder: string, baseName: string): Promise<string> {
    for (let attempt = 1; attempt < 1000; attempt += 1) {
      const suffix = attempt === 1 ? "" : `-${attempt}`;
      const path = normalizePath(`${folder}/${baseName}${suffix}.md`);
      if (!this.vault.getFileByPath(path)) return path;
    }
    throw new Error("Unable to create a unique longform path.");
  }

  private async ensureFolder(path: string): Promise<void> {
    const parts = path.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (this.vault.getAbstractFileByPath(current)) continue;
      await this.vault.createFolder(current);
    }
  }
}

function sanitizeFileName(title: string): string {
  const sanitized = title
    .replace(/[\\/:*?"<>|#[\]^]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 96);
  return sanitized || "未命名长文";
}
