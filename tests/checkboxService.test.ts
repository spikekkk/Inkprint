import { describe, expect, it } from "vitest";
import { extractDailyCheckboxes } from "../src/services/CheckboxService";

describe("CheckboxService", () => {
  it("extracts Markdown checkboxes with stable line positions", () => {
    const markdown = [
      "# 待办",
      "- [ ] 散步",
      "  - [x] 读完《朝花夕拾》",
      "- 普通列表",
    ].join("\n");

    expect(extractDailyCheckboxes(markdown)).toEqual([
      { lineIndex: 1, checked: false, text: "散步" },
      { lineIndex: 2, checked: true, text: "读完《朝花夕拾》" },
    ]);
  });

  it("ignores checkbox examples inside fenced code blocks", () => {
    const markdown = ["```md", "- [ ] 示例", "```", "- [ ] 真任务"].join("\n");
    expect(extractDailyCheckboxes(markdown)).toEqual([
      { lineIndex: 3, checked: false, text: "真任务" },
    ]);
  });
});
