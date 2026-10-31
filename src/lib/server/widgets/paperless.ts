/**
 * Paperless-ngx: the documents, and those still in the inbox.
 *
 * The token is the API token of a user, from the profile page of Paperless.
 */

import { formatCount } from "$lib/format";

import { endpoint, getJson, type Reader } from "./api";

/** The part of `GET /api/statistics/` that the card shows. */
type Statistics = {
  documents_total: number;
  /** `null` when no tag is the inbox tag. */
  documents_inbox: number | null;
};

export const readPaperless: Reader = async (api, token, signal) => {
  const statistics = await getJson<Statistics>(
    endpoint(api, "/api/statistics/"),
    { authorization: `Token ${token}` },
    signal
  );

  const stats = [{ value: formatCount(statistics.documents_total), label: "documents" }];

  if (statistics.documents_inbox !== null) {
    stats.push({ value: formatCount(statistics.documents_inbox), label: "in the inbox" });
  }

  return stats;
};
