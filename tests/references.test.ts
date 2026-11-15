import { describe, expect, it } from "vitest";
import {
  extractReferences,
  extractRelationTargets,
} from "../src/domain/references";

describe("markdown references", () => {
  it("extracts references while ignoring code, comments, and images", () => {
    const markdown = [
      "[[Longform/为什么我想重做每日记录#^a1b2]]",
      "```md",
      "[[Ignored/Code#^dead]]",
      "```",
      "<!-- [[Ignored/Comment#^dead]] -->",
      "`[[Ignored/Inline#^dead]]`",
      "![[image.png]]",
      "[打开长文](Longform/为什么我想重做每日记录.md#^c3d4)",
    ].join("\n");

    expect(extractReferences(markdown).map((reference) => reference.raw)).toEqual([
      "[[Longform/为什么我想重做每日记录#^a1b2]]",
      "[打开长文](Longform/为什么我想重做每日记录.md#^c3d4)",
    ]);
    expect(extractRelationTargets(markdown)).toEqual([
      { path: "Longform/为什么我想重做每日记录", blockId: "a1b2" },
      { path: "Longform/为什么我想重做每日记录.md", blockId: "c3d4" },
    ]);
  });

  it("rejects external URLs and links without block anchors", () => {
    const markdown = [
      "[[Ordinary note]]",
      "[website](https://example.com#^fake)",
      "[[Daily/2026-11-15#^entry-real|今天的记录]]",
    ].join("\n");

    expect(extractRelationTargets(markdown)).toEqual([
      { path: "Daily/2026-11-15", blockId: "entry-real" },
    ]);
  });
});
