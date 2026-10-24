<script lang="ts">
  import type { Service } from "$lib/services";

  import Tag from "$lib/components/Tag.svelte";

  type Props = {
    service: Service;
  };

  let { service }: Props = $props();

  /** The address without its scheme: what tells two instances apart at a glance. */
  const address = $derived(URL.parse(service.url)?.host ?? service.url);
</script>

<!-- `external`: the service is another site, so the browser follows the link itself. -->
<a class="card" href={service.url} rel="external">
  <header>
    <h3>{service.name}</h3>

    {#if service.host}
      <Tag color="var(--idle)">{service.host}</Tag>
    {/if}
  </header>

  {#if service.description}
    <p class="description">{service.description}</p>
  {/if}

  <p class="address">{address}</p>
</a>

<style lang="scss">
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    height: 100%;

    padding: 1rem 1.15rem;
    border: 1px dotted var(--line);
    background: var(--bg-raised);

    opacity: 0.9;
    transition:
      opacity 0.15s ease,
      border-color 0.15s ease;

    &:hover {
      opacity: 1;
      border-style: solid;
      border-color: currentcolor;
    }
  }

  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  h3 {
    font-size: 1.05rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    overflow-wrap: anywhere;
  }

  .description {
    font-size: 0.8rem;
    opacity: 0.6;
  }

  .address {
    margin-top: auto;
    font-size: 0.75rem;
    opacity: 0.4;
    overflow-wrap: anywhere;
  }
</style>
