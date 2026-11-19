# Inkprint MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an installable, mobile-first Obsidian plugin that captures Daily entries, manages a flexible OKR tree, creates longform notes, and exposes backlink context without leaving the main view.

**Architecture:** One `ItemView` owns the responsive application shell. Pure domain modules parse and serialize Markdown; Vault services perform atomic file operations; the view renders derived state and never becomes the source of truth. Daily notes remain the source for captures and completion events, `Goals/目标树.md` stores structure, and longform bodies live under `Longform/`.

**Tech Stack:** TypeScript, Obsidian Plugin API, esbuild, Vitest, jsdom, CSS variables.

**Spec:**
- `docs/superpowers/specs/2026-11-12-goal-linked-book-notes-design.md`
- `docs/superpowers/specs/2026-11-14-flexible-okr-tree-and-checkin-heatmap-design.md`
- `docs/superpowers/specs/2026-11-14-settings-information-architecture-design.md`
- `docs/superpowers/specs/2026-11-14-inkprint-obsidian-compliance-design.md`

## Global Constraints

- Plugin ID is `inkprint`; display name is `Inkprint`; author is `spikek`.
- Minimum Obsidian version is `1.13.0`; `isDesktopOnly` is `false`.
- Markdown is the durable data source; derived indexes must be rebuildable.
- Use `Vault.process()`, `processFrontMatter()`, `normalizePath()`, `registerEvent()`, and Obsidian DOM helpers.
- Do not use Node or Electron APIs, unsafe HTML APIs, remote assets, telemetry, or network requests.
- Use one shared composer; mobile `+` returns to today and focuses it without creating another composer.
- Keep longform body content out of Daily; Daily stores a stable block reference.
- Relation extraction must ignore code blocks, comments, and image-only links.
- Verify TypeScript, unit tests, production build, and manifest assets before reporting completion.

---

### Task 1: Scaffold the plugin and test harness

**Files:**
- Create: `package.json`
- Create: `manifest.json`
- Create: `versions.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/main.ts`
- Create: `src/view/InkprintView.ts`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `test`, and `typecheck`.
- Produces: plugin class `InkprintPlugin` and placeholder view type constant `VIEW_TYPE_INKPRINT`.

- [ ] **Step 1: Write the failing smoke test**

```ts
import { describe, expect, it } from "vitest";
import { VIEW_TYPE_INKPRINT } from "../src/view/InkprintView";

describe("plugin scaffold", () => {
  it("uses a stable custom view type", () => {
    expect(VIEW_TYPE_INKPRINT).toBe("inkprint-view");
  });
});
```

- [ ] **Step 2: Run the test before creating the implementation**

Run: `npm test -- tests/smoke.test.ts`

Expected: FAIL because the source module does not exist.

- [ ] **Step 3: Add the official Sample Plugin build structure**

Use esbuild with `obsidian` marked external, `format: "cjs"`, `target: "es2018"`, and output `main.js`. The Manifest must use the exact identity values in Global Constraints. The view file exports `VIEW_TYPE_INKPRINT = "inkprint-view"` and a minimal `ItemView`.

- [ ] **Step 4: Run the smoke test**

Run: `npm test -- tests/smoke.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json manifest.json versions.json tsconfig.json esbuild.config.mjs vitest.config.ts .gitignore src/main.ts src/view/InkprintView.ts tests/smoke.test.ts
git commit -m "chore: scaffold inkprint plugin"
```

