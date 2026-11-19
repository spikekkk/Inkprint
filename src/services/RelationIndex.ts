import { normalizePath, type Vault } from "obsidian";
import { parseDailyEntries } from "../domain/dailyEntry";
import { extractRelationTargets } from "../domain/references";
import type { RelationTarget } from "../domain/types";

export interface RelationSource {
  day: string;
  entryId: string;
  createdAt: string;
  text: string;
}

export interface RelationItem extends RelationSource {
  target: RelationTarget;
}

export class RelationIndex {
  private readonly referrers = new Map<string, RelationItem[]>();
  private readonly outgoing = new Map<string, RelationTarget[]>();
  private readonly sources = new Map<string, RelationSource>();

  constructor(sources: readonly RelationSource[]) {
    for (const source of sources) {
      this.sources.set(source.entryId, source);
      const targets = extractRelationTargets(source.text);
      this.outgoing.set(source.entryId, targets);
      for (const target of targets) {
        const key = targetKey(target);
        const items = this.referrers.get(key) ?? [];
        items.push({ ...source, target });
        this.referrers.set(key, items);
      }
    }
  }

  getReferrers(target: RelationTarget): readonly RelationItem[] {
    return this.referrers.get(targetKey(target)) ?? [];
  }

  getOutgoing(entryId: string): readonly RelationTarget[] {
    return this.outgoing.get(entryId) ?? [];
  }

  getSource(entryId: string): RelationSource | undefined {
    return this.sources.get(entryId);
  }

  async rebuild(vault: Vault, dailyFolder: string): Promise<void> {
    const folder = normalizePath(dailyFolder);
    const files = vault
      .getFiles()
      .filter((file) => file.extension === "md" && file.path.startsWith(`${folder}/`));
    const sources: RelationSource[] = [];

    for (const file of files) {
      const date = file.basename;
      const entries = parseDailyEntries(await vault.cachedRead(file));
      for (const entry of entries) {
        sources.push({
          day: date,
          entryId: entry.entryId,
          createdAt: entry.createdAt,
          text: entry.body,
        });
      }
    }
    const rebuilt = new RelationIndex(sources);
    this.referrers.clear();
    rebuilt.referrers.forEach((items, key) => this.referrers.set(key, items));
    this.outgoing.clear();
    rebuilt.outgoing.forEach((targets, key) => this.outgoing.set(key, [...targets]));
    this.sources.clear();
    rebuilt.sources.forEach((source, key) => this.sources.set(key, { ...source }));
  }
}

export function buildRelationIndex(sources: readonly RelationSource[]): RelationIndex {
  return new RelationIndex(sources);
}

function targetKey(target: RelationTarget): string {
  return `${target.path}#^${target.blockId}`;
}
