import { describe, expect, it } from "vitest";
import { createPageState } from "../src/ui/PageState";

describe("page state", () => {
  it("switches between the four in-view pages", () => {
    const state = createPageState();
    expect(state.getPage()).toBe("journal");
    state.setPage("checkin");
    expect(state.getPage()).toBe("checkin");
    state.setPage("content");
    expect(state.getPage()).toBe("content");
  });
});
