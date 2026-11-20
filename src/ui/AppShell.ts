import { normalizePath, setIcon, type App, type Vault } from "obsidian";
import { parseDailyEntries } from "../domain/dailyEntry";
import type { InkprintSettings } from "../settings/defaults";
import { t, type TranslationKey } from "../i18n";
import type { CheckboxService } from "../services/CheckboxService";
import type { DailyNoteService } from "../services/DailyNoteService";
import type { LongformService } from "../services/LongformService";
import type { RelationIndex } from "../services/RelationIndex";
import type { StatsService } from "../services/StatsService";
import type { FutureTaskService } from "../services/FutureTaskService";
import type { VaultFolderService } from "../services/VaultFolderService";
import { createPageState, type AppPage } from "./PageState";
import { TrashModal } from "./TrashModal";

export interface AppShellServices {
  daily: DailyNoteService;
  checkboxes: CheckboxService;
  longform: LongformService;
  stats: StatsService;
  relations: RelationIndex;
  futureTasks: FutureTaskService;
  folders: VaultFolderService;
}

export interface AppShellOptions {
  app: App;
  vault: Vault;
  container: HTMLElement;
  settings: InkprintSettings;
  services: AppShellServices;
}

type PageRenderer = (container: HTMLElement, shell: AppShell) => void | Promise<void>;

const PAGES: Array<{ id: AppPage; labelKey: TranslationKey; icon: string }> = [
  { id: "journal", labelKey: "nav.journal", icon: "notebook-pen" },
  { id: "tags", labelKey: "nav.tags", icon: "tags" },
  { id: "tasks", labelKey: "nav.tasks", icon: "list-todo" },
  { id: "stats", labelKey: "nav.stats", icon: "chart-no-axes-column" },
  { id: "vault", labelKey: "nav.vault", icon: "folder-tree" },
  { id: "search", labelKey: "nav.search", icon: "search" },
];

export class AppShell {
  private readonly state = createPageState();
  private readonly pageRenderers = new Map<AppPage, PageRenderer>();
  private readonly rendered = new Set<AppPage>();
  private readonly pageContainers = new Map<AppPage, HTMLElement>();
  private root: HTMLElement | null = null;
  private drawer: HTMLElement | null = null;
  private drawerBackdrop: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;
  private todayHandler: (() => void) | null = null;
  private dateHandler: ((dateKey: string) => void) | null = null;
  private tagHandler: ((tag: string) => void) | null = null;
  private sidebarExpandButton: HTMLButtonElement | null = null;

  constructor(readonly options: AppShellOptions) {}

  mount(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.rendered.clear();
    this.pageContainers.clear();
    this.options.container.empty();
    const { container } = this.options;
    container.addClass("inkprint-view");

    const root = container.createDiv({ cls: "zss-app" });
    root.toggleClass("is-reduce-transparency", this.options.settings.reduceTransparency);
    this.root = root;
    const header = root.createEl("header", { cls: "zss-mobile-header" });
    const menuButton = header.createEl("button", {
      cls: "zss-icon-button",
      attr: { type: "button", "aria-label": t("sidebar.menu") },
    });
    setIcon(menuButton, "panel-left-open");
    menuButton.addEventListener("click", () => this.setDrawerOpen(true));

    const title = header.createDiv({ cls: "zss-mobile-header-title" });
    title.createEl("strong", { text: "Inkprint" });
    title.createSpan({ text: t("brand.tagline") });
    const todayButton = header.createEl("button", {
      cls: "zss-icon-button",
      attr: { type: "button", "aria-label": t("sidebar.today") },
    });
    setIcon(todayButton, "plus");
    todayButton.addEventListener("click", () => this.focusTodayComposer());

    const body = root.createDiv({ cls: "zss-body" });
    const sidebar = body.createEl("aside", { cls: "zss-sidebar" });
    this.renderBrand(sidebar, "desktop");
    const stats = sidebar.createDiv({ cls: "zss-sidebar-stats" });
    void this.populateSidebarStats(stats);
    this.renderNavigation(sidebar);
    const tagIndex = sidebar.createDiv({ cls: "zss-sidebar-tags" });
    void this.populateSidebarTags(tagIndex);
    this.renderTrashButton(sidebar);
    const pageHost = body.createEl("main", { cls: "zss-page-host" });
    this.sidebarExpandButton = root.createEl("button", {
      cls: "zss-sidebar-expand",
      attr: { type: "button", "aria-label": t("sidebar.expand") },
    });
    setIcon(this.sidebarExpandButton, "panel-left-open");
    this.sidebarExpandButton.addEventListener("click", () => this.setSidebarCollapsed(false));

    for (const page of PAGES) {
      const section = pageHost.createEl("section", {
        cls: "zss-page",
        attr: { "data-zss-page": page.id },
      });
      section.hidden = page.id !== this.state.getPage();
      this.pageContainers.set(page.id, section);
    }

    this.drawerBackdrop = root.createDiv({
      cls: "zss-drawer-backdrop",
      attr: { "aria-hidden": "true" },
    });
    this.drawerBackdrop.hidden = true;
    this.drawerBackdrop.addEventListener("click", () => this.setDrawerOpen(false));
    this.drawer = root.createEl("aside", {
      cls: "zss-mobile-drawer",
      attr: { "aria-hidden": "true", "aria-label": t("sidebar.menu") },
    });
    this.renderBrand(this.drawer, "drawer");
    this.renderNavigation(this.drawer);
    this.renderTrashButton(this.drawer);

    this.unsubscribe = this.state.subscribe((page) => void this.showPage(page));
    void this.showPage(this.state.getPage());
  }

