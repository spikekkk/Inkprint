import type { DailyEntry, DailyEntryInput } from "./types";

export { createEntryId, createRandomSuffix } from "./ids";

const META_PREFIX = "%% journal-meta: ";
const META_SUFFIX = " %%";

export function serializeDailyEntry(input: DailyEntryInput): string {
  const time = extractTime(input.createdAt);
  const tags = input.tags
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .map((tag) => `#${tag}`);
  const header = [`- ${time}`, ...tags].join(" ");
  const body = input.body
    .replace(/\r\n?/g, "\n")
    .trim()
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  const metadata = {
    entryId: input.entryId,
    createdAt: input.createdAt,
    kind: input.kind ?? "note",
    ...(input.taskId ? { taskId: input.taskId } : {}),
    ...(input.event ? { event: input.event } : {}),
    ...(input.longformPath ? { longformPath: input.longformPath } : {}),
    ...(input.bookId ? { bookId: input.bookId } : {}),
  };

  return `${header}\n${body}\n  ${META_PREFIX}${JSON.stringify(metadata)}${META_SUFFIX}\n  ^${input.entryId}\n`;
}

export function parseDailyEntries(markdown: string): DailyEntry[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const entries: DailyEntry[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const header = /^- (\d{2}:\d{2})(.*)$/.exec(lines[index]);
    if (!header) continue;

    const bodyLines: string[] = [];
    let metadataLine: string | null = null;
    let blockId: string | null = null;
    let cursor = index + 1;

    for (; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      const idMatch = /^\s+\^([A-Za-z0-9-]+)\s*$/.exec(line);
      if (idMatch) {
        blockId = idMatch[1];
        break;
      }
      if (line.startsWith("  %% journal-meta: ")) {
        metadataLine = line.trim();
        continue;
      }
      if (!line.startsWith("  ")) break;
      bodyLines.push(line.slice(2));
    }

    if (!blockId || !metadataLine) {
      index = Math.max(index, cursor - 1);
      continue;
    }

    const metadataText = metadataLine.slice(
      META_PREFIX.length,
      metadataLine.length - META_SUFFIX.length,
    );
    let metadata: Record<string, unknown>;
    try {
      metadata = JSON.parse(metadataText) as Record<string, unknown>;
    } catch {
      index = Math.max(index, cursor);
      continue;
    }

    const tags = Array.from(header[2].matchAll(/#([^\s#]+)/g), (match) => match[1]);
    entries.push({
      entryId: typeof metadata.entryId === "string" ? metadata.entryId : blockId,
      blockId,
      createdAt: typeof metadata.createdAt === "string" ? metadata.createdAt : "",
      body: bodyLines.join("\n").trim(),
      tags,
      kind: isEntryKind(metadata.kind) ? metadata.kind : "note",
      ...(typeof metadata.taskId === "string" ? { taskId: metadata.taskId } : {}),
      ...(metadata.event === "completed" || metadata.event === "reopened"
        ? { event: metadata.event }
        : {}),
      ...(typeof metadata.longformPath === "string" ? { longformPath: metadata.longformPath } : {}),
      ...(typeof metadata.bookId === "string" ? { bookId: metadata.bookId } : {}),
    });
    index = cursor;
  }

  return entries;
}

function extractTime(createdAt: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(createdAt);
  return match ? `${match[1]}:${match[2]}` : "00:00";
}

function isEntryKind(value: unknown): value is DailyEntry["kind"] {
  return value === "note" || value === "task" || value === "longform-ref" || value === "book";
}
