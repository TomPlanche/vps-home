/**
 * Forgejo: the repositories, the mirrors, and the commits.
 *
 * The token is an access token of a user (Settings, Applications) with the
 * `read:repository` scope. The widget sees the repositories that this user
 * sees, private ones included.
 *
 * - repositories: every repository but the mirrors.
 * - mirrors: the copies that Forgejo keeps in sync with another server.
 * - commits: the commits of the default branch of each repository that is
 *   neither a mirror nor a fork. The history of a mirror or of a fork is
 *   mostly the work of someone else.
 *
 * The commits take one request per repository, so the widget reads them a few
 * at a time, and `index.ts` reads this widget every 10 minutes at most.
 */

import type { Stat } from "$lib/widgets";
import { formatCount } from "$lib/format";

import { endpoint, get, type Reader } from "./api";

/** The part of a repository of `GET /api/v1/repos/search` that the widget reads. */
type Repository = {
  full_name: string;
  default_branch: string;
  empty: boolean;
  fork: boolean;
  mirror: boolean;
};

/** The repositories asked for in one page. The server can give fewer. */
const PAGE_SIZE = 50;

/** How many commit counts run at once: quick enough, and light on a small server. */
const PARALLEL = 4;

/** The total of a list, from the `X-Total-Count` header, or `undefined` without it. */
const totalOf = (response: Response): number | undefined => {
  const total = Number.parseInt(response.headers.get("x-total-count") ?? "", 10);
  return Number.isNaN(total) ? undefined : total;
};

/** One page of `GET /api/v1/repos/search`, with the total of the list. */
const searchPage = async (
  api: string,
  page: number,
  headers: Record<string, string>,
  signal: AbortSignal
): Promise<{ data: Repository[]; total: number | undefined }> => {
  const query = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
  const response = await get(endpoint(api, `/api/v1/repos/search?${query}`), headers, signal);
  const { data } = (await response.json()) as { data: Repository[] };

  return { data, total: totalOf(response) };
};

/**
 * Every repository, page by page.
 *
 * The first page gives the total and the real size of a page, which the
 * config of the server can make smaller than asked. The other pages then load
 * at the same time. Without a total, the first page is all there is.
 */
const listRepositories = async (
  api: string,
  headers: Record<string, string>,
  signal: AbortSignal
): Promise<Repository[]> => {
  const first = await searchPage(api, 1, headers, signal);
  if (first.total === undefined || first.data.length === 0 || first.data.length >= first.total) {
    return first.data;
  }

  const pages = Math.ceil(first.total / first.data.length);
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) => searchPage(api, index + 2, headers, signal))
  );

  return [...first.data, ...rest.flatMap((page) => page.data)];
};

/** The commits of the default branch: the total of a list of one commit. */
const countCommits = async (
  api: string,
  repository: Repository,
  headers: Record<string, string>,
  signal: AbortSignal
): Promise<number> => {
  const path = repository.full_name
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  // `stat`, `verification`, `files`: the details of the commit, which cost
  // the server time and which the count does not need.
  const query = new URLSearchParams({
    sha: repository.default_branch,
    limit: "1",
    stat: "false",
    verification: "false",
    files: "false"
  });

  const response = await get(
    endpoint(api, `/api/v1/repos/${path}/commits?${query}`),
    headers,
    signal
  );
  await response.body?.cancel();

  return totalOf(response) ?? 0;
};

/** `run` on each item, `limit` at a time. */
const eachLimited = async <T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = [];
  let next = 0;

  // A worker takes the next item when it is done with its last one.
  const worker = async (): Promise<void> => {
    if (next >= items.length) {
      return;
    }

    const index = next;
    next += 1;
    results[index] = await run(items[index]);
    return worker();
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
};

export const readForgejo: Reader = async (api, token, signal) => {
  const headers = { authorization: `token ${token}` };
  const repositories = await listRepositories(api, headers, signal);

  const mirrors = repositories.filter((repository) => repository.mirror).length;
  const own = repositories.filter(
    (repository) => !repository.mirror && !repository.fork && !repository.empty
  );
  const counts = await eachLimited(own, PARALLEL, (repository) =>
    countCommits(api, repository, headers, signal)
  );

  const stats: Stat[] = [
    { value: formatCount(repositories.length - mirrors), label: "repositories" }
  ];
  if (mirrors > 0) {
    stats.push({ value: formatCount(mirrors), label: "mirrors" });
  }
  stats.push({
    value: formatCount(counts.reduce((sum, count) => sum + count, 0)),
    label: "commits"
  });

  return stats;
};
