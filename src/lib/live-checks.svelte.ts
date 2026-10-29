/** The checks of the page, kept fresh while the page is open. */

import { resolve } from "$app/paths";

import type { Checks, History, Round } from "$lib/checks";

/** How often the page asks for a new round of checks. */
export const REFRESH_MS = 30_000;

export type LiveChecks = {
  /** The checks of the latest round, kept across a failed refresh. */
  readonly checks: Checks | undefined;
  /** The last checks of each service, up to the latest round. */
  readonly history: History | undefined;
  /** When the latest round landed. */
  readonly updatedAt: number | undefined;
  /** Why the last refresh failed, cleared by the next one that works. */
  readonly error: string | undefined;
  /** Takes the round the page load streams in. Returns a teardown. */
  receive: (pending: Promise<Round>) => () => void;
  /** Asks for a new round, now. */
  refresh: () => Promise<void>;
  /** Refreshes every `intervalMs` until the returned teardown runs. */
  start: (intervalMs: number) => () => void;
};

export const createLiveChecks = (): LiveChecks => {
  let checks = $state<Checks | undefined>(undefined);
  let history = $state<History | undefined>(undefined);
  let updatedAt = $state<number | undefined>(undefined);
  let error = $state<string | undefined>(undefined);

  let inFlight: AbortController | undefined;

  const set = (next: Round): void => {
    checks = next.checks;
    history = next.history;
    updatedAt = Date.now();
    error = undefined;
  };

  const receive = (pending: Promise<Round>): (() => void) => {
    let current = true;

    void pending.then((next) => {
      // A refresh can land before the streamed round, which is then the older one.
      if (current && checks === undefined) {
        set(next);
      }
    });

    return () => {
      current = false;
    };
  };

  const refresh = async (): Promise<void> => {
    inFlight?.abort();

    const controller = new AbortController();
    inFlight = controller;

    try {
      const response = await fetch(resolve("/api/checks"), {
        signal: controller.signal,
        headers: { accept: "application/json" }
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const next = (await response.json()) as Round;
      if (!controller.signal.aborted) {
        set(next);
      }
    } catch (cause) {
      if (controller.signal.aborted) {
        return;
      }

      // The last round stays on screen, with the error next to it: a board that
      // blanks out the moment this server restarts is worse than an old one.
      error = cause instanceof Error ? cause.message : String(cause);
    }
  };

  /**
   * Refreshes on a timer while the tab is visible.
   *
   * A hidden tab asks for nothing: this page stays open in a tab all day, and
   * each round is a request to every service. When the tab shows again, it
   * refreshes at once rather than showing a round from hours ago.
   */
  const start = (intervalMs: number): (() => void) => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const run = (): void => {
      timer ??= setInterval(() => void refresh(), intervalMs);
    };

    const pause = (): void => {
      clearInterval(timer);
      timer = undefined;
    };

    const onVisibilityChange = (): void => {
      if (document.hidden) {
        pause();
      } else {
        void refresh();
        run();
      }
    };

    if (!document.hidden) {
      run();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      pause();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      inFlight?.abort();
    };
  };

  return {
    get checks() {
      return checks;
    },
    get history() {
      return history;
    },
    get updatedAt() {
      return updatedAt;
    },
    get error() {
      return error;
    },
    receive,
    refresh,
    start
  };
};
