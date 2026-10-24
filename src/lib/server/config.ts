/**
 * The services the page lists, read from a TOML file.
 *
 * The file is the only place a service is described. It is read again on each
 * request, so an edit shows up on the next reload, without a restart.
 */

import { readFile } from "node:fs/promises";

import { parse, TomlError } from "smol-toml";

import type { Service } from "$lib/services";

/** A mistake in the file, worded for whoever edits it. */
export class ConfigError extends Error {
  override name = "ConfigError";
}

/** The group of a service that does not name one. */
export const DEFAULT_GROUP = "Services";

/** Every key a `[[service]]` table may hold. Anything else is a typo. */
const KEYS = new Set(["name", "group", "url", "description", "host"]);

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

/** "service 3", or "service 3 (Grafana)" once the name is known. */
const describe = (index: number, table: Record<string, unknown>): string =>
  typeof table.name === "string" && table.name.trim() !== ""
    ? `service ${index + 1} (${table.name.trim()})`
    : `service ${index + 1}`;

const parseService = (value: unknown, index: number): Service => {
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

  return {
    name: requiredText(value, "name", where),
    group: optionalText(value, "group", where) ?? DEFAULT_GROUP,
    url,
    description: optionalText(value, "description", where),
    host: optionalText(value, "host", where)
  };
};

/**
 * The services of a TOML document, in the order of the file.
 *
 * @throws {ConfigError} on invalid TOML or on a service the page cannot show.
 */
export const parseServices = (source: string): Service[] => {
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
export const loadServices = async (path: string): Promise<Service[]> => {
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
