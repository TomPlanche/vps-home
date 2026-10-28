import { describe, expect, it } from "vitest";

import type { Checks } from "./checks";
import { describeSummary, SITE_NAME, summarize, tabTitle } from "./summary";

const checks: Checks = {
  Grafana: { state: "up", status: 200, ms: 12 },
  Kuma: { state: "up", status: 302, ms: 8 },
  Immich: { state: "failing", status: 503, ms: 30 },
  Paperless: { state: "down", ms: 5000, reason: "no answer in 5 s" }
};

describe("summarize", () => {
  it("counts the services in each state", () => {
    expect(summarize(["Grafana", "Kuma", "Immich", "Paperless"], checks)).toEqual({
      up: 2,
      failing: 1,
      down: 1,
      checking: 0
    });
  });

  it("counts a service without a check as checking", () => {
    expect(summarize(["Grafana", "Forgejo"], checks)).toMatchObject({ up: 1, checking: 1 });
    expect(summarize(["Grafana", "Forgejo"], undefined)).toMatchObject({ up: 0, checking: 2 });
  });

  it("counts only the services named", () => {
    expect(summarize(["Grafana"], checks)).toEqual({ up: 1, failing: 0, down: 0, checking: 0 });
  });
});

describe("describeSummary", () => {
  it.each([
    [{ up: 0, failing: 0, down: 0, checking: 0 }, ""],
    [{ up: 1, failing: 0, down: 0, checking: 0 }, "up"],
    [{ up: 6, failing: 0, down: 0, checking: 0 }, "all 6 up"],
    [{ up: 4, failing: 1, down: 1, checking: 0 }, "1 down, 1 failing, 4 up"],
    [{ up: 0, failing: 0, down: 0, checking: 3 }, "3 checking"],
    [{ up: 2, failing: 0, down: 0, checking: 1 }, "2 up, 1 checking"]
  ])("describes %o as %j", (summary, text) => {
    expect(describeSummary(summary)).toBe(text);
  });
});

describe("tabTitle", () => {
  it.each([
    [{ up: 6, failing: 0, down: 0, checking: 0 }, SITE_NAME],
    [{ up: 0, failing: 0, down: 0, checking: 6 }, SITE_NAME],
    [{ up: 5, failing: 1, down: 0, checking: 0 }, `1 failing · ${SITE_NAME}`],
    [{ up: 3, failing: 1, down: 2, checking: 0 }, `2 down, 1 failing · ${SITE_NAME}`]
  ])("titles %o %j", (summary, title) => {
    expect(tabTitle(summary)).toBe(title);
  });
});
