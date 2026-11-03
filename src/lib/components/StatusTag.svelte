<script lang="ts">
  import { STATE_COLORS, type Check } from "$lib/checks";

  import Tag from "$lib/components/Tag.svelte";

  type Props = {
    /** Left out while the check runs. */
    check?: Check;
  };

  let { check }: Props = $props();

  /**
   * An error status shows its code: "503" says more than "failing". An error
   * status that the services file expects keeps its code too, in the colour of
   * up: a site in maintenance, not a site in trouble.
   */
  const label = $derived(
    check === undefined
      ? "checking"
      : check.status !== undefined && check.status >= 400
        ? String(check.status)
        : check.state
  );
</script>

<Tag color={check ? STATE_COLORS[check.state] : "var(--live)"} pulse={check === undefined}>
  {label}
</Tag>
