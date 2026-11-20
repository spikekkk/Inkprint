import type { DailyEntry, DailyEntryInput } from "./types";
import { t } from "../i18n";

export { createEntryId, createRandomSuffix } from "./ids";

const META_PREFIX = "%% journal-meta: ";
const META_SUFFIX = " %%";
const LEGACY_TIME_PATTERN = /^-\s+(\d{2}:\d{2}(?::\d{2})?)(?:\s+(.*))?$/u;
const LEGACY_TASK_PATTERN =
  /^-\s+\[([ xX])\]\s+(\d{2}:\d{2}(?::\d{2})?)(?:\s+(.*))?$/u;

export interface DailyEntryParseOptions {
  dateKey?: string;
  includeLegacy?: boolean;
}

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
    ...(input.editedAt ? { editedAt: input.editedAt } : {}),
    kind: input.kind ?? "note",
    ...(input.taskId ? { taskId: input.taskId } : {}),
    ...(input.event ? { event: input.event } : {}),
    ...(input.longformPath ? { longformPath: input.longformPath } : {}),
    ...(input.bookId ? { bookId: input.bookId } : {}),
  };

  return `${header}\n${body}\n  ${META_PREFIX}${JSON.stringify(metadata)}${META_SUFFIX}\n  ^${input.entryId}\n`;
}

export function parseDailyEntries(
  markdown: string,
  options: DailyEntryParseOptions = {},
): DailyEntry[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const entries: DailyEntry[] = [];
  let fence: string | null = null;
  let frontmatter = lines[0]?.trim() === "---";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (frontmatter) {
      if (index > 0 && /^(?:---|\.\.\.)\s*$/.test(line)) frontmatter = false;
      continue;
    }
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      fence = fence === null ? marker : fence === marker ? null : fence;
      continue;
    }
    if (fence !== null) continue;

    const native = parseNativeEntry(lines, index);
    if (native) {
      entries.push(native.entry);
      index = native.endLine;
      continue;
    }

    if (options.includeLegacy !== false) {
      const legacy = parseLegacyEntry(lines, index, options.dateKey);
      if (legacy) {
        entries.push(legacy.entry);
        index = legacy.endLine;
      }
    }
  }

  return entries;
}

export function replaceDailyEntry(
  markdown: string,
  entryId: string,
  body: string,
  tags: readonly string[],
  editedAt?: string,
): string {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  let startLine = -1;
  let endLine = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (!/^- (\d{2}:\d{2})(?:\s|$)/.test(lines[index])) continue;
    let cursor = index + 1;
    for (; cursor < lines.length; cursor += 1) {
      const idMatch = /^\s+\^([A-Za-z0-9-]+)\s*$/.exec(lines[cursor]);
      if (idMatch) {
        if (idMatch[1] === entryId) {
          startLine = index;
          endLine = cursor;
        }
        break;
      }
      if (!lines[cursor].startsWith("  ")) break;
    }
    if (startLine !== -1) break;
  }

  if (startLine === -1 || endLine === -1) {
    throw new Error(t("error.entryMissing"));
  }

  const existing = parseDailyEntries(normalized).find(
    (entry) => entry.entryId === entryId && entry.source !== "legacy",
  );
  if (!existing) {
    throw new Error(t("error.legacyReadOnly"));
  }

  const replacement = serializeDailyEntry({
    ...existing,
    body,
    tags: [...tags],
    ...(editedAt ? { editedAt } : {}),
  }).trimEnd();
  const nextLines = [
    ...lines.slice(0, startLine),
    ...replacement.split("\n"),
    ...lines.slice(endLine + 1),
  ];
  return `${nextLines.join("\n")}${normalized.endsWith("\n") ? "\n" : ""}`;
}

