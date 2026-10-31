<script lang="ts">
  import type { WidgetResult } from "$lib/widgets";

  type Props = {
    result: WidgetResult;
  };

  let { result }: Props = $props();
</script>

{#if "error" in result}
  <p class="error" title={result.error}>{result.error}</p>
{:else}
  <dl>
    {#each result.stats as stat (stat.label)}
      <div>
        <dt>{stat.label}</dt>
        <dd>{stat.value}</dd>
      </div>
    {/each}
  </dl>
{/if}

<style lang="scss">
  dl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.25rem;
  }

  div {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
  }

  // The number first on screen, the label after it, as one reads "1,284 documents".
  dd {
    order: -1;
    font-size: 1rem;
    font-variant-numeric: tabular-nums;
  }

  dt {
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    opacity: 0.5;
  }

  .error {
    font-size: 0.75rem;
    color: var(--warn);
    opacity: 0.8;
  }
</style>
