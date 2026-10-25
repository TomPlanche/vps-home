import { error } from "@sveltejs/kit";

import { env } from "$env/dynamic/private";
import { checkAll } from "$lib/server/checks";
import { ConfigError, loadServices, toPublic } from "$lib/server/config";
import { groupServices } from "$lib/services";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  let services;

  try {
    services = await loadServices(env.SERVICES_FILE || "services.toml");
  } catch (cause) {
    // A mistake in the file is the most likely reason for this page to fail,
    // and only its message says where to look.
    if (cause instanceof ConfigError) {
      error(500, cause.message);
    }
    throw cause;
  }

  return {
    groups: groupServices(services.map((service) => toPublic(service))),
    // Not awaited: the page shows the cards at once, and SvelteKit streams the
    // checks in when the slowest of them is done. `checkAll` never rejects.
    checks: checkAll(services)
  };
};
