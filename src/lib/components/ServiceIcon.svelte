<script lang="ts">
  import { monogram } from "$lib/services";

  type Props = {
    name: string;
    icon?: string;
  };

  let { name, icon }: Props = $props();

  /** An image that does not load gives way to the letters, rather than a broken image. */
  let broken = $state(false);
</script>

{#if icon && !broken}
  <img
    class="icon"
    src={icon}
    alt=""
    width="24"
    height="24"
    loading="lazy"
    onerror={() => (broken = true)}
  />
{:else}
  <span class="icon icon--letters" aria-hidden="true">{monogram(name)}</span>
{/if}

<style lang="scss">
  .icon {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    object-fit: contain;
  }

  .icon--letters {
    display: grid;
    place-items: center;
    border: 1px dotted var(--line);
    font-size: 0.65rem;
    letter-spacing: 0.04em;
    opacity: 0.7;
  }
</style>
