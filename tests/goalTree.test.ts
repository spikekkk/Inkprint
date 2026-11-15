import { describe, expect, it } from "vitest";
import {
  calculateGoalProgress,
  parseGoalTree,
  serializeGoalTree,
  validateGoalMove,
  type GoalNode,
} from "../src/domain/goalTree";

const source = [
  "- 内容输出 #okr/objective ^goal-content",
  "  - 全年读完 50 本 #okr/key-result [progress:: count] [current:: 25] [target:: 50] ^goal-reading",
  "    - [ ] 读完《朝花夕拾》 #okr/task [schedule:: one-off] ^task-chaohua",
].join("\n");

describe("goal tree", () => {
  it("parses nested Markdown into stable parent relationships", () => {
    expect(parseGoalTree(source)).toEqual([
      expect.objectContaining({ id: "goal-content", parentId: null, title: "内容输出" }),
      expect.objectContaining({ id: "goal-reading", parentId: "goal-content", target: 50 }),
      expect.objectContaining({ id: "task-chaohua", parentId: "goal-reading", done: false }),
    ]);
  });

  it("round-trips IDs, fields, and checkbox state", () => {
    const parsed = parseGoalTree(source);
    const serialized = serializeGoalTree(parsed);
    expect(serialized).toContain("^goal-reading");
    expect(serialized).toContain("[target:: 50]");
    expect(serialized).toContain("- [ ] 读完《朝花夕拾》 #okr/task");
  });

  it("calculates count progress and rejects nested cycles", () => {
    const nodes = parseGoalTree(source);
    expect(calculateGoalProgress(nodes, "goal-reading")).toEqual({
      completed: 25,
      total: 50,
      percent: 50,
    });
    expect(() => validateGoalMove(nodes, "goal-content", "goal-reading")).toThrow("cycle");
  });

  it("rejects unknown parents during serialization", () => {
    const invalid: GoalNode[] = [
      {
        id: "orphan",
        parentId: "missing",
        title: "孤立任务",
        kind: "task",
        progressMode: "children",
        done: false,
        archived: false,
      },
    ];
    expect(() => serializeGoalTree(invalid)).toThrow("Unknown goal parent");
  });
});
