import { describe, expect, it } from "vitest";

import { entry } from "../src/entry";

describe("error fixture", () => {
  it("fails the module when the graph is too large", () => {
    expect(entry).toBe("leaf-middle-entry");
  });
});
