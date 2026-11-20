export type EntryKind = "note" | "task" | "longform-ref" | "book";
export type TaskEvent = "completed" | "reopened";
export type EntrySource = "inkprint" | "legacy";

export interface DailyEntryInput {
  entryId: string;
  createdAt: string;
  editedAt?: string;
  body: string;
  tags: string[];
  kind?: EntryKind;
  taskId?: string;
  event?: TaskEvent;
  longformPath?: string;
  bookId?: string;
}

export interface DailyEntry extends DailyEntryInput {
  blockId: string;
  source?: EntrySource;
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
