import type { RelationItem } from "../services/RelationIndex";
import type { AppShell } from "./AppShell";

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

  close(): void {
    if (!this.root) return;
    this.root.querySelector(".zss-relation-panel")?.remove();
    this.root.querySelector(".zss-relation-backdrop")?.remove();
    this.root.classList.remove("has-relation-panel");
    this.root = null;
  }
}