function parseNativeEntry(
  lines: readonly string[],
  startLine: number,
): { entry: DailyEntry; endLine: number } | null {
  const header = /^- (\d{2}:\d{2})(.*)$/.exec(lines[startLine]);
  if (!header) return null;

  const bodyLines: string[] = [];
  let metadataLine: string | null = null;
  let blockId: string | null = null;
  let cursor = startLine + 1;

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

  if (!blockId || !metadataLine) return null;

  const metadataText = metadataLine.slice(
    META_PREFIX.length,
    metadataLine.length - META_SUFFIX.length,
  );
  let metadata: Record<string, unknown>;
  try {
    metadata = JSON.parse(metadataText) as Record<string, unknown>;
  } catch {
    return null;
  }

  const tags = Array.from(header[2].matchAll(/#([^\s#]+)/g), (match) => match[1]);
  return {
    endLine: cursor,
    entry: {
      entryId: typeof metadata.entryId === "string" ? metadata.entryId : blockId,
      blockId,
      createdAt: typeof metadata.createdAt === "string" ? metadata.createdAt : "",
      ...(typeof metadata.editedAt === "string" ? { editedAt: metadata.editedAt } : {}),
      body: bodyLines.join("\n").trim(),
      tags,
      kind: isEntryKind(metadata.kind) ? metadata.kind : "note",
      ...(typeof metadata.taskId === "string" ? { taskId: metadata.taskId } : {}),
      ...(metadata.event === "completed" || metadata.event === "reopened"
        ? { event: metadata.event }
        : {}),
      ...(typeof metadata.longformPath === "string" ? { longformPath: metadata.longformPath } : {}),
      ...(typeof metadata.bookId === "string" ? { bookId: metadata.bookId } : {}),
      source: "inkprint",
    },
  };
}

function parseLegacyEntry(
  lines: readonly string[],
  startLine: number,
  dateKey?: string,
): { entry: DailyEntry; endLine: number } | null {
  const line = lines[startLine];
  const taskMatch = LEGACY_TASK_PATTERN.exec(line);
  const plainMatch = taskMatch ? null : LEGACY_TIME_PATTERN.exec(line);
  const match = taskMatch ?? plainMatch;
  if (!match) return null;

  const taskState = taskMatch ? taskMatch[1] : null;
  const time = taskMatch ? taskMatch[2] : plainMatch?.[1] ?? "";
  const firstContent = (taskMatch ? taskMatch[3] : plainMatch?.[2])?.trim() ?? "";
  if (!isValidTime(time)) return null;

  const contentLines = firstContent
    ? [taskState ? `- [${taskState}] ${firstContent}` : firstContent]
    : [];
  let endLine = startLine;
  let cursor = startLine + 1;

  for (; cursor < lines.length; cursor += 1) {
    const continuation = lines[cursor];
    if (!/^(?: {2,}|\t)/.test(continuation)) break;
    if (/^\s+%% journal-meta:/.test(continuation)) continue;
    if (/^\s+\^[A-Za-z0-9-]+\s*$/.test(continuation)) continue;
    contentLines.push(continuation.replace(/^(?: {2,}|\t)/, ""));
    endLine = cursor;
  }

  const body = contentLines.join("\n").trim();
  if (!body) return null;
  const tags = Array.from(body.matchAll(/#([^\s#]+)/g), (tag) => tag[1]);
  const fingerprint = stableHash(`${startLine}\0${time}\0${body}`);
  const entryId = `legacy-${dateKey?.replace(/\D/g, "") || "daily"}-${time.replace(
    /\D/g,
    "",
  )}-${fingerprint}`;
  const normalizedTime = time.length === 5 ? `${time}:00` : time;

  return {
    endLine,
    entry: {
      entryId,
      blockId: entryId,
      createdAt: `${dateKey ?? "1970-01-01"}T${normalizedTime}`,
      body,
      tags,
      kind: "note",
      source: "legacy",
    },
  };
}

function isValidTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(value);
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function extractTime(createdAt: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(createdAt);
  return match ? `${match[1]}:${match[2]}` : "00:00";
}

function isEntryKind(value: unknown): value is DailyEntry["kind"] {
  return value === "note" || value === "task" || value === "longform-ref" || value === "book";
}
