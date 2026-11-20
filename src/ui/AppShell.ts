import { normalizePath, setIcon, type App, type Vault } from "obsidian";
import { parseDailyEntries } from "../domain/dailyEntry";
import type { InkprintSettings } from "../settings/defaults";
import type { CheckboxService } from "../services/CheckboxService";
import type { DailyNoteService } from "../services/DailyNoteService";
import type { LongformService } from "../services/LongformService";
import type { RelationIndex } from "../services/RelationIndex";
import type { StatsService } from "../services/StatsService";
import type { TimeBuoyService } from "../services/TimeBuoyService";
import type { VaultFolderService } from "../services/VaultFolderService";
import { createPageState, type AppPage } from "./PageState";

export interface AppShellServices {
  daily: DailyNoteService;
  checkboxes: CheckboxService;
  longform: LongformService;
  stats: StatsService;
  relations: RelationIndex;
  timeBuoys: TimeBuoyService;
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

const PAGES: Array<{ id: AppPage; label: string; icon: string }> = [
  { id: "journal", label: "日记", icon: "notebook-pen" },
  { id: "content", label: "内容", icon: "library-big" },
  { id: "tags", label: "标签", icon: "tags" },
  { id: "stats", label: "资料库", icon: "database" },
  { id: "search", label: "搜索", icon: "search" },
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
      attr: { type: "button", "aria-label": "打开 Inkprint 菜单" },
    });
    setIcon(menuButton, "panel-left-open");
    menuButton.addEventListener("click", () => this.setDrawerOpen(true));

    const title = header.createDiv({ cls: "zss-mobile-header-title" });
    title.createEl("strong", { text: "Inkprint" });
    title.createSpan({ text: "AI writes its own. I write mine." });

    const body = root.createDiv({ cls: "zss-body" });
    const sidebar = body.createEl("aside", { cls: "zss-sidebar" });
    this.renderBrand(sidebar);
    const stats = sidebar.createDiv({ cls: "zss-sidebar-stats" });
    void this.populateSidebarStats(stats);
    this.renderNavigation(sidebar);
    const tagIndex = sidebar.createDiv({ cls: "zss-sidebar-tags" });
    void this.populateSidebarTags(tagIndex);
    const pageHost = body.createEl("main", { cls: "zss-page-host" });

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
      attr: { "aria-hidden": "true", "aria-label": "Inkprint 菜单" },
    });
    this.renderBrand(this.drawer);
    this.renderNavigation(this.drawer);

    const bottom = root.createEl("nav", {
      cls: "zss-bottom-bar",
      attr: { "aria-label": "快捷入口" },
    });
    for (const page of PAGES.slice(0, 3)) {
      const button = bottom.createEl("button", {
        cls: "zss-bottom-action",
        attr: { type: "button", "aria-label": page.label },
      });
      const icon = button.createSpan();
      setIcon(icon, page.icon);
      button.createSpan({ text: page.label });
      button.addEventListener("click", () => {
        this.setPage(page.id);
        this.setDrawerOpen(false);
      });
    }
    const todayButton = bottom.createEl("button", {
      cls: "zss-today-fab",
      attr: { type: "button", "aria-label": "回到今天并开始记录" },
    });
    setIcon(todayButton, "plus");
    todayButton.addEventListener("click", () => this.focusTodayComposer());

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
    window.setTimeout(() => {
      const input = this.root?.querySelector<HTMLTextAreaElement>(
        "[data-zss-today-composer] textarea",
      );
      input?.scrollIntoView({ block: "center", behavior: "smooth" });
      input?.focus();
    }, 0);
  }

  openDate(dateKey: string): void {
    this.setPage("journal");
    this.dateHandler?.(dateKey);
  }

  openTag(tag: string): void {
    this.setPage("tags");
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

  invalidatePage(page: AppPage): void {
    this.rendered.delete(page);
    if (this.state.getPage() === page) void this.showPage(page);
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

    if (this.rendered.has(page)) return;
    const container = this.pageContainers.get(page);
    const renderer = this.pageRenderers.get(page);
    if (!container || !renderer) {
      if (container) container.createDiv({ cls: "zss-empty", text: "正在整理这一页……" });
      return;
    }
    container.empty();
    try {
      await renderer(container, this);
      this.rendered.add(page);
    } catch (error) {
      container.createDiv({
        cls: "zss-error",
        text: error instanceof Error ? error.message : "页面加载失败。",
      });
    }
  }

  private renderBrand(container: HTMLElement): void {
    const brand = container.createDiv({ cls: "zss-brand" });
    brand.createEl("strong", { text: "Inkprint" });
    brand.createSpan({ text: "AI writes its own. I write mine." });
  }

  private async populateSidebarStats(container: HTMLElement): Promise<void> {
    const stat = (label: string) => {
      const item = container.createDiv({ cls: "zss-sidebar-stat" });
      const value = item.createEl("strong", { text: "—" });
      item.createSpan({ text: label });
      return value;
    };
    const noteValue = stat("笔记");
    const dayValue = stat("记录天数");
    const tagValue = stat("标签");

    const folder = normalizePath(this.options.settings.dailyFolder);
    const files = this.options.vault
      .getFiles()
      .filter((file) => file.extension === "md" && file.path.startsWith(`${folder}/`));
    const tags = new Set<string>();
    let noteCount = 0;

    for (const file of files) {
      const entries = parseDailyEntries(await this.options.vault.cachedRead(file));
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
    if (!tags.length) return;
    container.createDiv({ cls: "zss-sidebar-section-label", text: "常用标签" });
    tags.forEach((tag) => {
      const button = container.createEl("button", {
        cls: "zss-sidebar-tag",
        attr: { type: "button" },
      });
      button.createSpan({ text: `#${tag.name}` });
      button.createSpan({ text: String(tag.count) });
      button.addEventListener("click", () => this.openTag(tag.name));
    });
  }

  private renderNavigation(container: HTMLElement): void {
    const nav = container.createEl("nav", {
      cls: "zss-nav",
      attr: { "aria-label": "主导航" },
    });
    for (const page of PAGES) {
      const button = nav.createEl("button", {
        cls: "zss-nav-item",
        attr: { type: "button", "data-zss-nav": page.id },
      });
      const icon = button.createSpan();
      setIcon(icon, page.icon);
      button.createSpan({ text: page.label });
      button.addEventListener("click", () => {
        this.setPage(page.id);
        this.setDrawerOpen(false);
      });
    }
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
