import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { ServiceConfig } from "../config";
import { endpoint } from "./api";
import { createWidgets, fetchWidget, type WidgetConfig } from "./index";

/** A fake of the APIs the widgets read, behind the prefixes /paperless, /immich and /forgejo. */
let server: Server;
let base: string;

/** The statistics the fake Paperless gives, changed by some tests. */
let paperless: { documents_total: number; documents_inbox: number | null };
/** How long the fake Paperless waits before it answers. */
let paperlessDelayMs = 0;
let paperlessReads = 0;

/** The repositories of the fake Forgejo. */
const repositories = [
  { full_name: "tom/vps-home", default_branch: "main", empty: false, mirror: false, fork: false },
  { full_name: "tom/atkuzu", default_branch: "main", empty: false, mirror: false, fork: false },
  { full_name: "tom/zed", default_branch: "main", empty: false, mirror: true, fork: false },
  { full_name: "tom/cobe", default_branch: "website", empty: false, mirror: false, fork: true },
  { full_name: "tom/notes", default_branch: "main", empty: true, mirror: false, fork: false }
];

/** The commits of the default branch of each repository of the fake Forgejo. */
const commitCounts: Record<string, number> = {
  "tom/vps-home": 15,
  "tom/atkuzu": 230,
  "tom/zed": 30_000,
  "tom/cobe": 900
};

/** The fake Forgejo gives 2 repositories a page, whatever the page size asked. */
const FORGEJO_PAGE = 2;
let forgejoSearches = 0;

const authorized = (request: IncomingMessage, header: string, value: string): boolean =>
  request.headers[header] === value;

const json = (response: ServerResponse, body: unknown): void => {
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
};

