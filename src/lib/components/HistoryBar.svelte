<script lang="ts">
  import { HISTORY_SIZE, STATE_COLORS, type HistoryEntry } from "$lib/checks";
  import { formatClock, formatMs } from "$lib/format";

  type Props = {
    /** The last checks, oldest first. */
    entries: HistoryEntry[];
  };

  let { entries }: Props = $props();

  /**
   * More than this between two checks means no page asked for checks in
   * between: the bar leaves a little room there rather than joining them.
   */
  const GAP_MS = 90_000;

  /** Empty slots on the left, so the latest check always sits at the right edge. */
  const empty = $derived(Math.max(0, HISTORY_SIZE - entries.length));

  const label = $derived.by(() => {
    const up = entries.filter((entry) => entry.state === "up").length;
    return `last ${entries.length} checks: ${up} up, ${entries.length - up} with a problem`;
  });
</script>

<div class="bar" role="img" aria-label={label}>
  {#each { length: empty }, index (index)}
    <span class="slot"></span>
  {/each}
  {#each entries as entry, index (entry.at)}
    <span
      class="slot slot--filled"
      class:slot--after-gap={index > 0 && entry.at - entries[index - 1].at > GAP_MS}
      style:background={STATE_COLORS[entry.state]}
      title="{formatClock(entry.at)}: {entry.state}, {formatMs(entry.ms)}"
    ></span>
  {/each}
</div>

<style lang="scss">
  .bar {
    display: flex;
    gap: 2px;
    height: 0.9rem;
  }

  .slot {
    flex: 1;
    min-width: 2px;
    background: color-mix(in srgb, currentcolor 8%, transparent);
  }

  .slot--filled {
    opacity: 0.75;

    &:hover {
      opacity: 1;
    }
  }

  .slot--after-gap {
    margin-left: 4px;
  }
</style>
