<script lang="ts">
  import type { Check } from "$lib/checks";
  import { formatMs } from "$lib/format";
  import type { Service } from "$lib/services";

  import StatusTag from "$lib/components/StatusTag.svelte";
  import Tag from "$lib/components/Tag.svelte";

  type Props = {
    service: Service;
    /** Its last check, or nothing while the first one runs. */
    check?: Check;
  };

  let { service, check }: Props = $props();

  /** The address without its scheme: what tells two instances apart at a glance. */
  const address = $derived(URL.parse(service.url)?.host ?? service.url);
</script>

<!-- `external`: the service is another site, so the browser follows the link itself. -->
<a
  class="card"
  class:card--failing={check?.state === "failing"}
  class:card--down={check?.state === "down"}
  href={service.url}
  rel="external"
>
  <header>
    <h3>{service.name}</h3>

    <div class="tags">
      {#if service.host}
        <Tag color="var(--idle)">{service.host}</Tag>
      {/if}
      {#if service.checked}
        <StatusTag {check} />
      {/if}
    </div>
  </header>

  {#if service.description}
    <p class="description">{service.description}</p>
  {/if}

  <footer>
    <span class="address">{address}</span>

    {#if check}
      <span class="timing" class:timing--down={check.state === "down"} title={check.reason}>
        {check.reason ?? formatMs(check.ms)}
      </span>
    {/if}
  </footer>
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

  .card--failing {
    border-color: color-mix(in srgb, var(--warn) 55%, transparent);
  }

  .card--down {
    border-color: color-mix(in srgb, var(--fail) 55%, transparent);
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

  .tags {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .description {
    font-size: 0.8rem;
    opacity: 0.6;
  }

  footer {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: auto;
    font-size: 0.75rem;
  }

  .address {
    opacity: 0.4;
    overflow-wrap: anywhere;
  }

  .timing {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    opacity: 0.5;
  }

  .timing--down {
    color: var(--fail);
    opacity: 0.9;
  }
</style>
