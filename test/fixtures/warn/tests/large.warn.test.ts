import { describe, expect, it } from "vitest";

import { entry } from "../src/entry";

describe("warn fixture", () => {
  it("keeps the run passing while still rendering the module graph", () => {
    expect(entry).toBe("leaf-middle-entry");
  });
});
