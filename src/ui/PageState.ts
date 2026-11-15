export type AppPage = "journal" | "content" | "checkin" | "search";

export interface PageState {
  getPage(): AppPage;
  setPage(page: AppPage): void;
  subscribe(listener: (page: AppPage) => void): () => void;
}

export function createPageState(initial: AppPage = "journal"): PageState {
  let current = initial;
  const listeners = new Set<(page: AppPage) => void>();

  return {
    getPage: () => current,
    setPage(page) {
      if (page === current) return;
      current = page;
      listeners.forEach((listener) => listener(current));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
