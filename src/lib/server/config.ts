/**
 * The services the page lists, read from a TOML file.
 *
 * The file is the only place a service is described. It is read again on each
 * request, so an edit shows up on the next reload, without a restart.
 */

import { readFile } from "node:fs/promises";

import { parse, TomlError } from "smol-toml";

import type { Service } from "$lib/services";

import { WIDGET_TYPES, type WidgetConfig, type WidgetType } from "./widgets";

/**
 * A service as the server knows it: the card, and the address it checks.
 *
 * The check address stays on the server. It is often a private one, and the
 * browser has nothing to do with it.
 */
export type ServiceConfig = Service & {
  /** The URL the server requests to tell whether the service answers, or `null` for none. */
  check: string | null;
  /** The HTTP statuses that count as up, or `null` for the default: below 400. */
  expect: number[] | null;
  /** The numbers the card shows from the API of the service, or `null` for none. */
  widget: WidgetConfig | null;
};

/** A mistake in the file, worded for whoever edits it. */
export class ConfigError extends Error {
  override name = "ConfigError";
}

/** The group of a service that does not name one. */
export const DEFAULT_GROUP = "Services";

/** Every key a `[[service]]` table may hold. Anything else is a typo. */
const KEYS = new Set([
  "name",
  "group",
  "url",
  "description",
  "host",
  "icon",
  "check",
  "expect",
  "widget"
]);

/** Every key a `[service.widget]` table may hold. */
const WIDGET_KEYS = new Set(["type", "api", "token_env"]);

const isTable = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** `url` is a link the browser follows, so anything but http(s) is a mistake. */
const isWebUrl = (value: string): boolean => {
  const url = URL.parse(value);
  return url !== null && (url.protocol === "http:" || url.protocol === "https:");
};

/**
 * Reads one optional string of a table.
 *
 * An empty string is refused rather than read as "not set": `description = ""`
 * is more likely a field left half-written than a wish for no description.
 */
const optionalText = (
  table: Record<string, unknown>,
  key: string,
  where: string
): string | undefined => {
  const value = table[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigError(`${where}: \`${key}\` must be a non-empty string`);
  }

  return value.trim();
};

const requiredText = (table: Record<string, unknown>, key: string, where: string): string => {
  const value = optionalText(table, key, where);
  if (value === undefined) {
    throw new ConfigError(`${where}: \`${key}\` is missing`);
  }

  return value;
};

/**
 * Reads `check`: left out (or `true`), the server checks `url`; `false` turns the
 * check off; a URL checks that address instead, typically a private one or a
 * health endpoint.
 */
const readCheck = (table: Record<string, unknown>, url: string, where: string): string | null => {
  const value = table.check;

  if (value === undefined || value === true) {
    return url;
  }

  if (value === false) {
    return null;
  }

  if (typeof value !== "string" || !isWebUrl(value.trim())) {
    throw new ConfigError(`${where}: \`check\` must be an http or https URL, or false`);
  }

  return value.trim();
};

/** An HTTP status: a whole number from 100 to 599. */
const isStatus = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 100 && (value as number) <= 599;

/**
 * Reads `expect`: the HTTP statuses that count as up, in place of the default
 * (below 400). A site in maintenance answers 503 on purpose, for example, and
 * `expect = [200, 503]` keeps it up in both cases.
 */
const readExpect = (
  table: Record<string, unknown>,
  check: string | null,
  where: string
): number[] | null => {
  const value = table.expect;
  if (value === undefined) {
    return null;
  }

  if (check === null) {
    throw new ConfigError(`${where}: \`expect\` has no use when \`check\` is false`);
  }

  if (!Array.isArray(value) || value.length === 0 || !value.every(isStatus)) {
    throw new ConfigError(`${where}: \`expect\` must be a list of HTTP statuses, like [200, 503]`);
  }

  return value;
};

/**
 * Reads `[service.widget]`: the type of the API, its base URL (`url` of the
 * service when left out), and the environment variable that holds its token.
 * The token itself never sits in the file.
 */
const readWidget = (
  table: Record<string, unknown>,
  url: string,
  where: string
): WidgetConfig | null => {
  const value = table.widget;
  if (value === undefined) {
    return null;
  }

  if (!isTable(value)) {
    throw new ConfigError(`${where}: \`widget\` must be a [service.widget] table`);
  }

  const at = `${where}, widget`;

  const unknown = Object.keys(value).filter((key) => !WIDGET_KEYS.has(key));
  if (unknown.length > 0) {
    throw new ConfigError(`${at}: unknown key \`${unknown[0]}\``);
  }

  const type = requiredText(value, "type", at);
  if (!(WIDGET_TYPES as readonly string[]).includes(type)) {
    throw new ConfigError(`${at}: unknown type "${type}", expected ${WIDGET_TYPES.join(" or ")}`);
  }

  const api = optionalText(value, "api", at) ?? url;
  if (!isWebUrl(api)) {
    throw new ConfigError(`${at}: \`api\` must be an http or https URL`);
  }

  const tokenEnv = requiredText(value, "token_env", at);
  if (!/^[A-Z_][A-Z0-9_]*$/.test(tokenEnv)) {
    throw new ConfigError(
      `${at}: \`token_env\` is the name of an environment variable, like PAPERLESS_TOKEN`
    );
  }

  return { type: type as WidgetType, api, tokenEnv };
};