beforeAll(async () => {
  server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://fake");

    if (url.pathname === "/paperless/api/statistics/") {
      if (!authorized(request, "authorization", "Token secret")) {
        response.writeHead(401).end();
        return;
      }
      paperlessReads += 1;
      setTimeout(() => json(response, { ...paperless, tag_count: 12 }), paperlessDelayMs);
      return;
    }

    if (url.pathname === "/immich/api/server/statistics") {
      if (!authorized(request, "x-api-key", "secret")) {
        response.writeHead(401).end();
        return;
      }
      json(response, {
        photos: 48_213,
        videos: 1_904,
        usage: 412.3 * 1024 ** 3,
        usagePhotos: 300 * 1024 ** 3,
        usageVideos: 112.3 * 1024 ** 3,
        usageByUser: []
      });
      return;
    }

    if (url.pathname.startsWith("/forgejo/api/v1/repos/")) {
      if (!authorized(request, "authorization", "token secret")) {
        response.writeHead(401).end();
        return;
      }

      if (url.pathname === "/forgejo/api/v1/repos/search") {
        const page = Number(url.searchParams.get("page"));
        if (page === 1) {
          forgejoSearches += 1;
        }
        response.setHeader("x-total-count", String(repositories.length));
        json(response, {
          ok: true,
          data: repositories.slice((page - 1) * FORGEJO_PAGE, page * FORGEJO_PAGE)
        });
        return;
      }

      const commits = /^\/forgejo\/api\/v1\/repos\/(.+)\/commits$/.exec(url.pathname);
      const repository = repositories.find(
        (candidate) =>
          candidate.full_name === decodeURIComponent(commits?.[1] ?? "") &&
          candidate.default_branch === url.searchParams.get("sha")
      );
      if (repository) {
        response.setHeader("x-total-count", String(commitCounts[repository.full_name] ?? 0));
        json(response, [{}]);
        return;
      }
    }

    if (url.pathname === "/slow/api/statistics/") {
      return;
    }

    response.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(() => {
  paperless = { documents_total: 5, documents_inbox: 0 };
  paperlessDelayMs = 0;
  paperlessReads = 0;
  forgejoSearches = 0;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

const widget = (api: string): WidgetConfig => ({ type: "paperless", api, tokenEnv: "TOKEN" });

describe("endpoint", () => {
  it("keeps the path prefix of the API", () => {
    expect(endpoint("http://10.0.0.4/paperless/", "/api/statistics/")).toBe(
      "http://10.0.0.4/paperless/api/statistics/"
    );
    expect(endpoint("http://10.0.0.4:8000", "api/statistics/")).toBe(
      "http://10.0.0.4:8000/api/statistics/"
    );
  });
});

describe("paperless", () => {
  it("gives the documents and the inbox", async () => {
    paperless = { documents_total: 1284, documents_inbox: 3 };

    expect(await fetchWidget(widget(`${base}/paperless`), { TOKEN: "secret" })).toEqual({
      stats: [
        { value: "1,284", label: "documents" },
        { value: "3", label: "in the inbox" }
      ]
    });
  });

  it("leaves the inbox out when Paperless has no inbox tag", async () => {
    paperless = { documents_total: 10, documents_inbox: null };

    const result = await fetchWidget(widget(`${base}/paperless`), { TOKEN: "secret" });

    expect(result).toEqual({ stats: [{ value: "10", label: "documents" }] });
  });
});

describe("immich", () => {
  it("gives the photos, the videos and the space they take", async () => {
    const config: WidgetConfig = { type: "immich", api: `${base}/immich`, tokenEnv: "KEY" };

    expect(await fetchWidget(config, { KEY: "secret" })).toEqual({
      stats: [
        { value: "48,213", label: "photos" },
        { value: "1,904", label: "videos" },
        { value: "412 GiB", label: "used" }
      ]
    });
  });

  it("sends the key in its own header", async () => {
    const config: WidgetConfig = { type: "immich", api: `${base}/immich`, tokenEnv: "KEY" };

    expect(await fetchWidget(config, { KEY: "wrong" })).toEqual({
      error: "the API refused the token"
    });
  });
});

const forgejo = (): WidgetConfig => ({
  type: "forgejo",
  api: `${base}/forgejo`,
  tokenEnv: "TOKEN"
});

describe("forgejo", () => {
  it("counts the repositories, the mirrors, and the commits of the own repositories", async () => {
    // Every page of the search: 5 repositories, 2 a page. The commits leave out
    // the mirror (zed), the fork (cobe) and the empty repository (notes).
    expect(await fetchWidget(forgejo(), { TOKEN: "secret" })).toEqual({
      stats: [
        { value: "4", label: "repositories" },
        { value: "1", label: "mirrors" },
        { value: "245", label: "commits" }
      ]
    });
  });

  it("says when the API refuses the token", async () => {
    expect(await fetchWidget(forgejo(), { TOKEN: "wrong" })).toEqual({
      error: "the API refused the token"
    });
  });
});

describe("fetchWidget", () => {
  it("names the variable of a missing token", async () => {
    expect(await fetchWidget(widget(`${base}/paperless`), {})).toEqual({
      error: "TOKEN is not set"
    });
  });

  it("says when the API refuses the token", async () => {
    expect(await fetchWidget(widget(`${base}/paperless`), { TOKEN: "wrong" })).toEqual({
      error: "the API refused the token"
    });
  });

  it("gives the status of an API that answers with an error", async () => {
    expect(await fetchWidget(widget(`${base}/missing`), { TOKEN: "secret" })).toEqual({
      error: "the API answered 404"
    });
  });

  it("gives up on an API that does not answer", async () => {
    expect(await fetchWidget(widget(`${base}/slow`), { TOKEN: "secret" }, 100)).toEqual({
      error: "no answer in 0.1 s"
    });
  });
});

const service = (name: string, config: WidgetConfig | null): ServiceConfig => ({
  name,
  group: "Services",
  url: "https://example.com",
  checked: false,
  check: null,
  expect: null,
  widget: config
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const env = () => ({ TOKEN: "secret" });

describe("createWidgets", () => {
  it("reads the widget of each service that has one, by name", async () => {
    const readWidgets = createWidgets(env);

    const widgets = await readWidgets([
      service("Paperless", widget(`${base}/paperless`)),
      service("Docs", null)
    ]);

    expect(Object.keys(widgets)).toEqual(["Paperless"]);
  });

  it("reads Paperless again for each round", async () => {
    const readWidgets = createWidgets(env);
    const services = [service("Paperless", widget(`${base}/paperless`))];

    await readWidgets(services);
    await readWidgets(services);

    expect(paperlessReads).toBe(2);
  });

  it("keeps the numbers of Forgejo for 10 minutes", async () => {
    let time = 0;
    const readWidgets = createWidgets(env, 5000, () => time);
    const services = [service("Forgejo", forgejo())];

    await readWidgets(services);
    time += 9 * 60_000;
    await readWidgets(services);
    expect(forgejoSearches).toBe(1);

    time += 60_000;
    await readWidgets(services);
    expect(forgejoSearches).toBe(2);
  });

  it("reads again when the widget changes in the file", async () => {
    const readWidgets = createWidgets(env);

    await readWidgets([service("Forgejo", forgejo())]);
    await readWidgets([service("Forgejo", { ...forgejo(), api: `${base}/forgejo/` })]);

    expect(forgejoSearches).toBe(2);
  });

  it("goes on with the last numbers while a slow read runs", async () => {
    const readWidgets = createWidgets(env, 50);
    const services = [service("Paperless", widget(`${base}/paperless`))];
    paperless = { documents_total: 5, documents_inbox: null };

    expect(await readWidgets(services)).toMatchObject({
      Paperless: { stats: [{ value: "5", label: "documents" }] }
    });

    paperless = { documents_total: 7, documents_inbox: null };
    paperlessDelayMs = 200;
    expect(await readWidgets(services)).toMatchObject({
      Paperless: { stats: [{ value: "5", label: "documents" }] }
    });

    // The slow read lands, and the next round has its numbers.
    await sleep(300);
    paperlessDelayMs = 0;
    expect(await readWidgets(services)).toMatchObject({
      Paperless: { stats: [{ value: "7", label: "documents" }] }
    });
  });

  it("has no numbers yet for a first read slower than the wait", async () => {
    const readWidgets = createWidgets(env, 50);

    expect(await readWidgets([service("Slow", widget(`${base}/slow`))])).toEqual({});
  });
});
