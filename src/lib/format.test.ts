import { describe, expect, it } from "vitest";

import { formatMs } from "./format";

describe("formatMs", () => {
  it.each([
    [0, "0 ms"],
    [3.6, "4 ms"],
    [180, "180 ms"],
    [999, "999 ms"],
    [1000, "1.0 s"],
    [1234, "1.2 s"]
  ])("formats %d as %s", (ms, text) => {
    expect(formatMs(ms)).toBe(text);
  });
});
