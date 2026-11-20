import { describe, expect, it } from "vitest";
import { buildTaskText } from "../src/domain/taskDraft";

describe("buildTaskText", () => {
  it("adds a due date when one is provided", () => {
    expect(buildTaskText("读完《朝花夕拾》", "2026-11-26")).toBe(
      "读完《朝花夕拾》 @2026-11-26",
    );
  });

  it("creates an ordinary task when no date is chosen", () => {
    expect(buildTaskText("散步", "")).toBe("散步");
  });
});
