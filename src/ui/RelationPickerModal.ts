import { Modal, type App } from "obsidian";
import { t } from "../i18n";

export interface RelationCandidate {
  title: string;
  meta: string;
  excerpt: string;
  link: string;
  searchable: string;
}

export class RelationPickerModal extends Modal {
  constructor(
    app: App,
    private readonly candidates: readonly RelationCandidate[],
    private readonly onSelect: (link: string) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("inkprint-relation-picker-modal");
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: t("relationPicker.title") });
    this.contentEl.createEl("p", {
      cls: "zss-picker-intro",
      text: t("relationPicker.desc"),
    });
    const field = this.contentEl.createEl("label", { cls: "zss-search-field" });
    const input = field.createEl("input", {
      attr: {
        type: "search",
        placeholder: t("relationPicker.search"),
        "aria-label": t("relationPicker.search"),
      },
    });
    const results = this.contentEl.createDiv({ cls: "zss-relation-picker-results" });

    const draw = () => {
      results.empty();
      const query = input.value.trim().toLocaleLowerCase("zh-CN");
      const matches = this.candidates
        .filter((candidate) => !query || candidate.searchable.includes(query))
        .slice(0, 80);
      if (!matches.length) {
        results.createDiv({ cls: "zss-empty", text: t("relationPicker.empty") });
        return;
      }
      matches.forEach((candidate) => {
        const button = results.createEl("button", {
          cls: "zss-relation-picker-item",
          attr: { type: "button" },
        });
        const copy = button.createDiv();
        copy.createEl("strong", { text: candidate.title });
        copy.createEl("small", { text: candidate.meta });
        if (candidate.excerpt) {
          button.createEl("p", { text: candidate.excerpt });
        }
        button.addEventListener("click", () => {
          this.onSelect(candidate.link);
          this.close();
        });
      });
    };
    input.addEventListener("input", draw);
    draw();
    window.setTimeout(() => input.focus(), 0);
  }
}
