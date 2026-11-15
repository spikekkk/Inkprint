import { normalizePath, type TFile, type Vault } from "obsidian";
import {
  parseGoalTree,
  serializeGoalTree,
  validateGoalMove,
  type GoalKind,
  type GoalNode,
  type GoalProgressMode,
} from "../domain/goalTree";

export interface GoalInput {
  title: string;
  kind: GoalKind;
  progressMode?: GoalProgressMode;
  current?: number;
  target?: number;
  schedule?: GoalNode["schedule"];
  start?: string;
  end?: string;
}

export class GoalService {
  constructor(
    private readonly vault: Vault,
    private readonly config: { goalsPath: string },
  ) {}

  async load(): Promise<GoalNode[]> {
    const file = await this.ensureFile();
    return parseGoalTree(await this.vault.cachedRead(file));
  }

  async create(parentId: string | null, input: GoalInput): Promise<GoalNode> {
    const title = input.title.trim();
    if (!title) throw new Error("Goal title is required.");
    const nodes = await this.load();
    if (parentId && !nodes.some((node) => node.id === parentId)) {
      throw new Error(`Unknown goal parent: ${parentId}`);
    }

    const node: GoalNode = {
      id: createGoalId(),
      parentId,
      title,
      kind: input.kind,
      progressMode:
        input.progressMode ?? (input.kind === "task" ? "manual" : "children"),
      done: false,
      archived: false,
      ...(input.current !== undefined ? { current: input.current } : {}),
      ...(input.target !== undefined ? { target: input.target } : {}),
      ...(input.schedule ? { schedule: input.schedule } : {}),
      ...(input.start ? { start: input.start } : {}),
      ...(input.end ? { end: input.end } : {}),
    };
    nodes.push(node);
    await this.persist(nodes);
    return node;
  }

  async update(
    id: string,
    update: Partial<Pick<GoalNode, "title" | "kind" | "schedule" | "start" | "end">>,
  ): Promise<GoalNode> {
    const nodes = await this.load();
    const node = nodes.find((candidate) => candidate.id === id);
    if (!node) throw new Error(`Unknown goal: ${id}`);
    Object.assign(node, update);
    if (update.title !== undefined && !update.title.trim()) {
      throw new Error("Goal title is required.");
    }
    if (update.title) node.title = update.title.trim();
    await this.persist(nodes);
    return node;
  }

  async move(id: string, parentId: string | null): Promise<void> {
    const nodes = await this.load();
    const node = nodes.find((candidate) => candidate.id === id);
    if (!node) throw new Error(`Unknown goal: ${id}`);
    validateGoalMove(nodes, id, parentId);
    node.parentId = parentId;
    await this.persist(nodes);
  }

  async archive(id: string): Promise<void> {
    const nodes = await this.load();
    const node = nodes.find((candidate) => candidate.id === id);
    if (!node) throw new Error(`Unknown goal: ${id}`);
    const ids = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of nodes) {
        if (candidate.parentId && ids.has(candidate.parentId) && !ids.has(candidate.id)) {
          ids.add(candidate.id);
          changed = true;
        }
      }
    }
    for (const candidate of nodes) {
      if (ids.has(candidate.id)) candidate.archived = true;
    }
    await this.persist(nodes);
  }

  private async persist(nodes: GoalNode[]): Promise<void> {
    const file = await this.ensureFile();
    await this.vault.process(file, () => serializeGoalTree(nodes));
  }

  private async ensureFile(): Promise<TFile> {
    const path = normalizePath(this.config.goalsPath);
    const existing = this.vault.getFileByPath(path);
    if (existing) return existing;

    const slash = path.lastIndexOf("/");
    if (slash >= 0) await this.ensureFolder(path.slice(0, slash));
    return this.vault.create(path, "# 目标树\n\n");
  }

  private async ensureFolder(path: string): Promise<void> {
    let current = "";
    for (const part of path.split("/").filter(Boolean)) {
      current = current ? `${current}/${part}` : part;
      if (this.vault.getAbstractFileByPath(current)) continue;
      await this.vault.createFolder(current);
    }
  }
}

function createGoalId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const suffix = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `goal-${Date.now().toString(36)}-${suffix}`;
}
