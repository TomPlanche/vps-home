/** What a check found, shared by the server that runs it and the page that shows it. */

/**
 * - `up`: the service answered with a status below 400.
 * - `failing`: it answered, with an error status.
 * - `down`: nothing answered in time.
 */
export type CheckState = "up" | "failing" | "down";

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
