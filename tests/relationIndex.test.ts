import { describe, expect, it } from "vitest";
import { buildRelationIndex } from "../src/services/RelationIndex";

describe("relation index", () => {
  it("indexes only real block references and ignores code", () => {
    const index = buildRelationIndex([
      {
        day: "2026-11-12",
        entryId: "entry-b",
        createdAt: "2026-11-12T21:08:00+08:00",
        text: "[[Longform/A#^source]]",
      },
      {
        day: "2026-11-13",
        entryId: "entry-c",
        createdAt: "2026-11-13T08:42:00+08:00",
        text: "`[[Longform/A#^source]]`",
      },
    ]);

    expect(index.getReferrers({ path: "Longform/A", blockId: "source" })).toHaveLength(1);
    expect(index.getReferrers({ path: "Longform/A", blockId: "source" })[0]?.entryId).toBe(
      "entry-b",
    );
  });

  it("resolves a source entry by its stable ID", () => {
    const index = buildRelationIndex([
      {
        day: "2026-11-12",
        entryId: "entry-b",
        createdAt: "2026-11-12T21:08:00+08:00",
        text: "[[Longform/A#^source]]",
      },
    ]);
    expect(index.getSource("entry-b")).toMatchObject({
      day: "2026-11-12",
      entryId: "entry-b",
    });
  });
});
