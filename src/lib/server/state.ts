/**
 * The state of this server: its history and its current round.
 *
 * Kept in memory, in one place, so the page and `/api/checks` share them.
 */

import { env } from "$env/dynamic/private";
import type { Round } from "$lib/checks";

import { checkAll } from "./checks";
import type { ServiceConfig } from "./config";
import { createHistory } from "./history";
import { createRounds } from "./rounds";
import { createWidgets } from "./widgets";

/** The last checks of this server. A round adds to it once, when it ends. */
const history = createHistory();

/** The widgets of this server, with the numbers they keep between rounds. */
const readWidgets = createWidgets(() => env);

/** A round checks the services and reads their widgets at the same time. */
const rounds = createRounds(async (services) => {
  const [checks, widgets] = await Promise.all([checkAll(services), readWidgets(services)]);
  history.record(checks, Date.now());
  return { checks, widgets };
});

/** The current round and the history it ends. Never rejects. */
export const currentRound = async (services: ServiceConfig[]): Promise<Round> => {
  const { checks, widgets } = await rounds(services);
  const checked = services.filter((service) => service.checked).map((service) => service.name);

  return { checks, history: history.snapshot(checked), widgets };
};
