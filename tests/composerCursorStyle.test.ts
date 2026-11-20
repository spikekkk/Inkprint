import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "styles.css"), "utf8");

describe("composer cursor styles", () => {
  it("gives CodeMirror's drawn cursor an explicit semantic colour", () => {
    expect(styles).toMatch(
      /\.zss-composer-editor-host\s+\.cm-cursor,[^{]*\{[^}]*border-left-color:\s*var\(--caret-color,\s*var\(--text-normal\)\)/s,
    );
  });
});
