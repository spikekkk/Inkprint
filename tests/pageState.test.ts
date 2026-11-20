import { describe, expect, it } from "vitest";
import { createPageState } from "../src/ui/PageState";

describe("page state", () => {
  it("switches between the four in-view pages", () => {
    const state = createPageState();
    expect(state.getPage()).toBe("journal");
    state.setPage("stats");
    expect(state.getPage()).toBe("stats");
    state.setPage("search");
    expect(state.getPage()).toBe("search");
    state.setPage("stats");
    expect(state.getPage()).toBe("stats");
    state.setPage("tags");
    expect(state.getPage()).toBe("tags");
    state.setPage("tasks");
    expect(state.getPage()).toBe("tasks");
    state.setPage("vault");
    expect(state.getPage()).toBe("vault");
  });
});
