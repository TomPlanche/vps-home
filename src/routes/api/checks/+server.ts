import { json } from "@sveltejs/kit";

import { checkAll } from "$lib/server/checks";
import { readServices } from "$lib/server/services";

import type { RequestHandler } from "./$types";

/** `GET /api/checks`: a new round of checks, for the page to refresh its cards. */
export const GET: RequestHandler = async () => {
  const checks = await checkAll(await readServices());

  // Each request is a new round: nothing on the way may answer with an old one.
  return json(checks, { headers: { "cache-control": "no-store" } });
};
