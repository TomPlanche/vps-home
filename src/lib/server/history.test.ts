import { describe, expect, it } from "vitest";

import type { Checks } from "$lib/checks";

import { createHistory } from "./history";

const round = (state: "up" | "down", ms: number): Checks => ({
  A: { state, ms, status: state === "up" ? 200 : undefined },
  B: { state: "up", status: 200, ms: 1 }
});

describe("createHistory", () => {
  it("keeps the checks of each service, oldest first", () => {
    const history = createHistory();
    history.record(round("up", 10), 1000);
    history.record(round("down", 5000), 2000);

    expect(history.snapshot(["A"])).toEqual({
      A: [
        { at: 1000, state: "up", ms: 10 },
        { at: 2000, state: "down", ms: 5000 }
      ]
    });
  });

  it("keeps only the last checks", () => {
    const history = createHistory(3);
    for (let at = 1; at <= 5; at += 1) {
      history.record(round("up", at), at);
    }

    expect(history.snapshot(["A"]).A.map((entry) => entry.at)).toEqual([3, 4, 5]);
  });

  it("gives an empty history to a service never checked, and none to a service not asked for", () => {
    const history = createHistory();
    history.record(round("up", 10), 1000);

    const snapshot = history.snapshot(["A", "C"]);

    expect(snapshot.C).toEqual([]);
    expect(snapshot).not.toHaveProperty("B");
  });

  it("hands out copies", () => {
    const history = createHistory();
    history.record(round("up", 10), 1000);

    history.snapshot(["A"]).A.pop();

    expect(history.snapshot(["A"]).A).toHaveLength(1);
  });
});
