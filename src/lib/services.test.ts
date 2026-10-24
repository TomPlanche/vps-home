import { describe, expect, it } from "vitest";

import { groupServices, type Service } from "./services";

const service = (name: string, group: string): Service => ({
  name,
  group,
  url: `https://${name.toLowerCase()}.example.com`
});

describe("groupServices", () => {
  it("keeps the order of the file, for the groups and inside them", () => {
    const groups = groupServices([
      service("Grafana", "Monitoring"),
      service("Kuma", "Monitoring"),
      service("Immich", "Media"),
      service("Forgejo", "Code")
    ]);

    expect(groups.map((group) => group.name)).toEqual(["Monitoring", "Media", "Code"]);
    expect(groups[0].services.map((s) => s.name)).toEqual(["Grafana", "Kuma"]);
  });

  it("puts a service written apart back with its group", () => {
    const groups = groupServices([
      service("Grafana", "Monitoring"),
      service("Immich", "Media"),
      service("Kuma", "Monitoring")
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].services.map((s) => s.name)).toEqual(["Grafana", "Kuma"]);
  });

  it("has no group without services", () => {
    expect(groupServices([])).toEqual([]);
  });
});
