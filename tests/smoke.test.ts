import { describe, expect, it } from "vitest";
import { VIEW_TYPE_INKPRINT } from "../src/constants";

describe("plugin scaffold", () => {
  it("uses a stable custom view type", () => {
    expect(VIEW_TYPE_INKPRINT).toBe("inkprint-view");
  });
});
