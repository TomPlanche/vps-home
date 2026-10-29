/**
 * The last checks of each service, kept in memory.
 *
 * Nothing is written to disk: a restart starts a new history, which is fine for
 * a strip of the last minutes. The checks run only while a page asks for them,
 * so the history has gaps when no tab is open. Each entry carries its time, so
 * the page can tell.
 */

import { HISTORY_SIZE, type Checks, type History, type HistoryEntry } from "$lib/checks";

export type CheckHistory = {
  /** Adds the checks of a round that ended at `at`. */
  record: (checks: Checks, at: number) => void;
  /** The history of the services named, and of them only: a service removed from the file is gone. */
  snapshot: (names: string[]) => History;
};

export const createHistory = (size = HISTORY_SIZE): CheckHistory => {
  const entries = new Map<string, HistoryEntry[]>();

  return {
    record: (checks, at) => {
      for (const [name, check] of Object.entries(checks)) {
        const list = entries.get(name) ?? [];
        list.push({ at, state: check.state, ms: check.ms });
        entries.set(name, list.slice(-size));
      }
    },
    snapshot: (names) =>
      Object.fromEntries(names.map((name) => [name, [...(entries.get(name) ?? [])]]))
  };
};
