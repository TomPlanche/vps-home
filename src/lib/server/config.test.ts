import { readFile } from "node:fs/promises";

import { stringify } from "smol-toml";
import { describe, expect, it } from "vitest";

import { ConfigError, DEFAULT_GROUP, loadServices, parseServices, toPublic } from "./config";

/** A services file of these tables, so each case reads as data rather than as TOML. */
const file = (...services: Record<string, unknown>[]): string => stringify({ service: services });

const grafana = { name: "Grafana", url: "https://grafana.example.com" };

describe("parseServices", () => {
  it("reads the services in the order of the file", () => {
    const services = parseServices(
      file(
        { ...grafana, group: "Monitoring", description: "Dashboards", host: "home" },
        { name: "Forgejo", url: "http://10.0.0.4:3000" }
      )
    );

    expect(services).toEqual([
      {
        name: "Grafana",
        group: "Monitoring",
        url: "https://grafana.example.com",
        description: "Dashboards",
        host: "home",
        checked: true,
        check: "https://grafana.example.com",
        widget: null
      },
      {
        name: "Forgejo",
        group: DEFAULT_GROUP,
        url: "http://10.0.0.4:3000",
        description: undefined,
        host: undefined,
        checked: true,
        check: "http://10.0.0.4:3000",
        widget: null
      }
    ]);
  });

  it("reads an empty file as no services", () => {
    expect(parseServices("")).toEqual([]);
  });

  it("trims the strings", () => {
    const [service] = parseServices(file({ ...grafana, name: "  Grafana " }));

    expect(service.name).toBe("Grafana");
  });

  it.each([
    ["a missing name", { url: grafana.url }, "service 1: `name` is missing"],
    ["a missing url", { name: "A" }, "service 1 (A): `url` is missing"],
    ["an empty string", { ...grafana, host: "" }, "`host` must be a non-empty string"],
    ["a number for a string", { ...grafana, name: 3 }, "`name` must be a non-empty string"],
    ["a url that is not http", { ...grafana, url: "ftp://a.example.com" }, "http or https URL"],
    ["a url that is not a url", { ...grafana, url: "photos" }, "http or https URL"],
    ["an unknown key", { ...grafana, link: "x" }, "unknown key `link`"],
    ["a check that is not a url", { ...grafana, check: "health" }, "`check` must be"],
    ["a check that is a number", { ...grafana, check: 200 }, "`check` must be"]
  ])("refuses %s", (_, service, message) => {
    expect(() => parseServices(file(service))).toThrow(message);
  });

  it.each([
    ["left out", {}, "https://grafana.example.com"],
    ["true", { check: true }, "https://grafana.example.com"],
    ["false", { check: false }, null],
    ["a URL", { check: " http://10.0.0.4:3030/api/health " }, "http://10.0.0.4:3030/api/health"]
  ])("reads a check %s", (_, fields, check) => {
    const [service] = parseServices(file({ ...grafana, ...fields }));

    expect(service.check).toBe(check);
    expect(service.checked).toBe(check !== null);
  });

  it("refuses two services with the same name", () => {
    expect(() => parseServices(file(grafana, grafana))).toThrow(
      `two services are named "${grafana.name}"`
    );
  });

  it("refuses a top-level key other than service", () => {
    expect(() => parseServices(stringify({ title: "Home" }))).toThrow(
      "unknown top-level key `title`"
    );
  });

  it("refuses a service that is not a table", () => {
    expect(() => parseServices(stringify({ service: "Grafana" }))).toThrow(ConfigError);
  });

  it("gives the line of a TOML syntax error", () => {
    const broken = `[[service]]
name = "Grafana`;

    expect(() => parseServices(broken)).toThrow(/^line 2, column \d+: /);
  });
});

describe("widget", () => {
  const paperless = { name: "Paperless", url: "http://10.0.0.4:8000" };

  it("reads a widget, with the URL of the service for its API", () => {
    const [service] = parseServices(
      file({ ...paperless, widget: { type: "paperless", token_env: "PAPERLESS_TOKEN" } })
    );

    expect(service.widget).toEqual({
      type: "paperless",
      api: "http://10.0.0.4:8000",
      tokenEnv: "PAPERLESS_TOKEN"
    });
  });

  it("reads the URL of an API of its own", () => {
    const [service] = parseServices(
      file({
        ...paperless,
        widget: { type: "paperless", api: "http://10.0.0.4:8010", token_env: "TOKEN" }
      })
    );

    expect(service.widget?.api).toBe("http://10.0.0.4:8010");
  });

  it.each([
    ["a widget that is not a table", "paperless", "must be a [service.widget] table"],
    ["an unknown type", { type: "plex", token_env: "T" }, /unknown type "plex"/],
    ["a missing token variable", { type: "paperless" }, "`token_env` is missing"],
    ["a token in place of a variable", { type: "paperless", token_env: "abc123" }, "the name of"],
    ["an unknown key", { type: "paperless", token_env: "T", token: "abc" }, "unknown key `token`"]
  ])("refuses %s", (_, widget, message) => {
    expect(() => parseServices(file({ ...paperless, widget }))).toThrow(message);
  });

  it("names the widget in an error", () => {
    expect(() => parseServices(file({ ...paperless, widget: { type: "paperless" } }))).toThrow(
      "service 1 (Paperless), widget: `token_env` is missing"
    );
  });
});

describe("toPublic", () => {
  it("leaves the check address on the server", () => {
    const [service] = parseServices(file({ ...grafana, check: "http://10.0.0.4:3030/api/health" }));

    expect(toPublic(service)).not.toHaveProperty("check");
    expect(JSON.stringify(toPublic(service))).not.toContain("10.0.0.4");
  });
});

describe("loadServices", () => {
  it("names the file and the way out when it is missing", async () => {
    await expect(loadServices("/nowhere/services.toml")).rejects.toThrow(
      "no services file at /nowhere/services.toml"
    );
  });

  it("names the file in a parse error", async () => {
    const path = new URL("./fixtures/duplicate.toml", import.meta.url).pathname;

    await expect(loadServices(path)).rejects.toThrow(`${path}: two services are named "A"`);
  });
});

describe("services.example.toml", () => {
  it("stays a valid services file", async () => {
    const example = new URL("../../../services.example.toml", import.meta.url);

    expect(parseServices(await readFile(example, "utf8")).length).toBeGreaterThan(0);
  });
});