  registerPage(page: AppPage, renderer: PageRenderer): void {
    this.pageRenderers.set(page, renderer);
    this.rendered.delete(page);
  }

  setPage(page: AppPage): void {
    this.state.setPage(page);
  }

  focusTodayComposer(): void {
    this.todayHandler?.();
    this.setPage("journal");
    this.setDrawerOpen(false);
    this.focusComposerWhenReady();
  }

  private focusComposerWhenReady(attempt = 0): void {
    window.setTimeout(() => {
      const input = this.root?.querySelector<HTMLElement>(
        "[data-zss-today-composer] .cm-content",
      );
      if (!input) {
        if (attempt < 8) this.focusComposerWhenReady(attempt + 1);
        return;
      }

      const composer = input.closest<HTMLElement>(".zss-composer");
      const page = input.closest<HTMLElement>(".zss-page");
      if (composer && page) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        page.scrollTo({
          top: Math.max(0, composer.offsetTop - 12),
          behavior: reduced ? "auto" : "smooth",
        });
      }
      input.focus({ preventScroll: true });
    }, attempt === 0 ? 0 : 40);
  }

  openDate(dateKey: string): void {
    this.setPage("journal");
    this.dateHandler?.(dateKey);
  }

  openTag(tag: string): void {
    this.setPage("tags");
    this.activateSidebarTag(tag);
    this.tagHandler?.(tag);
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.pageRenderers.clear();
    this.rendered.clear();
    this.pageContainers.clear();
    this.options.container.empty();
    this.root = null;
    this.drawer = null;
    this.drawerBackdrop = null;
    this.todayHandler = null;
    this.dateHandler = null;
    this.tagHandler = null;
    this.sidebarExpandButton = null;
  }

  setTodayHandler(handler: () => void): void {
    this.todayHandler = handler;
  }

  setDateHandler(handler: (dateKey: string) => void): void {
    this.dateHandler = handler;
  }

  setTagHandler(handler: (tag: string) => void): void {
    this.tagHandler = handler;
  }

  async invalidatePage(page: AppPage): Promise<void> {
    this.rendered.delete(page);
    if (this.state.getPage() === page) await this.showPage(page);
  }

  private async showPage(page: AppPage): Promise<void> {
    for (const [id, container] of this.pageContainers) {
      container.hidden = id !== page;
    }
    this.root?.querySelectorAll<HTMLElement>("[data-zss-nav]").forEach((button) => {
      const active = button.dataset.zssNav === page;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (page !== "tags") this.activateSidebarTag(null);

    if (this.rendered.has(page)) return;
    const container = this.pageContainers.get(page);
    const renderer = this.pageRenderers.get(page);
    if (!container || !renderer) {
      if (container) container.createDiv({ cls: "zss-empty", text: t("sidebar.loadingPage") });
      return;
    }
    container.empty();
    try {
      await renderer(container, this);
      this.rendered.add(page);
    } catch (error) {
      container.createDiv({
        cls: "zss-error",
        text: error instanceof Error ? error.message : t("sidebar.pageError"),
      });
    }
  }

  private renderBrand(container: HTMLElement, mode: "desktop" | "drawer"): void {
    const row = container.createDiv({ cls: "zss-brand-header" });
    const brand = row.createDiv({ cls: "zss-brand" });
    brand.createEl("strong", { text: "Inkprint" });
    brand.createSpan({ text: t("brand.tagline") });
    const actions = row.createDiv({ cls: "zss-brand-actions" });
    const refresh = actions.createEl("button", {
      cls: "zss-icon-button",
      attr: {
        type: "button",
        title: t("sidebar.refresh"),
        "aria-label": t("sidebar.refresh"),
      },
    });
    setIcon(refresh, "refresh-cw");
    refresh.addEventListener("click", () => void this.refreshCurrentPage(refresh));
    const close = actions.createEl("button", {
      cls: "zss-icon-button",
      attr: {
        type: "button",
        title: mode === "drawer" ? t("common.close") : t("sidebar.collapse"),
        "aria-label": mode === "drawer" ? t("common.close") : t("sidebar.collapse"),
      },
    });
    setIcon(close, mode === "drawer" ? "x" : "panel-left-close");
    close.addEventListener("click", () => {
      if (mode === "drawer") this.setDrawerOpen(false);
      else this.setSidebarCollapsed(true);
    });
  }

  private async populateSidebarStats(container: HTMLElement): Promise<void> {
    const stat = (label: string) => {
      const item = container.createDiv({ cls: "zss-sidebar-stat" });
      const value = item.createEl("strong", { text: "—" });
      item.createSpan({ text: label });
      return value;
    };
    const noteValue = stat(t("sidebar.notes"));
    const dayValue = stat(t("sidebar.days"));
    const tagValue = stat(t("sidebar.tags"));

    const folder = normalizePath(this.options.settings.dailyFolder);
    const files = this.options.vault
      .getFiles()
      .filter((file) => file.extension === "md" && file.path.startsWith(`${folder}/`));
    const tags = new Set<string>();
    let noteCount = 0;

    for (const file of files) {
      const entries = parseDailyEntries(await this.options.vault.cachedRead(file), {
        dateKey: file.basename,
        includeLegacy: this.options.settings.recognizeLegacyEntries,
      });
      noteCount += entries.length;
      entries.forEach((entry) => entry.tags.forEach((tag) => tags.add(tag)));
    }
    noteValue.setText(String(noteCount));
    dayValue.setText(String(files.length));
    tagValue.setText(String(tags.size));
  }

  private async populateSidebarTags(container: HTMLElement): Promise<void> {
    const entries = await this.options.services.stats.load();
    const tags = [
      ...entries
        .flatMap((entry) => entry.tags)
        .reduce((counts, tag) => {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
          return counts;
        }, new Map<string, number>()),
    ]
      .map(([name, count]) => ({ name, count }))
      .sort((first, second) => second.count - first.count)
      .slice(0, 7);
    if (!tags.length) {
      container.createDiv({ cls: "zss-sidebar-empty", text: t("sidebar.tagsEmpty") });
      return;
    }
    container.createDiv({ cls: "zss-sidebar-section-label", text: t("sidebar.popularTags") });
    tags.forEach((tag) => {
      const button = container.createEl("button", {
        cls: "zss-sidebar-tag",
        attr: {
          type: "button",
          "data-zss-tag": tag.name,
          "aria-label": t("sidebar.tagAria", { name: tag.name, count: tag.count }),
          "aria-pressed": "false",
        },
      });
      button.createSpan({ cls: "zss-sidebar-tag-name", text: `#${tag.name}` });
      button.createSpan({ cls: "zss-sidebar-tag-count", text: String(tag.count) });
      button.addEventListener("click", () => this.openTag(tag.name));
    });
  }

  private activateSidebarTag(tag: string | null): void {
    this.root?.querySelectorAll<HTMLElement>("[data-zss-tag]").forEach((button) => {
      const active = tag !== null && button.dataset.zssTag === tag;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  private renderNavigation(container: HTMLElement): void {
    const nav = container.createEl("nav", {
      cls: "zss-nav",
      attr: { "aria-label": t("sidebar.mainNav") },
    });
    for (const page of PAGES) {
      const button = nav.createEl("button", {
        cls: "zss-nav-item",
        attr: { type: "button", "data-zss-nav": page.id },
      });
      const icon = button.createSpan();
      setIcon(icon, page.icon);
      button.createSpan({ text: t(page.labelKey) });
      button.addEventListener("click", () => {
        this.setPage(page.id);
        this.setDrawerOpen(false);
      });
    }
  }

  private renderTrashButton(container: HTMLElement): void {
    const footer = container.createDiv({ cls: "zss-sidebar-bottom" });
    const button = footer.createEl("button", {
      cls: "zss-trash-button",
      attr: { type: "button", "aria-label": t("trash.open") },
    });
    const icon = button.createSpan();
    setIcon(icon, "trash-2");
    const copy = button.createSpan({ cls: "zss-trash-copy" });
    copy.createSpan({ text: t("sidebar.trash") });
    copy.createEl("small", { text: t("sidebar.trashManaged") });
    button.addEventListener("click", () => new TrashModal(this.options.app).open());
  }

  private async refreshCurrentPage(button: HTMLButtonElement): Promise<void> {
    if (button.classList.contains("is-loading")) return;
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
    const minimumFeedback = new Promise<void>((resolve) => window.setTimeout(resolve, 420));
    try {
      await Promise.all([this.invalidatePage(this.state.getPage()), minimumFeedback]);
    } finally {
      button.classList.remove("is-loading");
      button.removeAttribute("aria-busy");
    }
  }

  private setSidebarCollapsed(collapsed: boolean): void {
    this.root?.classList.toggle("is-sidebar-collapsed", collapsed);
    this.sidebarExpandButton?.setAttribute("aria-expanded", String(!collapsed));
    window.setTimeout(() => {
      if (collapsed) this.sidebarExpandButton?.focus();
      else this.root?.querySelector<HTMLButtonElement>("[data-zss-nav].is-active")?.focus();
    }, 190);
  }

  private setDrawerOpen(open: boolean): void {
    if (!this.drawer || !this.drawerBackdrop) return;
    this.drawer.classList.toggle("is-open", open);
    this.drawer.setAttribute("aria-hidden", String(!open));
    this.drawerBackdrop.hidden = !open;
    this.root?.classList.toggle("has-open-drawer", open);
    if (open) {
      this.drawer.querySelector<HTMLButtonElement>("button")?.focus();
    }
  }
}
