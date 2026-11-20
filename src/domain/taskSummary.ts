export interface TaskSummary {
  total: number;
  pending: number;
  completed: number;
  completionRate: number;
  dueToday: number;
  overdue: number;
  scheduled: number;
  regular: number;
}

interface TaskSummaryItem {
  checked: boolean;
  dueDate?: string;
}

export function summarizeTasks<T extends TaskSummaryItem>(
  items: readonly T[],
  today: string,
): TaskSummary {
  const pendingItems = items.filter((item) => !item.checked);
  const scheduledItems = pendingItems.filter((item) => item.dueDate);
  const completed = items.length - pendingItems.length;

  return {
    total: items.length,
    pending: pendingItems.length,
    completed,
    completionRate: items.length ? Math.round((completed / items.length) * 100) : 0,
    dueToday: pendingItems.filter((item) => item.dueDate === today).length,
    overdue: pendingItems.filter((item) => !!item.dueDate && item.dueDate < today).length,
    scheduled: scheduledItems.length,
    regular: pendingItems.length - scheduledItems.length,
  };
}
