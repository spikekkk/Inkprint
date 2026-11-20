export interface ComposerTaskLine {
  stateFrom: number;
  markerFrom: number;
  markerTo: number;
  checked: boolean;
}

export function scanTaskLines(doc: string): ComposerTaskLine[] {
  const tasks: ComposerTaskLine[] = [];
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
    if (fence === null) {
      const match = /^(\s*[-*+]\s+)\[([ xX])\](?:\s+|$)/.exec(line);
      if (match) {
        const markerFrom = offset + match[1].length - 2;
        const bracketFrom = match[1].length;
        tasks.push({
          stateFrom: offset + bracketFrom + 1,
          markerFrom,
          markerTo: offset + match[0].length,
          checked: match[2].toLowerCase() === "x",
        });
      }
    }
    offset += line.length + 1;
  }
  return tasks;
}

export function toggleTaskInDocument(
  doc: string,
  stateFrom: number,
  checked: boolean,
): string {
  if (doc[stateFrom] !== " " && doc[stateFrom]?.toLowerCase() !== "x") return doc;
  return `${doc.slice(0, stateFrom)}${checked ? "x" : " "}${doc.slice(stateFrom + 1)}`;
}

export function getTaskInsertion(
  doc: string,
  cursor: number,
): { position: number; insert: string } {
  const before = doc.slice(0, cursor);
  const lineStart = before.lastIndexOf("\n") + 1;
  const needsNewLine = before.slice(lineStart).trim().length > 0;
  return {
    position: cursor,
    insert: `${needsNewLine ? "\n" : ""}- [ ] `,
  };
}
