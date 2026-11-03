import { describe, expect, it } from "vitest";

import { formatBytes, formatClock, formatCount, formatMs, plural } from "./format";

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

describe("formatCount", () => {
  it("groups the thousands", () => {
    expect(formatCount(7)).toBe("7");
    expect(formatCount(1284)).toBe("1,284");
    expect(formatCount(1_000_000)).toBe("1,000,000");
  });
});

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1536, "1.5 KiB"],
    [3.4 * 1024 ** 3, "3.4 GiB"],
    [412.3 * 1024 ** 3, "412 GiB"],
    [2 * 1024 ** 4, "2.0 TiB"]
  ])("formats %d as %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});

describe("plural", () => {
  it.each([
    [0, "photos"],
    [1, "photo"],
    [2, "photos"]
  ])("gives %d %s", (count, noun) => {
    expect(plural(count, "photo")).toBe(noun);
  });

  it("takes an irregular plural", () => {
    expect(plural(1, "repository", "repositories")).toBe("repository");
    expect(plural(4, "repository", "repositories")).toBe("repositories");
  });
});
