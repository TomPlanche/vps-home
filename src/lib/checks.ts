/** What a check found, shared by the server that runs it and the page that shows it. */

/**
 * - `up`: the service answered with a status below 400.
 * - `failing`: it answered, with an error status.
 * - `down`: nothing answered in time.
 */
export type CheckState = "up" | "failing" | "down";

/** The colour of each state, as a CSS custom property. */
export const STATE_COLORS: Record<CheckState, string> = {
  up: "var(--ok)",
  failing: "var(--warn)",
  down: "var(--fail)"
};

export type Check = {
  state: CheckState;
  /** The HTTP status, when something answered. */
  status?: number;
  /** How long the answer took, or how long the check waited for nothing. */
  ms: number;
  /** Why a check is down, in a few words. */
  reason?: string;
};

/** The checks of a round, by service name. A service that is not checked has none. */
export type Checks = Record<string, Check>;

/** One past check of a service, as small as a bar of the history needs. */
export type HistoryEntry = {
  /** When the round of this check ended. */
  at: number;
  state: CheckState;
  ms: number;
};

/** How many checks the server keeps for each service: 15 minutes of rounds every 30 seconds. */
export const HISTORY_SIZE = 30;

/** The last checks of each service, oldest first, by service name. */
export type History = Record<string, HistoryEntry[]>;

/** What the server sends for a round: the checks, and the history they end. */
export type Round = {
  checks: Checks;
  history: History;
};
