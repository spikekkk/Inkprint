export interface ComposerImageRange {
  from: number;
  to: number;
  path: string;
}

const WIKI_IMAGE_PATTERN = /!\[\[([^\]\n]+)\]\]/gu;
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]\n]*\]\(([^)\n]+)\)/gu;

export function scanComposerImages(doc: string): ComposerImageRange[] {
  const images: ComposerImageRange[] = [];
  let offset = 0;
  let fence: string | null = null;

  for (const line of doc.split("\n")) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      fence = fence === null ? marker : fence === marker ? null : fence;
      offset += line.length + 1;
      continue;
    }
    if (fence !== null) {
      offset += line.length + 1;
      continue;
    }

    for (const match of line.matchAll(WIKI_IMAGE_PATTERN)) {
      const rawPath = match[1].split("|", 1)[0]?.trim() ?? "";
      if (!rawPath) continue;
      images.push({
        from: offset + (match.index ?? 0),
        to: offset + (match.index ?? 0) + match[0].length,
        path: rawPath,
      });
    }

    for (const match of line.matchAll(MARKDOWN_IMAGE_PATTERN)) {
      const path = normalizeMarkdownImagePath(match[1]);
      if (!path) continue;
      images.push({
        from: offset + (match.index ?? 0),
        to: offset + (match.index ?? 0) + match[0].length,
        path,
      });
    }

    offset += line.length + 1;
  }

  return images
    .sort((left, right) => left.from - right.from)
    .filter((image, index, values) => index === 0 || image.from >= values[index - 1].to);
}

function normalizeMarkdownImagePath(value: string): string {
  const trimmed = value.trim();
  const withoutTitle = trimmed.startsWith("<")
    ? trimmed.slice(1, trimmed.indexOf(">") > 0 ? trimmed.indexOf(">") : undefined)
    : trimmed.split(/\s+["']/u, 1)[0];
  try {
    return decodeURI(withoutTitle);
  } catch {
    return withoutTitle;
  }
}
