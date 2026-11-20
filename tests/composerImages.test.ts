import { describe, expect, it } from "vitest";
import { scanComposerImages } from "../src/ui/composerImages";

describe("composer image syntax", () => {
  it("finds wiki and markdown image embeds outside code fences", () => {
    const doc = [
      "今天的光线很好看。",
      "![[Attachments/dusk.png]]",
      "![植物](Attachments/leaf%20one.jpg)",
      "```md",
      "![[Attachments/example.png]]",
      "```",
    ].join("\n");

    expect(scanComposerImages(doc)).toEqual([
      {
        from: 10,
        to: 35,
        path: "Attachments/dusk.png",
      },
      {
        from: 36,
        to: 69,
        path: "Attachments/leaf one.jpg",
      },
    ]);
  });
});
