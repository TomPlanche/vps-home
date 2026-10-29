import { json } from "@sveltejs/kit";

import { currentRound } from "$lib/server/rounds";
import { readServices } from "$lib/server/services";

import type { RequestHandler } from "./$types";

/** `GET /api/checks`: the current round and the history, for the page to refresh its cards. */
export const GET: RequestHandler = async () => {
  const round = await currentRound(await readServices());

  // The server decides how old a round may be: nothing on the way may keep one.
  return json(round, { headers: { "cache-control": "no-store" } });
};
