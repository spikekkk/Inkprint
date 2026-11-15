export type GoalKind =
  | "direction"
  | "objective"
  | "key-result"
  | "stage"
  | "sprint"
  | "task";

export type GoalProgressMode = "manual" | "children" | "count";

export interface GoalNode {
  id: string;
  parentId: string | null;
  title: string;
  kind: GoalKind;
  progressMode: GoalProgressMode;
  done: boolean;
  archived: boolean;
  current?: number;
  target?: number;
  manualProgress?: number;
  schedule?: "daily" | "weekly" | "custom" | "one-off";
  start?: string;
  end?: string;
}

export interface GoalProgress {
  completed: number;
  total: number;
  percent: number;
}

const KIND_TAG = "#okr/";
const BLOCK_ID = /\s+\^([A-Za-z0-9-]+)\s*$/;

export function parseGoalTree(markdown: string): GoalNode[] {
  const nodes: GoalNode[] = [];
  const stack: Array<{ indent: number; id: string }> = [];

  for (const rawLine of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const match = /^(\s*)-\s+(?:\[([ xX])\]\s+)?(.+)$/.exec(rawLine);
    if (!match) continue;

    const indent = match[1].replace(/\t/g, "  ").length;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const idMatch = BLOCK_ID.exec(match[3]);
    if (!idMatch) continue;
    const id = idMatch[1];
    const fields = parseFields(match[3].replace(BLOCK_ID, ""));
    const kindMatch = /#okr\/(direction|objective|key-result|stage|sprint|task)\b/.exec(
      match[3],
    );
    const kind = (kindMatch?.[1] as GoalKind | undefined) ?? "task";
    const title = match[3]
      .replace(BLOCK_ID, "")
      .replace(/#okr\/(?:direction|objective|key-result|stage|sprint|task)\b/g, "")
      .replace(/\[[^\]]+::\s*[^\]]*]/g, "")
      .trim();
    if (!title) continue;

    const parentId = stack.length ? stack[stack.length - 1].id : null;
    const node: GoalNode = {
      id,
      parentId,
      title,
      kind,
      progressMode: parseProgressMode(fields.progress, kind),
      done: match[2]?.toLowerCase() === "x",
      archived: fields.archived === "true",
      ...optionalNumber("current", fields.current),
      ...optionalNumber("target", fields.target),
      ...optionalNumber("manualProgress", fields["manual-progress"]),
      ...optionalSchedule(fields.schedule),
      ...(fields.start ? { start: fields.start } : {}),
      ...(fields.end ? { end: fields.end } : {}),
    };
    nodes.push(node);
    stack.push({ indent, id });
  }

  return nodes;
}

