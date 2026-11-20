import { Compartment, EditorState, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  drawSelection,
  keymap,
  placeholder,
  type DecorationSet,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { scanComposerImages, type ComposerImageRange } from "./composerImages";
import { scanTaskLines, toggleTaskInDocument } from "./composerTasks";
import { t } from "../i18n";

const editable = new Compartment();
const placeholderCompartment = new Compartment();

class TaskCheckboxWidget extends WidgetType {
  constructor(
    private readonly stateFrom: number,
    private readonly checked: boolean,
  ) {
    super();
  }

  eq(other: TaskCheckboxWidget): boolean {
    return this.stateFrom === other.stateFrom && this.checked === other.checked;
  }

  toDOM(view: EditorView): HTMLElement {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-list-item-checkbox zss-cm-task-checkbox";
    checkbox.checked = this.checked;
    checkbox.setAttribute(
      "aria-label",
      this.checked ? t("composer.toggleTaskUndo") : t("composer.toggleTaskDone"),
    );
    checkbox.addEventListener("pointerdown", (event) => event.stopPropagation());
    checkbox.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const current = view.state.doc.toString();
      const next = toggleTaskInDocument(current, this.stateFrom, !this.checked);
      if (next === current) return;
      view.dispatch({
        changes: {
          from: this.stateFrom,
          to: this.stateFrom + 1,
          insert: next[this.stateFrom],
        },
        selection: view.state.selection,
      });
    });
    return checkbox;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

class ImagePreviewWidget extends WidgetType {
  constructor(
    private readonly image: ComposerImageRange,
    private readonly url: string,
  ) {
    super();
  }

  eq(other: ImagePreviewWidget): boolean {
    return (
      this.image.from === other.image.from &&
      this.image.to === other.image.to &&
      this.image.path === other.image.path &&
      this.url === other.url
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const card = document.createElement("span");
    card.className = "zss-cm-image";
    card.contentEditable = "false";
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", `${t("composer.image")}：${fileName(this.image.path)}`);

    const preview = document.createElement("img");
    preview.src = this.url;
    preview.alt = fileName(this.image.path);
    preview.loading = "lazy";
    preview.draggable = false;

    const copy = document.createElement("span");
    copy.className = "zss-cm-image-copy";
    const name = document.createElement("small");
    name.textContent = fileName(this.image.path);
    const kind = document.createElement("span");
    kind.textContent = t("composer.imageInserted");
    copy.append(name, kind);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "zss-cm-image-remove";
    remove.setAttribute("aria-label", t("composer.removeImage"));
    remove.textContent = "×";
    remove.addEventListener("pointerdown", (event) => event.stopPropagation());
    remove.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      view.dispatch({
        changes: { from: this.image.from, to: this.image.to, insert: "" },
      });
      view.focus();
    });

    card.append(preview, copy, remove);
    return card;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function fileName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function buildTaskDecorations(state: EditorState): DecorationSet {
  const ranges = scanTaskLines(state.doc.toString()).map((task) => [
    Decoration.line({
      attributes: {
        class: `zss-cm-task-line${task.checked ? " is-checked" : ""}`,
      },
    }).range(state.doc.lineAt(task.markerFrom).from),
    Decoration.replace({
      widget: new TaskCheckboxWidget(task.stateFrom, task.checked),
    }).range(task.markerFrom, task.markerTo),
  ]).flat();
  return Decoration.set(ranges, true);
}

const taskDecorations = StateField.define<DecorationSet>({
  create: buildTaskDecorations,
  update: (decorations, transaction) =>
    transaction.docChanged ? buildTaskDecorations(transaction.state) : decorations,
  provide: (field) => EditorView.decorations.from(field),
});

function imageDecorations(
  resolveImage: (path: string) => string | null,
): StateField<DecorationSet> {
  const build = (state: EditorState): DecorationSet =>
    Decoration.set(
      scanComposerImages(state.doc.toString()).flatMap((image) => {
        const url = resolveImage(image.path);
        return url
          ? [
              Decoration.replace({
                widget: new ImagePreviewWidget(image, url),
              }).range(image.from, image.to),
            ]
          : [];
      }),
      true,
    );

  return StateField.define<DecorationSet>({
    create: build,
    update: (decorations, transaction) =>
      transaction.docChanged ? build(transaction.state) : decorations,
    provide: (field) => EditorView.decorations.from(field),
  });
}

export class ComposerEditor {
  readonly view: EditorView;

  constructor(
    parent: HTMLElement,
    private readonly label: string,
    private readonly hint: string,
    private readonly onChange?: (value: string) => void,
    private readonly resolveImage: (path: string) => string | null = () => null,
  ) {
    this.view = new EditorView({
      parent,
      state: this.createState(""),
    });
  }

  get value(): string {
    return this.view.state.doc.toString();
  }

  get selectionStart(): number {
    return this.view.state.selection.main.from;
  }

  get selectionEnd(): number {
    return this.view.state.selection.main.to;
  }

  focus(): void {
    this.view.focus();
  }

  insertText(text: string): void {
    const selection = this.view.state.selection.main;
    this.view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: text },
      selection: { anchor: selection.from + text.length },
    });
    this.view.focus();
  }

  reset(value = ""): void {
    this.view.setState(this.createState(value));
    this.view.focus();
  }

  setEditable(value: boolean): void {
    this.view.dispatch({
      effects: editable.reconfigure([
        EditorView.editable.of(value),
        EditorState.readOnly.of(!value),
      ]),
    });
  }

  setPlaceholder(value: string): void {
    this.view.dispatch({
      effects: placeholderCompartment.reconfigure(placeholder(value)),
    });
  }

  destroy(): void {
    this.view.destroy();
  }

  private createState(value: string): EditorState {
    return EditorState.create({
      doc: value,
      selection: { anchor: value.length },
      extensions: [
        history(),
        editable.of([
          EditorView.editable.of(true),
          EditorState.readOnly.of(false),
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) this.onChange?.(update.state.doc.toString());
        }),
        EditorView.lineWrapping,
        EditorView.editorAttributes.of({ class: "zss-cm-editor" }),
        EditorView.contentAttributes.of({
          role: "textbox",
          "aria-label": this.label,
          "aria-multiline": "true",
          placeholder: this.hint,
          spellcheck: "true",
          autocorrect: "on",
          autocapitalize: "sentences",
        }),
        drawSelection(),
        keymap.of([...historyKeymap, ...defaultKeymap]),
        placeholderCompartment.of(placeholder(this.hint)),
        taskDecorations,
        imageDecorations(this.resolveImage),
      ],
    });
  }
}
