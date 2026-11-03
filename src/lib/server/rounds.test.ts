import { describe, expect, it } from "vitest";

import type { Checks } from "$lib/checks";

import type { ServiceConfig } from "./config";
import { createRounds } from "./rounds";

const service = (
  name: string,
  check: string | null = `http://10.0.0.4/${name}`
): ServiceConfig => ({
  name,
  group: "Services",
  url: "https://example.com",
  checked: check !== null,
  check,
  expect: null,
  widget: null
});

/** Rounds on a clock the test moves, with a count of the real rounds. */
const setUp = () => {
  let time = 0;
  let runs = 0;

  const rounds = createRounds(
    async (services) => {
      runs += 1;
      return Object.fromEntries(
        services.map((s) => [s.name, { state: "up", status: 200, ms: runs }])
      ) as Checks;
    },
    10_000,
    () => time
  );

  return {
    rounds,
    runs: () => runs,
    advance: (ms: number) => {
      time += ms;
    }
  };
};

describe("createRounds", () => {
  it("answers requests close together with one round", () => {
    const { rounds, runs, advance } = setUp();
    const services = [service("A"), service("B")];

    const first = rounds(services);
    advance(9_000);
    const second = rounds(services);

    expect(second).toBe(first);
    expect(runs()).toBe(1);
  });

  it("starts a new round once the last one is too old", async () => {
    const { rounds, runs, advance } = setUp();
    const services = [service("A")];

    const first = await rounds(services);
    advance(10_000);
    const second = await rounds(services);

    expect(runs()).toBe(2);
    expect(second.A.ms).not.toBe(first.A.ms);
  });

  it("starts a new round when the services change", () => {
    const { rounds, runs } = setUp();

    void rounds([service("A")]);
    void rounds([service("A"), service("B")]);
    void rounds([service("A", "http://10.0.0.5/A"), service("B")]);

    expect(runs()).toBe(3);
  });

  it("shares a round that is still running", async () => {
    let finish: ((checks: Checks) => void) | undefined;
    let runs = 0;
    const rounds = createRounds(() => {
      runs += 1;
      return new Promise<Checks>((resolve) => {
        finish = resolve;
      });
    });

    const first = rounds([service("A")]);
    const second = rounds([service("A")]);
    finish?.({ A: { state: "up", status: 200, ms: 1 } });

    expect(await second).toEqual(await first);
    expect(runs).toBe(1);
  });
});
