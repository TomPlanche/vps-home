<script lang="ts">
  import type { Check, CheckState } from "$lib/checks";

  import Tag from "$lib/components/Tag.svelte";

  type Props = {
    /** Left out while the check runs. */
    check?: Check;
  };

  let { check }: Props = $props();

  const COLORS: Record<CheckState, string> = {
    up: "var(--ok)",
    failing: "var(--warn)",
    down: "var(--fail)"
  };

  /** A failing service shows its status code: "503" says more than "failing". */
  const label = $derived(
    check === undefined
      ? "checking"
      : check.state === "failing"
        ? String(check.status)
        : check.state
  );
</script>

<Tag color={check ? COLORS[check.state] : "var(--live)"} pulse={check === undefined}>
  {label}
</Tag>
