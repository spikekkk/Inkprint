import { describe, expect, it } from "vitest";
import { VIEW_TYPE_ZHENSHANGSHU } from "../src/constants";

describe("plugin scaffold", () => {
  it("uses a stable custom view type", () => {
    expect(VIEW_TYPE_ZHENSHANGSHU).toBe("zhenshangshu-view");
  });
});
