import { Notice, setIcon } from "obsidian";
import {
  calculateGoalProgress,
  type GoalKind,
  type GoalNode,
} from "../domain/goalTree";
import type { AppShell } from "./AppShell";
import { dateKey } from "./CalendarMonth";

const KIND_LABELS: Record<GoalKind, string> = {
  direction: "方向",
  objective: "目标",
  "key-result": "关键结果",
  stage: "阶段",
  sprint: "冲刺",
  task: "任务",
};

export class GoalPage {
  private nodes: GoalNode[] = [];
  private readonly collapsed = new Set<string>();
  private treeHost: HTMLElement | null = null;

  constructor(private readonly shell: AppShell) {}

  async render(container: HTMLElement): Promise<void> {
    container.empty();
    const head = container.createDiv({ cls: "zss-page-heading" });
    const copy = head.createDiv();
    copy.createEl("h1", { text: "目标与打卡" });
    const summary = copy.createSpan();
    const newButton = head.createEl("button", {
      cls: "zss-primary-button",
      attr: { type: "button" },
    });
    setIcon(newButton.createSpan(), "plus");
    newButton.createSpan({ text: "新建目标" });
    newButton.addEventListener("click", () => this.openForm(null, null, "create"));

    const heatmap = container.createEl("section", {
      cls: "zss-goal-heatmap",
      attr: { "aria-label": "最近二十八天打卡完成率" },
    });
    heatmap.createEl("strong", { text: "最近 28 天完成节奏" });
    const grid = heatmap.createDiv({ cls: "zss-goal-heat-grid" });
    const levels = [2, 4, 3, 0, 1, 2, 3, 4, 2, 1, 0, 3, 4, 3, 2, 1, 4, 4, 2, 0, 3, 2, 1, 4, 3, 2, 4, 4];
    levels.forEach((level) => {
      const cell = grid.createSpan({ cls: "zss-goal-heat-cell" });
      cell.dataset.level = String(level);
      cell.setAttribute("aria-label", `完成度 ${level * 25}%`);
    });

    this.treeHost = container.createDiv({ cls: "zss-goal-tree" });
    await this.reload(summary);
  }

  private async reload(summary?: HTMLElement): Promise<void> {
    const today = dateKey(new Date());
    const completedTaskIds =
      await this.shell.options.services.checkin.getCompletedTaskIds(today);
    this.nodes = (await this.shell.options.services.goals.load()).map((node) =>
      node.kind === "task"
        ? {
            ...node,
            done: completedTaskIds.has(node.id),
          }
        : node,
    );
    const tasks = this.nodes.filter((node) => node.kind === "task" && !node.archived);
    const completed = tasks.filter((node) => node.done).length;
    summary?.setText(`今天完成 ${completed} / ${tasks.length} 项 · 点击节点管理归属`);
    this.renderTree();
  }

  private renderTree(): void {
    if (!this.treeHost) return;
    this.treeHost.empty();
    const roots = this.nodes.filter((node) => node.parentId === null && !node.archived);
    if (!roots.length) {
      this.treeHost.createDiv({ cls: "zss-empty", text: "还没有目标。先新建一个方向或目标。" });
      return;
    }
    roots.forEach((node) => this.renderNode(node, 0));
  }

  private renderNode(node: GoalNode, depth: number): void {
    if (!this.treeHost) return;
    const children = this.nodes.filter((child) => child.parentId === node.id && !child.archived);
    const progress = calculateGoalProgress(this.nodes, node.id);
    const wrapper = this.treeHost.createDiv({ cls: "zss-goal-node" });
    wrapper.dataset.depth = String(depth);
    const row = wrapper.createDiv({ cls: "zss-goal-row" });

    const toggle = row.createEl("button", {
      cls: "zss-goal-toggle",
      attr: {
        type: "button",
        "aria-label": node.kind === "task"
          ? node.done
            ? "取消完成"
            : "标记完成"
          : this.collapsed.has(node.id)
            ? "展开下级"
            : "收起下级",
      },
    });
    if (node.kind === "task") {
      toggle.setText(node.done ? "✓" : "");
      toggle.toggleClass("is-task", true);
      toggle.toggleClass("is-done", node.done);
      toggle.addEventListener("click", () => void this.toggleTask(node));
    } else {
      toggle.setText(children.length ? (this.collapsed.has(node.id) ? "›" : "⌄") : "•");
      toggle.disabled = !children.length;
      toggle.addEventListener("click", () => {
        if (this.collapsed.has(node.id)) this.collapsed.delete(node.id);
        else this.collapsed.add(node.id);
        this.renderTree();
      });
    }

    const main = row.createEl("button", {
      cls: "zss-goal-main",
      attr: { type: "button", "aria-label": `编辑 ${node.title}` },
    });
    main.createEl("strong", { text: node.title });
    const meta = main.createSpan({ cls: "zss-goal-meta" });
    meta.createSpan({ text: KIND_LABELS[node.kind], cls: "zss-goal-kind" });
    meta.createSpan({ text: this.pathFor(node) });
    main.addEventListener("click", () => this.openForm(node.parentId, node, "edit"));

    const progressEl = row.createDiv({ cls: "zss-goal-progress" });
    progressEl.createSpan({
      text: node.kind === "task" ? (node.done ? "完成" : "待打卡") : `${progress.percent}%`,
    });
    const track = progressEl.createSpan({ cls: "zss-goal-progress-track" });
    const fill = track.createSpan();
    fill.style.setProperty("--zss-progress", `${progress.percent}%`);

    const more = row.createEl("button", {
      cls: "zss-goal-more",
      attr: { type: "button", "aria-label": "管理目标" },
    });
    setIcon(more, "ellipsis-vertical");
    const menu = row.createDiv({ cls: "zss-goal-menu" });
    menu.hidden = true;
    more.addEventListener("click", () => {
      menu.hidden = !menu.hidden;
    });
    this.addMenuAction(menu, "添加下级", () => this.openForm(node.id, null, "create"));
    this.addMenuAction(menu, "编辑节点", () => this.openForm(node.parentId, node, "edit"));
    this.addMenuAction(menu, "更改归属", () => this.openForm(node.parentId, node, "move"));
    this.addMenuAction(menu, "归档节点", () => void this.archive(node));

    if (children.length && !this.collapsed.has(node.id)) {
      const childHost = wrapper.createDiv({ cls: "zss-goal-children" });
      const previousHost = this.treeHost;
      this.treeHost = childHost;
      children.forEach((child) => this.renderNode(child, depth + 1));
      this.treeHost = previousHost;
    }
  }

