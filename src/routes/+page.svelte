<script lang="ts">
  import ServiceCard from "$lib/components/ServiceCard.svelte";

  let { data } = $props();
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
            <ServiceCard {service} />
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
