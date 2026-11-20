export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
}

export function getLanguage(): string {
  return "zh-CN";
}

export const Platform = {
  isMobile: false,
  isDesktop: true,
};

export class TFile {
  path = "";
  basename = "";
  extension = "md";
}

export class TFolder {
  path = "";
}

export function setIcon(): void {}

export class Notice {
  constructor(readonly message: string) {}
}

export class MenuItem {
  title = "";
  icon = "";
  callback: (() => void) | null = null;

  setTitle(title: string): this {
    this.title = title;
    return this;
  }

  setIcon(icon: string): this {
    this.icon = icon;
    return this;
  }

  onClick(callback: () => void): this {
    this.callback = callback;
    return this;
  }
}

export class Menu {
  readonly items: MenuItem[] = [];
  shownAt: MouseEvent | null = null;

  addItem(configure: (item: MenuItem) => void): this {
    const item = new MenuItem();
    configure(item);
    this.items.push(item);
    return this;
  }

  showAtMouseEvent(event: MouseEvent): void {
    this.shownAt = event;
  }
}

interface CreateElementOptions {
  cls?: string;
  text?: string;
  attr?: Record<string, string | number | boolean | null | undefined>;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  this: HTMLElement,
  tag: K,
  options?: CreateElementOptions,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options?.cls) element.className = options.cls;
  if (options?.text) element.textContent = options.text;
  Object.entries(options?.attr ?? {}).forEach(([name, value]) => {
    if (value !== null && value !== undefined) element.setAttribute(name, String(value));
  });
  this.appendChild(element);
  return element;
}

Object.assign(HTMLElement.prototype, {
  createEl: createElement,
  createDiv(options?: CreateElementOptions) {
    return createElement.call(this, "div", options);
  },
  createSpan(options?: CreateElementOptions) {
    return createElement.call(this, "span", options);
  },
  empty(this: HTMLElement) {
    this.replaceChildren();
  },
  addClass(this: HTMLElement, ...classes: string[]) {
    this.classList.add(...classes);
  },
  setText(this: HTMLElement, text: string) {
    this.textContent = text;
  },
});

Object.defineProperty(Range.prototype, "getClientRects", {
  configurable: true,
  value: () => [],
});
