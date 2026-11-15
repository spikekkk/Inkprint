import { setIcon, type App, type Vault } from "obsidian";
import type { ZhenshangshuSettings } from "../settings/defaults";
import type { DailyNoteService } from "../services/DailyNoteService";
import type { GoalService } from "../services/GoalService";
import type { LongformService } from "../services/LongformService";
import { createPageState, type AppPage } from "./PageState";

export interface AppShellServices {
  daily: DailyNoteService;
  goals: GoalService;
  longform: LongformService;
}

export interface AppShellOptions {
  app: App;
  vault: Vault;
  container: HTMLElement;
  settings: ZhenshangshuSettings;
  services: AppShellServices;
}

type PageRenderer = (container: HTMLElement, shell: AppShell) => void | Promise<void>;

const PAGES: Array<{ id: AppPage; label: string; icon: string }> = [
  { id: "journal", label: "日记", icon: "notebook-pen" },
  { id: "content", label: "内容", icon: "library-big" },
  { id: "checkin", label: "打卡", icon: "list-checks" },
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

  constructor(readonly options: AppShellOptions) {}

  mount(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.rendered.clear();
    this.pageContainers.clear();
    this.options.container.empty();
    const { container } = this.options;
    container.addClass("zhenshangshu-view");

    const root = container.createDiv({ cls: "zss-app" });
    this.root = root;
    const header = root.createEl("header", { cls: "zss-mobile-header" });
    const menuButton = header.createEl("button", {
      cls: "zss-icon-button",
      attr: { type: "button", "aria-label": "打开枕上书菜单" },
    });
    setIcon(menuButton, "panel-left-open");
    menuButton.addEventListener("click", () => this.setDrawerOpen(true));

    const title = header.createDiv({ cls: "zss-mobile-header-title" });
    title.createEl("strong", { text: "枕上书" });
    title.createSpan({ text: "把今天留在这里" });

    const body = root.createDiv({ cls: "zss-body" });
    const sidebar = body.createEl("aside", { cls: "zss-sidebar" });
    this.renderBrand(sidebar);
    this.renderNavigation(sidebar);
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
      attr: { "aria-hidden": "true", "aria-label": "枕上书菜单" },
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
  }

  setTodayHandler(handler: () => void): void {
    this.todayHandler = handler;
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
    brand.createEl("strong", { text: "枕上书" });
    brand.createSpan({ text: "把今天留在这里" });
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
