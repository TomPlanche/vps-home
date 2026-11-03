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
import { readForgejo } from "./forgejo";
import { readImmich } from "./immich";
import { readPaperless } from "./paperless";

/** The types of widgets, by the API they read. */
export const WIDGET_TYPES = ["paperless", "immich", "forgejo"] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

/** A `[service.widget]` table of the services file. */
export type WidgetConfig = {
  type: WidgetType;
  /** The base URL of the API: the service URL unless the file says otherwise. */
  api: string;
  /** The environment variable that holds the token of the API. */
  tokenEnv: string;
};

/** How long a widget waits for its API, unless its type needs more. */
export const WIDGET_TIMEOUT_MS = 5000;

/** How long a round waits for a widget before it goes on with the last numbers of the widget. */
export const WIDGET_WAIT_MS = 5000;

/** How a type of widget reads its API. */
type Kind = {
  read: Reader;
  /** The longest a read can take. */
  timeoutMs: number;
  /** How long its numbers stay good. 0: a new read for each round. */
  maxAgeMs: number;
};

const KINDS: Record<WidgetType, Kind> = {
  paperless: { read: readPaperless, timeoutMs: WIDGET_TIMEOUT_MS, maxAgeMs: 0 },
  immich: { read: readImmich, timeoutMs: WIDGET_TIMEOUT_MS, maxAgeMs: 0 },
  // One request per repository: a read can take a while, and the numbers
  // change slowly.
  forgejo: { read: readForgejo, timeoutMs: 60_000, maxAgeMs: 10 * 60_000 }
};

/** The numbers of one service. Never throws: a failure is a result, shown on its card. */
export const fetchWidget = async (
  config: WidgetConfig,
  env: Record<string, string | undefined>,
  timeoutMs = KINDS[config.type].timeoutMs
): Promise<WidgetResult> => {
  const token = env[config.tokenEnv];
  if (!token) {
    return { error: `${config.tokenEnv} is not set` };
  }

  try {
    const read = KINDS[config.type].read;
    return { stats: await read(config.api, token, AbortSignal.timeout(timeoutMs)) };
  } catch (error) {
    return { error: error instanceof WidgetError ? error.message : reasonOf(error, timeoutMs) };
  }
};

/** The last numbers of the widget of one service, and the read that renews them. */
type Entry = {
  /** The widget config: an edit of the file starts a new entry. */
  key: string;
  result?: WidgetResult;
  /** When `result` landed. */
  at: number;
  pending?: Promise<WidgetResult>;
};

/** Reads the widgets of the services of a round, by service name. */
export type WidgetReader = (services: ServiceConfig[]) => Promise<Widgets>;

/**
 * Reads the widgets of each round, and keeps their numbers for the next rounds.
 *
 * A widget is read again when its numbers are older than the `maxAgeMs` of its
 * type. A round waits `waitMs` at most for a read. A slower read goes on, the
 * round shows the last numbers of the widget (or none yet), and a later round
 * gets the new ones. Thus, a slow API never holds back the checks.
 *
 * `readEnv` gives the environment at the time of the read: SvelteKit sets it
 * when the server starts, which can be after this module loads.
 */
export const createWidgets = (
  readEnv: () => Record<string, string | undefined>,
  waitMs = WIDGET_WAIT_MS,
  now: () => number = Date.now
): WidgetReader => {
  const entries = new Map<string, Entry>();

  const read = async (name: string, config: WidgetConfig): Promise<WidgetResult | undefined> => {
    const key = JSON.stringify(config);
    let entry = entries.get(name);
    if (entry?.key !== key) {
      entry = { key, at: 0 };
      entries.set(name, entry);
    }

    const current = entry;
    if (current.result && now() - current.at < KINDS[config.type].maxAgeMs) {
      return current.result;
    }

    // One read at a time per widget: a round that comes during a read waits for it.
    current.pending ??= fetchWidget(config, readEnv()).then((result) => {
      current.result = result;
      current.at = now();
      current.pending = undefined;
      return result;
    });

    const pending = current.pending;
    const result = await new Promise<WidgetResult | undefined>((resolve) => {
      const timer = setTimeout(() => resolve(undefined), waitMs);
      void pending.then((value) => {
        clearTimeout(timer);
        resolve(value);
      });
    });

    return result ?? current.result;
  };

  return async (services) => {
    const withWidget = services.filter(
      (service): service is ServiceConfig & { widget: WidgetConfig } => service.widget !== null
    );

    // A service removed from the file takes its numbers with it.
    const names = new Set(withWidget.map((service) => service.name));
    for (const name of entries.keys()) {
      if (!names.has(name)) {
        entries.delete(name);
      }
    }

    const results = await Promise.all(
      withWidget.map(
        async (service) => [service.name, await read(service.name, service.widget)] as const
      )
    );

    return Object.fromEntries(
      results.flatMap(([name, result]) => (result ? [[name, result]] : []))
    );
  };
};