### Task 2: Implement Daily entry and reference parsing

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/ids.ts`
- Create: `src/domain/dailyEntry.ts`
- Create: `src/domain/references.ts`
- Test: `tests/dailyEntry.test.ts`
- Test: `tests/references.test.ts`

**Interfaces:**
- Produces: `createEntryId(now: Date, suffix: string): string`.
- Produces: `serializeDailyEntry(input: DailyEntryInput): string`.
- Produces: `parseDailyEntries(markdown: string): DailyEntry[]`.
- Produces: `extractReferences(markdown: string): MarkdownReference[]`.
- Produces: `extractRelationTargets(markdown: string): RelationTarget[]`.

- [ ] **Step 1: Write failing tests for stable entry IDs and metadata**

```ts
const input = {
  entryId: "entry-20261115-101500-a1b2",
  createdAt: "2026-11-15T10:15:00+08:00",
  body: "今天先写下一句话。",
  tags: ["此刻的心情"],
  taskId: "organize-goals",
};
expect(serializeDailyEntry(input)).toContain("journal-meta:");
expect(serializeDailyEntry(input)).toContain("^entry-20261115-101500-a1b2");
```

- [ ] **Step 2: Write failing tests for references**

```ts
const markdown = [
  "[[Longform/为什么我想重做每日记录#^a1b2]]",
  "```md",
  "[[Ignored/Code#^dead]]",
  "```",
  "<!-- [[Ignored/Comment#^dead]] -->",
  "![[image.png]]",
].join("\n");
expect(extractRelationTargets(markdown)).toEqual([
  { path: "Longform/为什么我想重做每日记录", blockId: "a1b2" },
]);
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm test -- tests/dailyEntry.test.ts tests/references.test.ts`

Expected: FAIL because parsers are absent.

- [ ] **Step 4: Implement pure parsers with no Obsidian imports**

Use line-based reference parsing, blank out fenced code and comments before matching, reject external URLs, and accept only wiki or Markdown links with `#^block-id`.

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- tests/dailyEntry.test.ts tests/references.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain tests/dailyEntry.test.ts tests/references.test.ts
git commit -m "feat: add daily entry and reference parsing"
```

### Task 3: Implement Vault services for Daily capture and longform creation

**Files:**
- Create: `src/services/SettingsStore.ts`
- Create: `src/services/DailyNoteService.ts`
- Create: `src/services/LongformService.ts`
- Test: `tests/dailyNoteService.test.ts`
- Test: `tests/longformService.test.ts`

**Interfaces:**
- Produces: `SettingsStore.load(): Promise<InkprintSettings>`.
- Produces: `SettingsStore.save(next: InkprintSettings): Promise<void>`.
- Produces: `DailyNoteService.append(dateKey: string, input: DailyEntryInput): Promise<DailyEntry>`.
- Produces: `LongformService.create(input: LongformInput): Promise<LongformResult>`.

- [ ] **Step 1: Write a failing Daily append test with a fake Vault**

```ts
const append = vi.fn();
const create = vi.fn();
const vault = { getFileByPath: vi.fn(() => null), create, append, process: vi.fn() } as unknown as Vault;
const service = new DailyNoteService(vault, { dailyFolder: "Daily", dailyHeading: "## 记录" });
await service.append("2026-11-15", input);
expect(create).toHaveBeenCalledWith("Daily/2026-11-15.md", "## 记录\n\n");
expect(append).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("^entry-"));
```

- [ ] **Step 2: Write a failing longform test**

```ts
await service.create({
  title: "为什么我想重做每日记录",
  body: "真正有用的记录，不需要先填完一张表。",
  sourceEntryId: "entry-20261115-101500-a1b2",
  journalDay: "2026-11-15",
});
expect(create).toHaveBeenCalledWith(
  "Longform/为什么我想重做每日记录.md",
  expect.stringContaining("source-entry-id: entry-20261115-101500-a1b2"),
);
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm test -- tests/dailyNoteService.test.ts tests/longformService.test.ts`

Expected: FAIL because services are absent.

- [ ] **Step 4: Implement services using Vault APIs only**

Normalize every path. Create folders only when needed. Daily writes append an entry with a blank line separator. Longform filenames remove filesystem-invalid characters with a deterministic fallback. Do not update UI state before the Vault operation resolves.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/dailyNoteService.test.ts tests/longformService.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services tests/dailyNoteService.test.ts tests/longformService.test.ts
git commit -m "feat: add daily and longform vault services"
```

### Task 4: Implement the flexible goal tree

**Files:**
- Create: `src/domain/goalTree.ts`
- Create: `src/services/GoalService.ts`
- Test: `tests/goalTree.test.ts`
- Test: `tests/goalService.test.ts`

**Interfaces:**
- Produces: `parseGoalTree(markdown: string): GoalNode[]`.
- Produces: `serializeGoalTree(nodes: GoalNode[]): string`.
- Produces: `calculateGoalProgress(nodes: GoalNode[], id: string): GoalProgress`.
- Produces: `GoalService.create(parentId: string | null, input: GoalInput): Promise<GoalNode>`.
- Produces: `GoalService.move(id: string, parentId: string | null): Promise<void>`.
- Produces: `GoalService.archive(id: string): Promise<void>`.

