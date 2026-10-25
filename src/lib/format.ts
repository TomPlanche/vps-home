/** Formatting for what the cards show. */

/** "4 ms", "180 ms", "1.2 s". */
export const formatMs = (ms: number): string => {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  return `${(ms / 1000).toFixed(1)} s`;
};
