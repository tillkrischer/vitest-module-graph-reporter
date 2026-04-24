import { describe, expect, it } from "vitest";

describe("small fixture", () => {
  it("still passes when another module fails the threshold", () => {
    expect(1 + 1).toBe(2);
  });
});
