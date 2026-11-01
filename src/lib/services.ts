/**
 * What the page knows about a service, shared by the server and the browser.
 *
 * The server reads the services in `$lib/server/config`; this module holds only
 * their shape, so the components can use it without pulling server code along.
 */

/** One card of the page. */
export type Service = {
  /** What the card says. Unique in the file. */
  name: string;
  /** The section the card sits in. */
  group: string;
  /** Where the card links to: the address the browser opens. */
  url: string;
  /** A line under the name. */
  description?: string;
  /** The machine the service runs on. */
  host?: string;
  /** An image for the card: a URL, or a path on this site. */
  icon?: string;
  /** Whether the server checks it, so whether the card has a status at all. */
  checked: boolean;
};

/** One section of the page: a group name and its services. */
export type ServiceGroup = {
  name: string;
  services: Service[];
};

/**
 * The services, cut into their groups.
 *
 * A group sits where its first service is in the file, so the page keeps the
 * order of the file. A service written apart from the rest of its group still
 * joins them, rather than opening a second section with the same name.
 */
export const groupServices = (services: Service[]): ServiceGroup[] => {
  const groups = new Map<string, Service[]>();

  for (const service of services) {
    const group = groups.get(service.group);
    if (group) {
      group.push(service);
    } else {
      groups.set(service.group, [service]);
    }
  }

  return [...groups].map(([name, members]) => ({ name, services: members }));
};

/**
 * The letters of a card without an icon: the initials of a name of several
 * words ("Uptime Kuma" gives "UK"), the first two letters of a single word
 * ("Grafana" gives "Gr").
 */
export const monogram = (name: string): string => {
  const words = name.split(/[\s_-]+/).filter((word) => word !== "");

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  const [word = "?"] = words;
  return word[0].toUpperCase() + (word[1] ?? "").toLowerCase();
};
