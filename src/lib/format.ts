/** Formatting for what the cards show. */

/** "4 ms", "180 ms", "1.2 s". */
export const formatMs = (ms: number): string => {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  return `${(ms / 1000).toFixed(1)} s`;
};

const CLOCK = new Intl.DateTimeFormat("en-GB", { timeStyle: "medium" });

/** "22:41:05", in the time zone of the browser. */
export const formatClock = (at: number): string => CLOCK.format(at);
