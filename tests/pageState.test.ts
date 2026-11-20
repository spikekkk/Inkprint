import { describe, expect, it } from "vitest";
import { createPageState } from "../src/ui/PageState";

describe("page state", () => {
  it("switches between the four in-view pages", () => {
    const state = createPageState();
    expect(state.getPage()).toBe("journal");
    state.setPage("content");
    expect(state.getPage()).toBe("content");
    state.setPage("search");
    expect(state.getPage()).toBe("search");
    state.setPage("stats");
    expect(state.getPage()).toBe("stats");
    state.setPage("tags");
    expect(state.getPage()).toBe("tags");
  });
});
