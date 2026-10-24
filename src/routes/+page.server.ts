import { error } from "@sveltejs/kit";

import { env } from "$env/dynamic/private";
import { ConfigError, loadServices } from "$lib/server/config";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  try {
    return { services: await loadServices(env.SERVICES_FILE || "services.toml") };
  } catch (cause) {
    // A mistake in the file is the most likely reason for this page to fail,
    // and only its message says where to look.
    if (cause instanceof ConfigError) {
      error(500, cause.message);
    }
    throw cause;
  }
};
