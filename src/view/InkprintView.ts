import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_INKPRINT } from "../constants";
import { setLanguage } from "../i18n";
import type { SettingsStore } from "../services/SettingsStore";
import { CheckboxService } from "../services/CheckboxService";
import { DailyNoteService } from "../services/DailyNoteService";
import { LongformService } from "../services/LongformService";
import { RelationIndex } from "../services/RelationIndex";
import { StatsService } from "../services/StatsService";
import { FutureTaskService } from "../services/FutureTaskService";
import { VaultFolderService } from "../services/VaultFolderService";
import { AppShell } from "../ui/AppShell";
import { JournalPage } from "../ui/JournalPage";
import { SearchPage } from "../ui/SearchPage";
import { StatsPage } from "../ui/StatsPage";
import { TagPage } from "../ui/TagPage";
import { TaskPage } from "../ui/TaskPage";
import { VaultPage } from "../ui/VaultPage";

export { VIEW_TYPE_INKPRINT } from "../constants";

export class InkprintView extends ItemView {
  private shell: AppShell | null = null;
  private journal: JournalPage | null = null;

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
    return "inkprint";
  }

  async onOpen(): Promise<void> {
    this.journal?.dispose();
    this.journal = null;
    this.shell?.dispose();
    this.shell = null;
    this.contentEl.empty();
    const settings = await this.settingsStore.load();
    setLanguage(settings.language);
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
        futureTasks: new FutureTaskService(this.app.vault, settings),
        folders: new VaultFolderService(this.app),
        longform: new LongformService(this.app.vault, {
          longformFolder: settings.longformFolder,
        }),
      },
    });
    const journal = new JournalPage(this.shell, settings);
    this.journal = journal;
    const search = new SearchPage(this.shell);
    const stats = new StatsPage(this.shell);
    const tags = new TagPage(this.shell);
    const tasks = new TaskPage(this.shell);
    const vault = new VaultPage(this.shell);
    this.shell.registerPage("journal", (container) => journal.render(container));
    this.shell.registerPage("search", (container) => search.render(container));
    this.shell.registerPage("stats", (container) => stats.render(container));
    this.shell.registerPage("tags", (container) => tags.render(container));
    this.shell.registerPage("tasks", (container) => tasks.render(container));
    this.shell.registerPage("vault", (container) => vault.render(container));
    this.shell.mount();
  }

  async onClose(): Promise<void> {
    this.journal?.dispose();
    this.journal = null;
    this.shell?.dispose();
    this.shell = null;
  }

  async refresh(): Promise<void> {
    await this.onOpen();
  }
}
