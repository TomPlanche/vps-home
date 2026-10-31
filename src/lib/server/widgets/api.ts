/** What the readers of the widgets share: one way to call an API and to fail. */

import type { Stat } from "$lib/widgets";

/** A failure of a widget, worded for its card. */
export class WidgetError extends Error {
  override name = "WidgetError";
}

/** Reads the numbers of one service. */
export type Reader = (api: string, token: string, signal: AbortSignal) => Promise<Stat[]>;

/** `api` and `path` joined, so an API served under a path prefix keeps it. */
export const endpoint = (api: string, path: string): string =>
  `${api.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

/**
 * A GET that expects JSON, with the failures of an API worded for a card.
 *
 * @throws {WidgetError} when the API refuses the token or answers with an error.
 */
export const getJson = async <T>(
  url: string,
  headers: Record<string, string>,
  signal: AbortSignal
): Promise<T> => {
  const response = await fetch(url, {
    signal,
    headers: { accept: "application/json", "user-agent": "vps-home", ...headers }
  });

  if (response.status === 401 || response.status === 403) {
    await response.body?.cancel();
    throw new WidgetError("the API refused the token");
  }

  if (!response.ok) {
    await response.body?.cancel();
    throw new WidgetError(`the API answered ${response.status}`);
  }

  return (await response.json()) as T;
};
