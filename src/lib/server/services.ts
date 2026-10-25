/** The services of this server: the file that `SERVICES_FILE` names, read for a request. */

import { error } from "@sveltejs/kit";

import { env } from "$env/dynamic/private";

import { ConfigError, loadServices, type ServiceConfig } from "./config";

/** `SERVICES_FILE`, or services.toml in the folder the server starts in. */
export const servicesFile = (): string => env.SERVICES_FILE || "services.toml";

/**
 * Reads the services for the current request.
 *
 * A mistake in the file is the most likely reason for a request to fail, and
 * only its message says where to look, so it becomes the message of a 500.
 */
export const readServices = async (): Promise<ServiceConfig[]> => {
  try {
    return await loadServices(servicesFile());
  } catch (cause) {
    if (cause instanceof ConfigError) {
      error(500, cause.message);
    }
    throw cause;
  }
};