- [ ] **Step 1: Write failing round-trip tests**

```ts
const source = [
  "- 内容输出 #okr/objective ^goal-content",
  "  - 全年读完 50 本 #okr/key-result [progress:: count] [target:: 50] ^goal-reading",
  "    - [ ] 读完《朝花夕拾》 #okr/task ^task-chaohua",
].join("\n");
expect(serializeGoalTree(parseGoalTree(source))).toContain("^goal-reading");
```

- [ ] **Step 2: Write failing hierarchy and progress tests**

```ts
expect(calculateGoalProgress(nodes, "goal-content")).toEqual({ completed: 0, total: 1, percent: 0 });
expect(() => validateMove(nodes, "goal-content", "goal-reading")).toThrow("cycle");
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm test -- tests/goalTree.test.ts tests/goalService.test.ts`

Expected: FAIL because goal modules are absent.

- [ ] **Step 4: Implement the nested-list parser and atomic writer**

Indentation determines parentage. Inline fields store progress mode and targets. IDs use stable block IDs. Moving a node must reject itself and descendants. Archive changes metadata without deleting history.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/goalTree.test.ts tests/goalService.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/goalTree.ts src/services/GoalService.ts tests/goalTree.test.ts tests/goalService.test.ts
git commit -m "feat: add flexible goal tree"
```

### Task 5: Build the shared application shell and responsive navigation

**Files:**
- Modify: `src/main.ts`
- Modify: `src/view/InkprintView.ts`
- Create: `src/ui/AppShell.ts`
- Create: `src/ui/PageState.ts`
- Test: `tests/pageState.test.ts`

**Interfaces:**
- Produces: `AppPage = "journal" | "content" | "checkin" | "search"`.
- Produces: `AppShell.mount(container: HTMLElement): void`.
- Produces: `AppShell.setPage(page: AppPage): void`.
- Produces: `AppShell.focusTodayComposer(): void`.

- [ ] **Step 1: Write failing navigation state tests**

```ts
const state = createPageState();
state.setPage("checkin");
expect(state.getPage()).toBe("checkin");
state.setPage("journal");
expect(state.getPage()).toBe("journal");
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npm test -- tests/pageState.test.ts`

Expected: FAIL because page state is absent.

- [ ] **Step 3: Implement one View and one in-view page switch**

Register the view on load, add a ribbon icon and command to open it, and reuse existing leaves through `getLeavesOfType()`. The shell renders desktop navigation and a mobile drawer from the same page state. The mobile `+` action closes overlays, selects today, scrolls to the composer, and focuses it.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- tests/pageState.test.ts && npm run typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/view/InkprintView.ts src/ui/AppShell.ts src/ui/PageState.ts tests/pageState.test.ts
git commit -m "feat: add responsive plugin shell"
```

### Task 6: Render the journal composer and content stream

**Files:**
- Create: `src/ui/JournalPage.ts`
- Create: `src/ui/Composer.ts`
- Create: `src/ui/CalendarMonth.ts`
- Modify: `src/ui/AppShell.ts`
- Test: `tests/calendarMonth.test.ts`

**Interfaces:**
- Consumes: `DailyNoteService.append()`.
- Produces: `CalendarMonth.build(year: number, monthIndex: number, entriesByDay: Map<string, DailyEntry[]>): CalendarDay[]`.
- Produces: `Composer.getValue(): string`, `Composer.clear(): void`, `Composer.focus(): void`.

- [ ] **Step 1: Write failing calendar tests**

```ts
const days = CalendarMonth.build(2026, 10, new Map());
expect(days).toHaveLength(42);
expect(days[0]).toMatchObject({ day: 26, inCurrentMonth: false });
expect(days.find(day => day.key === "2026-11-14")).toMatchObject({ inCurrentMonth: true, day: 14 });
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npm test -- tests/calendarMonth.test.ts`

Expected: FAIL because the calendar builder is absent.

- [ ] **Step 3: Implement the capture path**

