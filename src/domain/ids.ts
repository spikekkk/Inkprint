export function createEntryId(now: Date, suffix: string): string {
  const date = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join("");
  const time = [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("");
  return `entry-${date}-${time}-${suffix}`;
}

export function createRandomSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
