import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_INKPRINT } from "../constants";
import type { SettingsStore } from "../services/SettingsStore";
import { CheckboxService } from "../services/CheckboxService";
import { DailyNoteService } from "../services/DailyNoteService";
import { LongformService } from "../services/LongformService";
import { RelationIndex } from "../services/RelationIndex";
import { StatsService } from "../services/StatsService";
import { TimeBuoyService } from "../services/TimeBuoyService";
import { AppShell } from "../ui/AppShell";
import { ContentPage } from "../ui/ContentPage";
import { JournalPage } from "../ui/JournalPage";
import { SearchPage } from "../ui/SearchPage";
import { StatsPage } from "../ui/StatsPage";

export { VIEW_TYPE_INKPRINT } from "../constants";

export class InkprintView extends ItemView {
  private shell: AppShell | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly settingsStore: SettingsStore,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_INKPRINT;
  }

  getDisplayText(): string {
    return "Inkprint";
  }

  getIcon(): string {
    return "notebook-pen";
  }

  async onOpen(): Promise<void> {
    this.shell?.dispose();
    this.shell = null;
    this.contentEl.empty();
    const settings = await this.settingsStore.load();
    const daily = new DailyNoteService(this.app.vault, settings);
    this.shell = new AppShell({
      app: this.app,
      vault: this.app.vault,
      container: this.contentEl,
      settings,
      services: {
        daily,
        checkboxes: new CheckboxService(this.app.vault, settings),
        stats: new StatsService(this.app.vault, settings),
        relations: new RelationIndex([]),
        timeBuoys: new TimeBuoyService(this.app.vault, settings),
        longform: new LongformService(this.app.vault, {
          longformFolder: settings.longformFolder,
        }),
      },
    });
    const journal = new JournalPage(this.shell, settings);
    const content = new ContentPage(this.shell);
    const search = new SearchPage(this.shell);
    const stats = new StatsPage(this.shell);
    this.shell.registerPage("journal", (container) => journal.render(container));
    this.shell.registerPage("content", (container) => content.render(container));
    this.shell.registerPage("search", (container) => search.render(container));
    this.shell.registerPage("stats", (container) => stats.render(container));
    this.shell.mount();
  }

  async onClose(): Promise<void> {
    this.shell?.dispose();
    this.shell = null;
  }

  async refresh(): Promise<void> {
    await this.onOpen();
  }
}
