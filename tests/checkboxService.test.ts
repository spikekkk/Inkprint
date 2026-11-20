import { describe, expect, it, vi } from "vitest";
import { TFile, type Vault } from "obsidian";
import { CheckboxService, extractDailyCheckboxes } from "../src/services/CheckboxService";

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

  it("appends a newly created task to the selected Daily note", async () => {
    const file = Object.assign(new TFile(), { path: "Daily/2026-11-20.md" });
    const vault = {
      getFileByPath: vi.fn().mockReturnValue(file),
      append: vi.fn().mockResolvedValue(undefined),
    } as unknown as Vault;
    const service = new CheckboxService(vault, {
      dailyFolder: "Daily",
      dailyHeading: "# 待办",
    });

    await service.appendToDay("2026-11-20", [
      { lineIndex: -1, checked: false, text: "读完《朝花夕拾》 @2026-11-26" },
    ]);

    expect(vault.append).toHaveBeenCalledWith(
      file,
      "\n# 待办\n\n- [ ] 读完《朝花夕拾》 @2026-11-26\n",
    );
  });
});