  private addMenuAction(menu: HTMLElement, label: string, action: () => void): void {
    const button = menu.createEl("button", {
      text: label,
      attr: { type: "button" },
    });
    button.addEventListener("click", () => {
      menu.hidden = true;
      action();
    });
  }

  private openForm(
    parentId: string | null,
    node: GoalNode | null,
    mode: "create" | "edit" | "move",
  ): void {
    if (!this.treeHost) return;
    this.treeHost.querySelector(".zss-goal-form")?.remove();
    const form = this.treeHost.createEl("form", { cls: "zss-goal-form" });
    const title = form.createEl("strong", {
      text:
        mode === "create"
          ? parentId
            ? "添加下级"
            : "新建顶层目标"
          : mode === "move"
            ? "更改归属"
            : "编辑目标节点",
    });
    title.addClass("zss-form-title");

    const titleInput = form.createEl("input", {
      attr: { type: "text", placeholder: "目标标题", "aria-label": "目标标题" },
    });
    titleInput.value = node?.title ?? "";

    const kind = form.createEl("select", { attr: { "aria-label": "节点类型" } });
    Object.entries(KIND_LABELS).forEach(([value, label]) => {
      kind.createEl("option", { value, text: label });
    });
    kind.value = node?.kind ?? (parentId ? "task" : "objective");

    const parent = form.createEl("select", { attr: { "aria-label": "归属到" } });
    parent.createEl("option", { value: "", text: "顶层" });
    this.nodes
      .filter((candidate) => candidate.kind !== "task" && !candidate.archived)
      .forEach((candidate) => {
        parent.createEl("option", {
          value: candidate.id,
          text: this.pathFor(candidate),
        });
      });
    parent.value = parentId ?? "";

    const actions = form.createDiv({ cls: "zss-form-actions" });
    const cancel = actions.createEl("button", {
      text: "取消",
      attr: { type: "button" },
    });
    cancel.addEventListener("click", () => form.remove());
    const save = actions.createEl("button", {
      cls: "zss-primary-button",
      text: mode === "create" ? "保存到目标树" : "保存修改",
      attr: { type: "submit" },
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const titleValue = titleInput.value.trim();
      if (!titleValue) {
        new Notice("目标标题不能为空。");
        titleInput.focus();
        return;
      }
      void this.saveForm({
        mode,
        node,
        title: titleValue,
        kind: kind.value as GoalKind,
        parentId: parent.value || null,
        form,
      });
    });
    save.focus();
  }

  private async saveForm(input: {
    mode: "create" | "edit" | "move";
    node: GoalNode | null;
    title: string;
    kind: GoalKind;
    parentId: string | null;
    form: HTMLFormElement;
  }): Promise<void> {
    try {
      if (input.mode === "create") {
        await this.shell.options.services.goals.create(input.parentId, {
          title: input.title,
          kind: input.kind,
          schedule: input.kind === "task" ? "one-off" : "custom",
        });
      } else if (input.node) {
        await this.shell.options.services.goals.update(input.node.id, {
          title: input.title,
          kind: input.kind,
        });
        if (input.parentId !== input.node.parentId) {
          await this.shell.options.services.goals.move(input.node.id, input.parentId);
        }
      }
      input.form.remove();
      await this.reload();
      new Notice("目标树已保存。");
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "保存目标失败。");
    }
  }

  private async toggleTask(node: GoalNode): Promise<void> {
    try {
      await this.shell.options.services.checkin.setTaskDone(
        dateKey(new Date()),
        node,
        !node.done,
      );
      await this.reload();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "更新打卡失败。");
    }
  }

  private async archive(node: GoalNode): Promise<void> {
    await this.shell.options.services.goals.archive(node.id);
    await this.reload();
    new Notice(`已归档：${node.title}`);
  }

  private pathFor(node: GoalNode): string {
    const names = [node.title];
    let cursor = node;
    while (cursor.parentId) {
      const parent = this.nodes.find((candidate) => candidate.id === cursor.parentId);
      if (!parent) break;
      names.unshift(parent.title);
      cursor = parent;
    }
    return names.join(" / ");
  }
}