export function serializeGoalTree(nodes: GoalNode[]): string {
  const children = new Map<string | null, GoalNode[]>();
  for (const node of nodes) {
    const group = children.get(node.parentId) ?? [];
    group.push(node);
    children.set(node.parentId, group);
  }

  const lines: string[] = ["# 目标树", ""];
  const visited = new Set<string>();
  const append = (node: GoalNode, depth: number) => {
    if (visited.has(node.id)) throw new Error(`Duplicate goal ID: ${node.id}`);
    visited.add(node.id);
    const indent = "  ".repeat(depth);
    const checkbox = node.kind === "task" ? `[${node.done ? "x" : " "}] ` : "";
    const fields = [
      `[progress:: ${node.progressMode}]`,
      optionalField("current", node.current),
      optionalField("target", node.target),
      optionalField("manual-progress", node.manualProgress),
      optionalField("schedule", node.schedule),
      optionalField("start", node.start),
      optionalField("end", node.end),
      node.archived ? "[archived:: true]" : "",
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(
      `${indent}- ${checkbox}${node.title} ${KIND_TAG}${node.kind} ${fields} ^${node.id}`.trimEnd(),
    );
    for (const child of children.get(node.id) ?? []) append(child, depth + 1);
  };

  for (const root of children.get(null) ?? []) append(root, 0);
  if (visited.size !== nodes.length) {
    const knownIds = new Set(nodes.map((node) => node.id));
    const unknownParent = nodes.find(
      (node) => node.parentId && !knownIds.has(node.parentId),
    );
    throw new Error(
      unknownParent
        ? `Unknown goal parent: ${unknownParent.parentId}`
        : "Goal tree contains a cycle.",
    );
  }

  return `${lines.join("\n")}\n`;
}

export function calculateGoalProgress(nodes: GoalNode[], id: string): GoalProgress {
  const node = nodes.find((candidate) => candidate.id === id);
  if (!node) return { completed: 0, total: 0, percent: 0 };

  if (node.kind === "task") {
    return {
      completed: node.done ? 1 : 0,
      total: 1,
      percent: node.done ? 100 : 0,
    };
  }
  if (node.progressMode === "count" && node.target && node.target > 0) {
    const current = node.current ?? 0;
    return {
      completed: current,
      total: node.target,
      percent: Math.max(0, Math.min(100, Math.round((current / node.target) * 100))),
    };
  }
  if (node.progressMode === "manual") {
    const percent = Math.max(0, Math.min(100, node.manualProgress ?? 0));
    return { completed: percent, total: 100, percent };
  }

  const children = nodes.filter((candidate) => candidate.parentId === node.id);
  if (!children.length) return { completed: 0, total: 0, percent: 0 };
  const taskStats = collectTaskStats(nodes, node.id);
  const childPercent = Math.round(
    children.reduce((sum, child) => sum + calculateGoalProgress(nodes, child.id).percent, 0) /
      children.length,
  );
  return { ...taskStats, percent: childPercent };
}

export function validateGoalMove(
  nodes: GoalNode[],
  id: string,
  parentId: string | null,
): void {
  if (id === parentId) throw new Error("A goal cannot be moved into itself (cycle).");
  if (!parentId) return;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (!byId.has(parentId)) throw new Error(`Unknown goal parent: ${parentId}`);

  let cursor = byId.get(parentId);
  while (cursor?.parentId) {
    if (cursor.parentId === id) {
      throw new Error("A goal cannot be moved into its descendant (cycle).");
    }
    cursor = byId.get(cursor.parentId);
  }
}

function collectTaskStats(nodes: GoalNode[], parentId: string): Omit<GoalProgress, "percent"> {
  const tasks = nodes.filter(
    (node) => node.kind === "task" && !node.archived && isDescendant(nodes, node.id, parentId),
  );
  return {
    completed: tasks.filter((task) => task.done).length,
    total: tasks.length,
  };
}

function isDescendant(nodes: GoalNode[], id: string, parentId: string): boolean {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let current = byId.get(id);
  while (current?.parentId) {
    if (current.parentId === parentId) return true;
    current = byId.get(current.parentId);
  }
  return false;
}

function parseFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const match of text.matchAll(/\[([A-Za-z-]+)::\s*([^\]]*)]/g)) {
    fields[match[1]] = match[2].trim();
  }
  return fields;
}

function parseProgressMode(value: string | undefined, kind: GoalKind): GoalProgressMode {
  if (value === "count" || value === "manual" || value === "children") return value;
  return kind === "task" ? "manual" : "children";
}

function optionalNumber<K extends "current" | "target" | "manualProgress">(
  key: K,
  value: string | undefined,
): Partial<Record<K, number>> {
  if (value === undefined) return {};
  const number = Number(value);
  return Number.isFinite(number) ? ({ [key]: number } as Record<K, number>) : {};
}

function optionalSchedule(
  value: string | undefined,
): Pick<GoalNode, "schedule"> | Record<string, never> {
  return value === "daily" || value === "weekly" || value === "custom" || value === "one-off"
    ? { schedule: value }
    : {};
}

function optionalField(name: string, value: string | number | undefined): string {
  return value === undefined ? "" : `[${name}:: ${value}]`;
}