/** Reads `icon`: an http(s) URL, or a path on this site such as `/icons/immich.svg`. */
const readIcon = (table: Record<string, unknown>, where: string): string | undefined => {
  const icon = optionalText(table, "icon", where);

  if (icon !== undefined && !isWebUrl(icon) && !icon.startsWith("/")) {
    throw new ConfigError(`${where}: \`icon\` must be an http or https URL, or a path from /`);
  }

  return icon;
};

/** "service 3", or "service 3 (Grafana)" once the name is known. */
const describe = (index: number, table: Record<string, unknown>): string =>
  typeof table.name === "string" && table.name.trim() !== ""
    ? `service ${index + 1} (${table.name.trim()})`
    : `service ${index + 1}`;

const parseService = (value: unknown, index: number): ServiceConfig => {
  if (!isTable(value)) {
    throw new ConfigError(`service ${index + 1}: expected a [[service]] table`);
  }

  const where = describe(index, value);

  const unknown = Object.keys(value).filter((key) => !KEYS.has(key));
  if (unknown.length > 0) {
    throw new ConfigError(`${where}: unknown key \`${unknown[0]}\``);
  }

  const url = requiredText(value, "url", where);
  if (!isWebUrl(url)) {
    throw new ConfigError(`${where}: \`url\` must be an http or https URL, got "${url}"`);
  }

  const check = readCheck(value, url, where);
  const expect = readExpect(value, check, where);
  const widget = readWidget(value, url, where);

  return {
    name: requiredText(value, "name", where),
    group: optionalText(value, "group", where) ?? DEFAULT_GROUP,
    url,
    description: optionalText(value, "description", where),
    host: optionalText(value, "host", where),
    icon: readIcon(value, where),
    checked: check !== null,
    check,
    expect,
    widget
  };
};

/** The card alone, without the check address, for the page data. */
export const toPublic = (service: ServiceConfig): Service => ({
  name: service.name,
  group: service.group,
  url: service.url,
  description: service.description,
  host: service.host,
  icon: service.icon,
  checked: service.checked
});

/**
 * The services of a TOML document, in the order of the file.
 *
 * @throws {ConfigError} on invalid TOML or on a service the page cannot show.
 */
export const parseServices = (source: string): ServiceConfig[] => {
  let document: Record<string, unknown>;

  try {
    document = parse(source);
  } catch (cause) {
    if (cause instanceof TomlError) {
      // The first line is the reason; the rest is a code excerpt, too long for a page.
      const reason = cause.message.split("\n")[0].replace(/^Invalid TOML document: /, "");
      throw new ConfigError(`line ${cause.line}, column ${cause.column}: ${reason}`, { cause });
    }
    throw cause;
  }

  const unknown = Object.keys(document).filter((key) => key !== "service");
  if (unknown.length > 0) {
    throw new ConfigError(`unknown top-level key \`${unknown[0]}\`, expected [[service]] tables`);
  }

  const entries = document.service ?? [];
  if (!Array.isArray(entries)) {
    throw new ConfigError("`service` must be a list of [[service]] tables");
  }

  const services = entries.map((entry, index) => parseService(entry, index));

  // The name is the key of a service everywhere else, so two cards cannot share it.
  const seen = new Set<string>();
  for (const service of services) {
    if (seen.has(service.name)) {
      throw new ConfigError(`two services are named "${service.name}"`);
    }
    seen.add(service.name);
  }

  return services;
};

/**
 * Reads and parses the services file.
 *
 * @throws {ConfigError} when the file is missing or invalid.
 */
export const loadServices = async (path: string): Promise<ServiceConfig[]> => {
  let source: string;

  try {
    source = await readFile(path, "utf8");
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") {
      throw new ConfigError(
        `no services file at ${path}: copy services.example.toml there, or set SERVICES_FILE`,
        { cause }
      );
    }
    throw cause;
  }

  try {
    return parseServices(source);
  } catch (cause) {
    if (cause instanceof ConfigError) {
      throw new ConfigError(`${path}: ${cause.message}`, { cause });
    }
    throw cause;
  }
};
