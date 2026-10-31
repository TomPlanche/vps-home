import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { checkAll, checkUrl } from "./checks";
import type { ServiceConfig } from "./config";

/** A local server with one route per kind of answer. */
let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    switch (request.url) {
      case "/ok": {
        response.end("ok");
        break;
      }
      case "/login": {
        response.writeHead(302, { location: "https://login.example.com/" }).end();
        break;
      }
      case "/broken": {
        response.writeHead(503).end();
        break;
      }
      case "/slow": {
        // Never answers: the check has to give up on its own.
        break;
      }
      default: {
        response.writeHead(404).end();
      }
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

/** A port nothing listens on: a server that closes keeps its port free for a while. */
const closedPort = async (): Promise<number> => {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const { port } = probe.address() as AddressInfo;
  await new Promise((resolve) => probe.close(resolve));
  return port;
};

describe("checkUrl", () => {
  it("finds a service that answers up", async () => {
    const check = await checkUrl(`${base}/ok`);

    expect(check).toMatchObject({ state: "up", status: 200 });
    expect(check.ms).toBeGreaterThanOrEqual(0);
  });

  it("counts a redirect as up, without following it", async () => {
    expect(await checkUrl(`${base}/login`)).toMatchObject({ state: "up", status: 302 });
  });

  it("finds a service that answers with an error failing", async () => {
    expect(await checkUrl(`${base}/broken`)).toMatchObject({ state: "failing", status: 503 });
    expect(await checkUrl(`${base}/missing`)).toMatchObject({ state: "failing", status: 404 });
  });

  it("gives up on a service that does not answer", async () => {
    const check = await checkUrl(`${base}/slow`, 100);

    expect(check).toMatchObject({ state: "down", reason: "no answer in 0.1 s" });
    expect(check.status).toBeUndefined();
  });

  it("says why nothing answered", async () => {
    const check = await checkUrl(`http://127.0.0.1:${await closedPort()}/`);

    expect(check).toMatchObject({ state: "down", reason: "connection refused" });
  });
});

const service = (name: string, check: string | null): ServiceConfig => ({
  name,
  group: "Services",
  url: "https://example.com",
  checked: check !== null,
  check,
  widget: null
});

describe("checkAll", () => {
  it("checks each checked service, by name", async () => {
    const checks = await checkAll([
      service("A", `${base}/ok`),
      service("B", `${base}/broken`),
      service("C", null)
    ]);

    expect(Object.keys(checks)).toEqual(["A", "B"]);
    expect(checks.A.state).toBe("up");
    expect(checks.B.state).toBe("failing");
  });

  it("runs the checks at once", async () => {
    const started = performance.now();
    await checkAll([service("A", `${base}/slow`), service("B", `${base}/slow`)], 200);

    // Two checks of 200 ms one after the other would take 400 ms.
    expect(performance.now() - started).toBeLessThan(350);
  });
});
