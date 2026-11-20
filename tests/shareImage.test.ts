import { describe, expect, it } from "vitest";
import { toSharePlainText } from "../src/services/ShareImageService";

describe("share image text", () => {
  it("turns common markdown into readable plain text", () => {
    expect(
      toSharePlainText(
        "- [ ] 读完 [[朝花夕拾|朝花夕拾]] 并写一段感受 #书评\n**重点** [链接](https://example.com)",
        ["书评"],
      ),
    ).toBe("• 读完 朝花夕拾 并写一段感受\n重点 链接");
  });
});
