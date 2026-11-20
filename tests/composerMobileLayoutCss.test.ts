import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "styles.css"), "utf8");

describe("composer mobile toolbar layout", () => {
  it("lets the send button size to its label instead of a fixed width", () => {
    expect(styles).toMatch(
      /\.zss-send-button\s*\{[^}]*min-width:\s*0;[^}]*width:\s*max-content;/s,
    );
    expect(styles).toMatch(
      /@media \(max-width: 700px\)[\s\S]*?\.zss-send-button\s*\{[^}]*min-width:\s*0;[^}]*width:\s*max-content;/,
    );
  });

  it("gives the tool group the remaining toolbar width", () => {
    expect(styles).toMatch(
      /\.zss-composer-tools\s*\{[^}]*flex:\s*1 1 auto;/s,
    );
  });
});
