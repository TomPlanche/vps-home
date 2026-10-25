import { describe, expect, it } from "vitest";

import { formatClock, formatMs } from "./format";

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

describe("formatClock", () => {
  it("gives the hours, minutes and seconds", () => {
    expect(formatClock(new Date(2026, 9, 25, 22, 41, 5).getTime())).toBe("22:41:05");
  });
});
