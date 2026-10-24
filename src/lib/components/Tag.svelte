<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    /** Text and border colour. Left out, the tag inherits its container's. */
    color?: string;
    /** A filled dot before the label, for a state that is happening right now. */
    pulse?: boolean;
    children: Snippet;
  };

  let { color, pulse = false, children }: Props = $props();
</script>

<span class="tag" style:color style:border-color={color}>
  {#if pulse}
    <span class="dot" aria-hidden="true"></span>
  {/if}
  {@render children()}
</span>

<style lang="scss">
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    flex-shrink: 0;

    padding: 0.25rem 0.45rem 0.15rem;
    border: 1px dotted currentcolor;
    background: color-mix(in srgb, currentcolor 15%, transparent);

    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;

    @supports (text-box: trim-both cap alphabetic) {
      text-box: trim-both cap alphabetic;
      padding: 0.35rem 0.45rem;
    }
  }

  .dot {
    width: 0.4em;
    height: 0.4em;
    border-radius: 50%;
    background: currentcolor;
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse {
    50% {
      opacity: 0.2;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dot {
      animation: none;
    }
  }
</style>
