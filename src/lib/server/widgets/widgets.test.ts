import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ServiceConfig } from "../config";
import { endpoint } from "./api";
import { fetchWidget, fetchWidgets, type WidgetConfig } from "./index";

/** A fake of the APIs the widgets read, behind the prefixes /paperless and /immich. */
let server: Server;
let base: string;

/** The statistics the fake Paperless gives, changed by some tests. */
let paperless: { documents_total: number; documents_inbox: number | null };

const authorized = (request: IncomingMessage, header: string, value: string): boolean =>
  request.headers[header] === value;

beforeAll(async () => {
  server = createServer((request, response) => {
    if (request.url === "/paperless/api/statistics/") {
      if (!authorized(request, "authorization", "Token secret")) {
        response.writeHead(401).end();
        return;
      }
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ ...paperless, tag_count: 12 }));
      return;
    }

    if (request.url === "/immich/api/server/statistics") {
      if (!authorized(request, "x-api-key", "secret")) {
        response.writeHead(401).end();
        return;
      }
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          photos: 48_213,
          videos: 1_904,
          usage: 412.3 * 1024 ** 3,
          usagePhotos: 300 * 1024 ** 3,
          usageVideos: 112.3 * 1024 ** 3,
          usageByUser: []
        })
      );
      return;
    }

    if (request.url === "/slow/api/statistics/") {
      return;
    }

    response.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
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
  widget: config
});

describe("fetchWidgets", () => {
  it("reads the widget of each service that has one, by name", async () => {
    paperless = { documents_total: 5, documents_inbox: 0 };

    const widgets = await fetchWidgets(
      [service("Paperless", widget(`${base}/paperless`)), service("Docs", null)],
      { TOKEN: "secret" }
    );

    expect(Object.keys(widgets)).toEqual(["Paperless"]);
  });
});
