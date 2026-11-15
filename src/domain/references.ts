import type { MarkdownReference, RelationTarget } from "./types";

export function extractReferences(markdown: string): MarkdownReference[] {
  const references: MarkdownReference[] = [];
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let fence: string | null = null;
  let inComment = false;
  let offset = 0;

  for (const rawLine of lines) {
    const lineOffset = offset;
    offset += rawLine.length + 1;

    const marker = /^\s*(`{3,}|~{3,})/.exec(rawLine)?.[1];
    if (!inComment && marker) {
      fence = fence === null ? marker[0] : fence === marker[0] ? null : fence;
      continue;
    }
    if (fence !== null) continue;

    const visible = maskCommentsAndInlineCode(rawLine, {
      get: () => inComment,
      set: (value) => {
        inComment = value;
      },
    });
    if (!visible.trim()) continue;

    const pattern = /(!?\[\[([^\]]+)\]\])|(!?\[([^\]]*)\]\(([^)\n]+)\))/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(visible)) !== null) {
      if (match[1] !== undefined) {
        if (match[1].startsWith("!")) continue;
        const [target, ...alias] = match[2].split("|");
        references.push({
          startOffset: lineOffset + match.index,
          raw: match[1],
          target,
          displayText: alias.length ? alias.join("|") : null,
          syntax: "wiki_link",
          valid: target.length > 0,
        });
        continue;
      }

      if (match[3]?.startsWith("!")) continue;
      const target = match[5].trim().replace(/^<|>$/g, "");
      references.push({
        startOffset: lineOffset + match.index,
        raw: match[3],
        target,
        displayText: match[4] || null,
        syntax: "markdown_link",
        valid: target.length > 0,
      });
    }
  }

  return references;
}

export function extractRelationTargets(markdown: string): RelationTarget[] {
  const unique = new Map<string, RelationTarget>();

  for (const reference of extractReferences(markdown)) {
    if (!reference.valid) continue;
    if (/^[a-z][\w+.-]*:/i.test(reference.target)) continue;
    const match = /^(.*?)#\^([A-Za-z0-9-]+)$/.exec(reference.target);
    if (!match) continue;
    const target = { path: match[1], blockId: match[2] };
    unique.set(`${target.path}#^${target.blockId}`, target);
  }

  return [...unique.values()];
}

function maskCommentsAndInlineCode(
  line: string,
  commentState: { get: () => boolean; set: (value: boolean) => void },
): string {
  let result = "";
  let index = 0;

  while (index < line.length) {
    if (commentState.get()) {
      const close = line.indexOf("-->", index);
      if (close < 0) return result.padEnd(line.length, " ");
      const consumed = close + 3 - index;
      result += " ".repeat(consumed);
      index = close + 3;
      commentState.set(false);
      continue;
    }

    const comment = line.indexOf("<!--", index);
    const code = line.indexOf("`", index);
    const next = minPositive(comment, code);
    if (next < 0) {
      result += line.slice(index);
      break;
    }

    result += line.slice(index, next);
    index = next;
    if (index === comment) {
      const close = line.indexOf("-->", index + 4);
      if (close < 0) {
        commentState.set(true);
        return result.padEnd(line.length, " ");
      }
      const consumed = close + 3 - index;
      result += " ".repeat(consumed);
      index = close + 3;
      continue;
    }

    const tickMatch = /^`+/.exec(line.slice(index));
    const ticks = tickMatch?.[0] ?? "`";
    const close = line.indexOf(ticks, index + ticks.length);
    if (close < 0) {
      result += " ".repeat(ticks.length);
      index += ticks.length;
      continue;
    }
    const consumed = close + ticks.length - index;
    result += " ".repeat(consumed);
    index = close + ticks.length;
  }

  return result;
}

function minPositive(first: number, second: number): number {
  if (first < 0) return second;
  if (second < 0) return first;
  return Math.min(first, second);
}
