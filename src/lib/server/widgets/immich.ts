/**
 * Immich: the photos, the videos, and the space they take.
 *
 * The statistics of the server are for an admin only: the key is an API key of
 * an admin user, with the `server.statistics` permission at least.
 */

import { formatBytes, formatCount } from "$lib/format";

import { endpoint, getJson, type Reader } from "./api";

/** The part of `GET /api/server/statistics` that the card shows. */
type Statistics = {
  photos: number;
  videos: number;
  /** Bytes, for all the users. */
  usage: number;
};

export const readImmich: Reader = async (api, token, signal) => {
  const statistics = await getJson<Statistics>(
    endpoint(api, "/api/server/statistics"),
    { "x-api-key": token },
    signal
  );

  return [
    { value: formatCount(statistics.photos), label: "photos" },
    { value: formatCount(statistics.videos), label: "videos" },
    { value: formatBytes(statistics.usage), label: "used" }
  ];
};
