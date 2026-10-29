import { json } from "@sveltejs/kit";

import { currentChecks } from "$lib/server/rounds";
import { readServices } from "$lib/server/services";

import type { RequestHandler } from "./$types";

/** `GET /api/checks`: the current round of checks, for the page to refresh its cards. */
export const GET: RequestHandler = async () => {
  const checks = await currentChecks(await readServices());

  // The server decides how old a round may be: nothing on the way may keep one.
  return json(checks, { headers: { "cache-control": "no-store" } });
};
