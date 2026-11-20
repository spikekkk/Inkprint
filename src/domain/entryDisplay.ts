export function stripEntryTags(body: string, tags: readonly string[]): string {
  let result = body;
  for (const tag of new Set(tags)) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`#${escaped}(?=\\s|$)`, "g"), "");
  }
  return result
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function extractEntryImageTargets(body: string): string[] {
  const targets = new Set<string>();
  for (const match of body.matchAll(
    /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]/g,
  )) {
    const target = match[1]?.trim();
    if (target) targets.add(target);
  }
  for (const match of body.matchAll(
    /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
  )) {
    const target = match[1]?.trim().replace(/^<|>$/g, "");
    if (target) targets.add(target);
  }
  return [...targets];
}
