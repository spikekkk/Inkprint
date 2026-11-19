import type { RelationItem } from "../services/RelationIndex";
import type { RelationTarget } from "../domain/types";
import type { AppShell } from "./AppShell";

export interface EntryRelationDetails {
  title: string;
  subtitle: string;
  body: string;
  incoming: readonly RelationItem[];
  outgoing: readonly RelationTarget[];
}

export class RelationPanel {
  private root: HTMLElement | null = null;

  constructor(private readonly shell: AppShell) {}

  open(title: string, items: readonly RelationItem[]): void {
    this.close();
    const appRoot = this.shell.options.container.querySelector<HTMLElement>(".zss-app");
    if (!appRoot) return;

    const backdrop = appRoot.createDiv({ cls: "zss-relation-backdrop" });
    backdrop.addEventListener("click", () => this.close());
    const panel = appRoot.createEl("aside", {
      cls: "zss-relation-panel",
      attr: { "aria-label": "关联详情" },
    });
    panel.createDiv({ cls: "zss-relation-grabber", attr: { "aria-hidden": "true" } });
    const head = panel.createDiv({ cls: "zss-relation-head" });
    const copy = head.createDiv();
    copy.createEl("small", { text: "长文 · 关联详情" });
    copy.createEl("strong", { text: title });
    copy.createSpan({ text: `被 ${items.length} 条记录引用` });
    const close = head.createEl("button", {
      cls: "zss-icon-button",
      text: "×",
      attr: { type: "button", "aria-label": "关闭关联详情" },
    });
    close.addEventListener("click", () => this.close());

    const body = panel.createDiv({ cls: "zss-relation-body" });
    if (!items.length) {
      body.createDiv({ cls: "zss-empty", text: "还没有其他记录引用这篇长文。" });
    } else {
      items
        .slice()
        .sort((first, second) => first.day.localeCompare(second.day))
        .forEach((item) => {
          const row = body.createEl("article", { cls: "zss-relation-item" });
          row.createEl("small", {
            text: `${item.day} · ${
              item.createdAt.match(/T(\d{2}:\d{2})/)?.[1] ?? ""
            }`,
          });
          row.createEl("p", { text: item.text || "（仅包含图片或引用）" });
          const button = row.createEl("button", {
            text: "回到那天",
            attr: { type: "button" },
          });
          button.addEventListener("click", () => {
            this.close();
            this.shell.openDate(item.day);
          });
        });
    }

    this.root = appRoot;
    appRoot.classList.add("has-relation-panel");
    window.setTimeout(() => close.focus(), 0);
  }

  openEntry(details: EntryRelationDetails): void {
    this.open(details.title, details.incoming);
    const panel = this.root?.querySelector<HTMLElement>(".zss-relation-panel");
    const body = panel?.querySelector<HTMLElement>(".zss-relation-body");
    const head = panel?.querySelector<HTMLElement>(".zss-relation-head");
    if (!body || !head) return;
    body.querySelector(".zss-empty")?.remove();
    head.querySelector("small")?.setText("记录 · 关联详情");
    const headMeta = head.querySelector("span");
    if (headMeta) {
      headMeta.setText(
        `引用 ${details.outgoing.length} 条 · 被 ${details.incoming.length} 条引用`,
      );
    }

    const source = body.createEl("article", { cls: "zss-relation-item" });
    source.createEl("small", { text: details.subtitle });
    source.createEl("p", { text: details.body || "（仅包含图片或引用）" });
    body.prepend(source);

    if (details.outgoing.length) {
      const heading = body.createDiv({ cls: "zss-section-title" });
      heading.createEl("strong", { text: "这条记录引用了" });
      details.outgoing.forEach((target) => {
        const row = body.createEl("article", { cls: "zss-relation-item" });
        row.createEl("small", { text: "出链" });
        row.createEl("p", { text: `${target.path}#^${target.blockId}` });
        const button = row.createEl("button", {
          text: "查看关联目标",
          attr: { type: "button" },
        });
        button.addEventListener("click", () => {
          const dailyMatch = /(?:^|\/)Daily\/(\d{4}-\d{2}-\d{2})(?:\.md)?$/.exec(
            target.path,
          );
          this.close();
          if (dailyMatch) {
            this.shell.openDate(dailyMatch[1]);
          } else {
            void this.shell.options.app.workspace.openLinkText(
              `${target.path}#^${target.blockId}`,
              "",
              false,
            );
          }
        });
      });
    }
  }

  close(): void {
    if (!this.root) return;
    this.root.querySelector(".zss-relation-panel")?.remove();
    this.root.querySelector(".zss-relation-backdrop")?.remove();
    this.root.classList.remove("has-relation-panel");
    this.root = null;
  }
}
