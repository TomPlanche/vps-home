<script lang="ts">
  import { formatClock } from "$lib/format";
  import { createLiveChecks, REFRESH_MS } from "$lib/live-checks.svelte";

  import ServiceCard from "$lib/components/ServiceCard.svelte";

  let { data } = $props();

  /** Until the first round lands, every checked card says it is checking. */
  const live = createLiveChecks();

  $effect(() => live.receive(data.checks));
  $effect(() => live.start(REFRESH_MS));
</script>

{#if data.groups.length === 0}
  <p class="note">
    No services yet: describe them in the services file, see services.example.toml.
  </p>
{:else}
  <p class="meta">
    <span>
      {#if live.updatedAt}
        checked at <time>{formatClock(live.updatedAt)}</time>, every {REFRESH_MS / 1000} s
      {:else}
        checking...
      {/if}
    </span>

    {#if live.error}
      <span class="error">last refresh failed: {live.error}</span>
    {/if}
  </p>

  {#each data.groups as group (group.name)}
    <section>
      <h2>{group.name}</h2>

      <ul>
        {#each group.services as service (service.name)}
          <li>
            <ServiceCard {service} check={live.checks?.[service.name]} />
          </li>
        {/each}
      </ul>
    </section>
  {/each}
{/if}

<style lang="scss">
  section + section {
    margin-top: 2.5rem;
  }

  h2 {
    margin-bottom: 1rem;
    font-size: 0.7rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    opacity: 0.5;
  }

  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
    gap: 1rem;
  }

  .note {
    opacity: 0.6;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1rem;
    margin-bottom: 1.5rem;
    font-size: 0.75rem;
    opacity: 0.5;

    time {
      font-variant-numeric: tabular-nums;
    }
  }

  .error {
    color: var(--fail);
  }
</style>
