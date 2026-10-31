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

const COUNT = new Intl.NumberFormat("en-GB");

/** "1,284" rather than "1284". */
export const formatCount = (value: number): string => COUNT.format(value);

const BYTE_UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"] as const;

/** "512 B", "3.4 GiB", "412 GiB": one decimal under 10, none above. */
export const formatBytes = (bytes: number): string => {
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }

  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${BYTE_UNITS[unit]}`;
};
