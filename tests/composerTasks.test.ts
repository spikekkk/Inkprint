import { describe, expect, it } from "vitest";
import {
  getTaskInsertion,
  scanTaskLines,
  toggleTaskInDocument,
} from "../src/ui/composerTasks";

describe("composer task syntax", () => {
  it("finds clickable task states and ignores fenced code", () => {
    const doc = ["- [ ] 散步", "  - [x] 读书", "```md", "- [ ] 示例", "```"].join("\n");
    expect(scanTaskLines(doc)).toEqual([
      {
        stateFrom: 3,
        markerFrom: 0,
        markerTo: 6,
        checked: false,
      },
      {
        stateFrom: 14,
        markerFrom: 11,
        markerTo: 17,
        checked: true,
      },
    ]);
  });

  it("toggles only the selected task state character", () => {
    expect(toggleTaskInDocument("- [ ] 散步", 3, true)).toBe("- [x] 散步");
    expect(toggleTaskInDocument("- [x] 散步", 3, false)).toBe("- [ ] 散步");
  });

  it("continues on the same task line and starts a new one after prose", () => {
    expect(getTaskInsertion("", 0)).toEqual({ position: 0, insert: "- [ ] " });
    expect(getTaskInsertion("今天很好", 4)).toEqual({
      position: 4,
      insert: "\n- [ ] ",
    });
  });
});
