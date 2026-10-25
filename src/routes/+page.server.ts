import { checkAll } from "$lib/server/checks";
import { toPublic } from "$lib/server/config";
import { readServices } from "$lib/server/services";
import { groupServices } from "$lib/services";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const services = await readServices();

  return {
    groups: groupServices(services.map((service) => toPublic(service))),
    // Not awaited: the page shows the cards at once, and SvelteKit streams the
    // checks in when the slowest of them is done. `checkAll` never rejects.
    checks: checkAll(services)
  };
};
