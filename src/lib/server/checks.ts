/**
 * The checks of the services: one request each, from the server.
 *
 * The server sits on the private network of the services, so it reaches the
 * addresses the browser cannot. A check asks whether something answers, not
 * whether the service works: a login page counts as much as a dashboard.
 */

import type { Check, Checks } from "$lib/checks";

import type { ServiceConfig } from "./config";

/** How long a check waits for an answer. A service slower than this is as good as down. */
export const CHECK_TIMEOUT_MS = 5000;

/** The codes of the network errors worth a word of their own. */
const REASONS: Record<string, string> = {
  ECONNREFUSED: "connection refused",
  ECONNRESET: "connection reset",
  ENOTFOUND: "unknown host",
  EAI_AGAIN: "unknown host",
  EHOSTUNREACH: "host unreachable",
  ENETUNREACH: "network unreachable",
  CERT_HAS_EXPIRED: "expired certificate",
  DEPTH_ZERO_SELF_SIGNED_CERT: "self-signed certificate",
  ERR_TLS_CERT_ALTNAME_INVALID: "certificate for another name"
};

/**
 * Why a request got no answer.
 *
 * `fetch` throws one `TypeError("fetch failed")` for every network failure, and
 * the useful part is the code of its cause.
 */
export const reasonOf = (error: unknown, timeoutMs: number): string => {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return `no answer in ${timeoutMs / 1000} s`;
  }

  const cause = error instanceof Error ? error.cause : undefined;
  if (cause instanceof Error && "code" in cause && typeof cause.code === "string") {
    return REASONS[cause.code] ?? cause.code;
  }

  return error instanceof Error ? error.message : String(error);
};

/**
 * Requests one URL and says what came back. Never throws: a failure is a result.
 *
 * `expect` lists the statuses that count as up. Left out, a status below 400 is up.
 */
export const checkUrl = async (
  url: string,
  timeoutMs = CHECK_TIMEOUT_MS,
  expect: number[] | null = null
): Promise<Check> => {
  const started = performance.now();
  const elapsed = (): number => Math.round(performance.now() - started);

  try {
    const response = await fetch(url, {
      // A redirect is an answer. The root of a service often sends to its login
      // page, and following it can leave the private network for the public one,
      // which is not what this check is about.
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "vps-home" }
    });
    const ms = elapsed();

    // Only the status matters. Dropping the body frees the connection now,
    // rather than whenever the body gets collected.
    await response.body?.cancel();

    const up = expect ? expect.includes(response.status) : response.status < 400;

    return {
      state: up ? "up" : "failing",
      status: response.status,
      ms
    };
  } catch (error) {
    return { state: "down", ms: elapsed(), reason: reasonOf(error, timeoutMs) };
  }
};

/** Checks every checked service at once, so a round takes as long as its slowest check. */
export const checkAll = async (
  services: ServiceConfig[],
  timeoutMs = CHECK_TIMEOUT_MS
): Promise<Checks> => {
  const checked = services.filter(
    (service): service is ServiceConfig & { check: string } => service.check !== null
  );

  const results = await Promise.all(
    checked.map(
      async (service) =>
        [service.name, await checkUrl(service.check, timeoutMs, service.expect)] as const
    )
  );

  return Object.fromEntries(results);
};
