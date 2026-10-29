import { toPublic } from "$lib/server/config";
import { currentRound } from "$lib/server/rounds";
import { readServices } from "$lib/server/services";
import { groupServices } from "$lib/services";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const services = await readServices();

  return {
    groups: groupServices(services.map((service) => toPublic(service))),
    // Not awaited: the page shows the cards at once, and SvelteKit streams the
    // round in when the slowest check is done. A round never rejects.
    round: currentRound(services)
  };
};
