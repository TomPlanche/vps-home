<script lang="ts">
  import type { Checks } from "$lib/checks";

  import ServiceCard from "$lib/components/ServiceCard.svelte";

  let { data } = $props();

  /** The checks once they land. Until then, every checked card says it is checking. */
  let checks = $state<Checks | undefined>(undefined);

  $effect(() => {
    let current = true;

    void data.checks.then((result) => {
      // A newer load can land first: only the checks of the current one count.
      if (current) {
        checks = result;
      }
    });

    return () => {
      current = false;
    };
  });
</script>

{#if data.groups.length === 0}
  <p class="note">
    No services yet: describe them in the services file, see services.example.toml.
  </p>
{:else}
  {#each data.groups as group (group.name)}
    <section>
      <h2>{group.name}</h2>

      <ul>
        {#each group.services as service (service.name)}
          <li>
            <ServiceCard {service} check={checks?.[service.name]} />
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
</style>
