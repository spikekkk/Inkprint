export function buildTaskText(task: string, date: string): string {
  const content = task.trim();
  const dueDate = date.trim();
  return dueDate ? `${content} @${dueDate}` : content;
}
