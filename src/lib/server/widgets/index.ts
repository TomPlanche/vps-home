/**
 * The widgets: a few numbers of a service, read from its API.
 *
 * Each type of widget knows one API. The tokens never sit in the services
 * file: the file names an environment variable, and the token stays in the
 * environment of the server.
 */

import type { WidgetResult, Widgets } from "$lib/widgets";

import { reasonOf } from "../checks";
import type { ServiceConfig } from "../config";
import { WidgetError, type Reader } from "./api";
import { readImmich } from "./immich";
import { readPaperless } from "./paperless";

/** The types of widgets, by the API they read. */
export const WIDGET_TYPES = ["paperless", "immich"] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

/** A `[service.widget]` table of the services file. */
export type WidgetConfig = {
  type: WidgetType;
  /** The base URL of the API: the service URL unless the file says otherwise. */
  api: string;
  /** The environment variable that holds the token of the API. */
  tokenEnv: string;
};

/** How long a widget waits for its API. */
export const WIDGET_TIMEOUT_MS = 5000;

const READERS: Record<WidgetType, Reader> = {
  paperless: readPaperless,
  immich: readImmich
};

/** The numbers of one service. Never throws: a failure is a result, shown on its card. */
export const fetchWidget = async (
  config: WidgetConfig,
  env: Record<string, string | undefined>,
  timeoutMs = WIDGET_TIMEOUT_MS
): Promise<WidgetResult> => {
  const token = env[config.tokenEnv];
  if (!token) {
    return { error: `${config.tokenEnv} is not set` };
  }

  try {
    return { stats: await READERS[config.type](config.api, token, AbortSignal.timeout(timeoutMs)) };
  } catch (error) {
    return { error: error instanceof WidgetError ? error.message : reasonOf(error, timeoutMs) };
  }
};

/** The widgets of every service that has one, all at once. */
export const fetchWidgets = async (
  services: ServiceConfig[],
  env: Record<string, string | undefined>,
  timeoutMs = WIDGET_TIMEOUT_MS
): Promise<Widgets> => {
  const results = await Promise.all(
    services.flatMap((service) =>
      service.widget
        ? [fetchWidget(service.widget, env, timeoutMs).then((result) => [service.name, result])]
        : []
    )
  );

  return Object.fromEntries(results);
};
