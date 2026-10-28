/** The statuses of the whole page, counted. */

import type { Checks, CheckState } from "$lib/checks";

/** How many checked services are in each state, and how many have no check yet. */
export type Summary = Record<CheckState, number> & {
  checking: number;
};

/** Counts the checks of the services named. A name without a check is still checking. */
export const summarize = (names: string[], checks: Checks | undefined): Summary => {
  const summary: Summary = { up: 0, failing: 0, down: 0, checking: 0 };

  for (const name of names) {
    const check = checks?.[name];
    summary[check ? check.state : "checking"] += 1;
  }

  return summary;
};

/** The worst first: what needs a look comes before what is fine. */
const ORDER = ["down", "failing", "up", "checking"] as const;

/**
 * The summary in a few words: "all 6 up", "1 down, 1 failing, 4 up".
 *
 * Empty when nothing is checked, so the page can leave the line out.
 */
export const describeSummary = (summary: Summary): string => {
  const total = ORDER.reduce((sum, state) => sum + summary[state], 0);

  if (total === 0) {
    return "";
  }

  if (summary.up === total) {
    return total === 1 ? "up" : `all ${total} up`;
  }

  return ORDER.filter((state) => summary[state] > 0)
    .map((state) => `${summary[state]} ${state}`)
    .join(", ");
};

/** The name of the page, in the title of its tab. */
export const SITE_NAME = "vps-home";

/**
 * The title of the tab: the problems first, since a tab only shows the start of
 * its title. "1 down, 1 failing · vps-home", or just "vps-home" when all is well.
 */
export const tabTitle = (summary: Summary): string => {
  const problems = (["down", "failing"] as const)
    .filter((state) => summary[state] > 0)
    .map((state) => `${summary[state]} ${state}`);

  return problems.length > 0 ? `${problems.join(", ")} · ${SITE_NAME}` : SITE_NAME;
};
