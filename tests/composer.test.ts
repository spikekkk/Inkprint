import { describe, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import { Composer } from "../src/ui/Composer";

describe("Composer", () => {
  it("keeps task creation in the composer without the legacy checkbox importer", () => {
    const host = document.createElement("div");
    new Composer(host, {
      tags: ["此刻的心情"],
      onSave: vi.fn(),
      onUpdate: vi.fn(),
      onOpenRelations: vi.fn(),
      onOpenFutureTask: vi.fn(),
      onCreateLongform: vi.fn(),
      onInsertImage: vi.fn(),
    });

    const labels = Array.from(
      host.querySelectorAll<HTMLButtonElement>(".zss-tool-button"),
    )
      .filter((button) => !button.hidden)
      .map((button) => button.getAttribute("aria-label"));
    expect(labels).toEqual([
      "标签",
      "关联",
      "图片",
      "未来待办",
      "创建长文",
    ]);
  });

  it("inserts a task checkbox directly into the current composer", async () => {
    const host = document.createElement("div");
    const composer = new Composer(host, {
      tags: ["此刻的心情"],
      onSave: vi.fn(),
      onUpdate: vi.fn(),
      onOpenRelations: vi.fn(),
      onOpenFutureTask: vi.fn(),
      onCreateLongform: vi.fn(),
      onInsertImage: vi.fn(),
    });

    composer.insertTask();
    const editor = EditorView.findFromDOM(host.querySelector<HTMLElement>(".cm-editor")!);
    expect(editor?.state.doc.toString()).toBe("- [ ] ");

    const checkbox = host.querySelector<HTMLInputElement>(".zss-cm-task-checkbox");
    expect(checkbox).not.toBeNull();
    checkbox?.click();
    expect(editor?.state.doc.toString()).toBe("- [x] ");
  });

  it("keeps the primary save action disabled until there is content", () => {
    const host = document.createElement("div");
    const composer = new Composer(host, {
      tags: ["此刻的心情"],
      onSave: vi.fn(),
      onUpdate: vi.fn(),
      onOpenRelations: vi.fn(),
      onOpenFutureTask: vi.fn(),
      onCreateLongform: vi.fn(),
      onInsertImage: vi.fn(),
    });
    const save = host.querySelector<HTMLButtonElement>('[aria-label="收进今天"]');
    expect(save?.disabled).toBe(true);

    composer.insertText("今天值得记住");
    expect(save?.disabled).toBe(false);
  });

  it("renders image embeds as removable composer thumbnails", () => {
    const host = document.createElement("div");
    const composer = new Composer(host, {
      tags: [],
      onSave: vi.fn(),
      onUpdate: vi.fn(),
      onOpenRelations: vi.fn(),
      onOpenFutureTask: vi.fn(),
      onCreateLongform: vi.fn(),
      onInsertImage: vi.fn(),
      resolveImage: (path) => `app://vault/${path}`,
    });

    composer.insertText("![[Attachments/dusk.png]]");
    const preview = host.querySelector<HTMLElement>(".zss-cm-image");
    expect(preview).not.toBeNull();
    expect(preview?.querySelector("img")?.getAttribute("src")).toBe(
      "app://vault/Attachments/dusk.png",
    );

    preview?.querySelector<HTMLButtonElement>('[aria-label="移除图片"]')?.click();
    const editor = EditorView.findFromDOM(host.querySelector<HTMLElement>(".cm-editor")!);
    expect(editor?.state.doc.toString()).toBe("");
  });

  it("uses Enter to save while Shift+Enter remains available for new lines", async () => {
    const host = document.createElement("div");
    const onSave = vi.fn(async () => undefined);
    const composer = new Composer(host, {
      tags: [],
      onSave,
      onUpdate: vi.fn(),
      onOpenRelations: vi.fn(),
      onOpenFutureTask: vi.fn(),
      onCreateLongform: vi.fn(),
      onInsertImage: vi.fn(),
    });
    composer.insertText("回车发送");
    const input = host.querySelector<HTMLElement>(".cm-content")!;

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true }),
    );
    expect(onSave).not.toHaveBeenCalled();

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith("回车发送"));
  });

  it("switches to update mode when editing an existing entry", async () => {
    const host = document.createElement("div");
    const onUpdate = vi.fn(async () => undefined);
    const composer = new Composer(host, {
      tags: [],
      onSave: vi.fn(),
      onUpdate,
      onOpenRelations: vi.fn(),
      onOpenFutureTask: vi.fn(),
      onCreateLongform: vi.fn(),
      onInsertImage: vi.fn(),
    });
    composer.beginEdit("entry-old", "原来的记录");
    const save = host.querySelector<HTMLButtonElement>('[aria-label="保存修改"]');
    expect(save?.disabled).toBe(false);
    expect(host.querySelector('[aria-label="取消编辑"]')).not.toBeNull();

    host.querySelector<HTMLElement>(".cm-content")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    await vi.waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith("entry-old", "原来的记录"),
    );
  });
});
