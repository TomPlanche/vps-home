/**
 * One round of checks for every request that comes close together.
 *
 * Each open tab asks for a round every 30 seconds, and a page load asks for
 * one too. Without sharing, three tabs make three requests to every service in
 * the same second, and a slow service holds three of them open.
 */

import type { Checks, Round } from "$lib/checks";

import { checkAll } from "./checks";
import type { ServiceConfig } from "./config";
import { createHistory } from "./history";

/**
 * How long a round answers for. Shorter than the refresh of the page, so a tab
 * that refreshes always gets a round newer than its last one.
 */
export const ROUND_TTL_MS = 10_000;

type SharedRound = {
  /** The services the round checks: an edit of the file starts a new one. */
  key: string;
  startedAt: number;
  checks: Promise<Checks>;
};

/**
 * A function that gives the current round, starting one when the last is too old.
 *
 * A round counts from when it starts, not from when it ends, and a request that
 * comes while it runs waits for it rather than starting another.
 */
export const createRounds = (
  run: (services: ServiceConfig[]) => Promise<Checks> = checkAll,
  ttlMs = ROUND_TTL_MS,
  now: () => number = Date.now
): ((services: ServiceConfig[]) => Promise<Checks>) => {
  let last: SharedRound | undefined;

  return (services) => {
    const key = JSON.stringify(services.map((service) => [service.name, service.check]));
    const at = now();

    if (last && last.key === key && at - last.startedAt < ttlMs) {
      return last.checks;
    }

    last = { key, startedAt: at, checks: run(services) };
    return last.checks;
  };
};

/** The last checks of this server. A round adds to it once, when it ends. */
const history = createHistory();

/** The rounds of this server, each recorded in the history when it ends. */
const currentChecks = createRounds(async (services) => {
  const checks = await checkAll(services);
  history.record(checks, Date.now());
  return checks;
});

/** The current round and the history it ends, for the page and `/api/checks`. */
export const currentRound = async (services: ServiceConfig[]): Promise<Round> => {
  const checks = await currentChecks(services);
  const checked = services.filter((service) => service.checked).map((service) => service.name);

  return { checks, history: history.snapshot(checked) };
};
