import { normalizePath, type TFile, type Vault } from "obsidian";

export interface LongformInput {
  title: string;
  body: string;
  sourceEntryId: string;
  journalDay: string;
  folder?: string;
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

    const folder = normalizePath(input.folder?.trim() || this.config.longformFolder);
    await this.ensureFolder(folder);
    const baseName = sanitizeFileName(title);
    const path = await this.findAvailablePath(folder, baseName);
    const blockId = "source";
    const template = this.findTemplate(folder);
    const templateContent = template
      ? stripFrontmatter(await this.vault.cachedRead(template))
      : "";
    const body = templateContent
      ? renderTemplate(templateContent, title, input.body.trim(), input)
      : `# ${title}\n\n${input.body.trim()}`;
    const markdown = [
      "---",
      `title: ${JSON.stringify(title)}`,
      `source-entry-id: ${input.sourceEntryId}`,
      `journal-day: ${input.journalDay}`,
      "---",
      "",
      body.trim(),
      "",
      body.includes(`^${blockId}`) ? "" : `^${blockId}`,
      "",
    ]
      .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
      .join("\n");

    await this.vault.create(path, markdown);
    const target = path.replace(/\.md$/i, "");
    return {
      path,
      blockId,
      link: `[[${target}#^${blockId}|${title}]]`,
    };
  }

  findTemplate(folder: string): TFile | null {
    const normalized = normalizePath(folder);
    for (const name of ["Template.md", "template.md", "_Template.md", "_template.md"]) {
      const file = this.vault.getFileByPath(normalizePath(`${normalized}/${name}`));
      if (file) return file;
    }
    if (typeof this.vault.getFiles !== "function") return null;
    return (
      this.vault
        .getFiles()
        .find(
          (file) =>
            file.path.startsWith(`${normalized}/`) &&
            ["template.md", "_template.md"].includes(file.name.toLowerCase()) &&
            file.path.slice(normalized.length + 1).indexOf("/") < 0,
        ) ?? null
    );
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

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function renderTemplate(
  template: string,
  title: string,
  body: string,
  input: LongformInput,
): string {
  const hasBodyToken = template.includes("{{body}}");
  const rendered = template
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{body\}\}/g, body)
    .replace(/\{\{date\}\}/g, input.journalDay)
    .replace(/\{\{journal-day\}\}/g, input.journalDay)
    .replace(/\{\{source-entry-id\}\}/g, input.sourceEntryId);
  return hasBodyToken ? rendered : `${rendered.trimEnd()}\n\n${body}`;
}