The selected week expands to show the shared composer. Today is editable; past and future are read-only. Saving calls `DailyNoteService.append()` and refreshes the stream only after success. Preserve the draft locally with plugin data storage when saving fails.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- tests/calendarMonth.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/JournalPage.ts src/ui/Composer.ts src/ui/CalendarMonth.ts src/ui/AppShell.ts tests/calendarMonth.test.ts
git commit -m "feat: add journal capture experience"
```

### Task 7: Add goal and content pages

**Files:**
- Create: `src/ui/GoalPage.ts`
- Create: `src/ui/ContentPage.ts`
- Create: `src/ui/RelationPanel.ts`
- Modify: `src/ui/AppShell.ts`
- Test: `tests/relationIndex.test.ts`

**Interfaces:**
- Consumes: `GoalService`, `LongformService`, `extractRelationTargets()`.
- Produces: `RelationIndex.rebuild(): Promise<void>`, `RelationIndex.getReferrers(target: RelationTarget): RelationItem[]`.
- Produces: goal actions `create`, `addChild`, `edit`, `move`, and `archive`.

- [ ] **Step 1: Write a failing backlink index test**

```ts
const index = buildRelationIndex([
  { day: "2026-11-12", entryId: "entry-b", text: "[[Longform/A#^source]]" },
  { day: "2026-11-13", entryId: "entry-c", text: "`[[Longform/A#^source]]`" },
]);
expect(index.get("Longform/A#^source")).toHaveLength(1);
expect(index.get("Longform/A#^source")[0].entryId).toBe("entry-b");
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npm test -- tests/relationIndex.test.ts`

Expected: FAIL because the relation index is absent.

- [ ] **Step 3: Implement goal and content rendering**

Goal rows expose fold, completion, progress, and a `⋮` menu. The content card opens a side drawer on desktop and a bottom sheet on mobile. The relation panel groups incoming references by date and offers a return-to-day action.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- tests/relationIndex.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/GoalPage.ts src/ui/ContentPage.ts src/ui/RelationPanel.ts src/ui/AppShell.ts tests/relationIndex.test.ts
git commit -m "feat: add goals and longform relations"
```

### Task 8: Add settings, styles, and release verification

**Files:**
- Create: `src/settings/InkprintSettingTab.ts`
- Create: `src/settings/defaults.ts`
- Create: `styles.css`
- Create: `README.md`
- Create: `LICENSE`
- Create: `.github/workflows/release.yml`
- Test: `tests/settings.test.ts`

**Interfaces:**
- Produces: `DEFAULT_SETTINGS`.
- Produces: declarative settings definitions where Obsidian 1.13 supports them, with runtime fallback for older typings.

- [ ] **Step 1: Write failing settings normalization tests**

```ts
expect(normalizeSettings({ dailyFolder: "" })).toMatchObject({
  dailyFolder: "Daily",
  dailyHeading: "## 记录",
  quickCheckLimit: 3,
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npm test -- tests/settings.test.ts`

Expected: FAIL because defaults are absent.

- [ ] **Step 3: Implement settings and styles**

Group settings as General, Writing, Check-in and Goals, Appearance, and Advanced. Use Obsidian CSS variables throughout. Add reduced-transparency and reduced-motion fallbacks. Include GPL-3.0 licensing and release automation for `main.js`, `manifest.json`, and `styles.css`.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run build
node -e 'const fs=require("fs"); for (const file of ["main.js","manifest.json","styles.css"]) if (!fs.existsSync(file)) process.exit(1); console.log("release assets OK")'
```

Expected: all tests PASS, no type errors, and release assets exist.

- [ ] **Step 5: Commit**

```bash
git add src/settings styles.css README.md LICENSE .github/workflows/release.yml tests/settings.test.ts
git commit -m "feat: add settings and release structure"
```

## Self-Review

- Spec coverage: Daily capture, flexible goal tree, longform conversion, relation context, mobile shell, settings, compliance, safe APIs, and release assets each map to a task.
- Deferred by design: desktop drag-and-drop, full 12-week heatmap aggregation, native `.mobile-navbar` takeover, book aggregation, and lazy relation virtualization. These require separate implementation plans after the core Markdown write path is proven.
- Type consistency: `DailyEntryInput`, `GoalNode`, `RelationTarget`, and `AppPage` are introduced before their consumers.
- Placeholder scan: no TBD or unspecified implementation steps remain.
