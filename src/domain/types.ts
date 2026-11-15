export type EntryKind = "note" | "task" | "longform-ref" | "book";

export interface DailyEntryInput {
  entryId: string;
  createdAt: string;
  body: string;
  tags: string[];
  kind?: EntryKind;
  taskId?: string;
  longformPath?: string;
  bookId?: string;
}

export interface DailyEntry extends DailyEntryInput {
  blockId: string;
}

export interface RelationTarget {
  path: string;
  blockId: string;
}

export interface MarkdownReference {
  startOffset: number;
  raw: string;
  target: string;
  displayText: string | null;
  syntax: "wiki_link" | "markdown_link";
  valid: boolean;
}
