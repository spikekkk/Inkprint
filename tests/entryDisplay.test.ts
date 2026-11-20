import { describe, expect, it } from "vitest";
import {
  extractEntryImageTargets,
  stripEntryTags,
} from "../src/domain/entryDisplay";

describe("stripEntryTags", () => {
  it("removes structured tag tokens before rendering the entry body", () => {
    expect(stripEntryTags("#此刻的心情 今天很安静 #读书", ["此刻的心情", "读书"])).toBe(
      "今天很安静",
    );
  });

  it("keeps ordinary hashtags that are not structured tags", () => {
    expect(stripEntryTags("今天想到 #产品设计", ["此刻的心情"])).toBe(
      "今天想到 #产品设计",
    );
  });

  it("extracts unique vault and markdown image targets", () => {
    expect(
      extractEntryImageTargets(
        "![[Attachments/a.png]] ![[Attachments/a.png|alt]] ![remote](https://example.com/b.jpg)",
      ),
    ).toEqual(["Attachments/a.png", "https://example.com/b.jpg"]);
  });
});
