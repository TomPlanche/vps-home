<script lang="ts">
  import "$lib/styles/main.scss";

  import { resolve } from "$app/paths";

  let { children } = $props();
</script>

<svelte:head>
  <title>vps-home</title>
  <meta name="description" content="The services of my servers." />
</svelte:head>

<header>
  <a href={resolve("/")}>
    <h1>vps-home</h1>
  </a>
</header>

<main>
  {@render children()}
</main>

<style lang="scss">
  header {
    display: flex;
    align-items: baseline;
    gap: 1.5rem;

    padding: 1.25rem var(--gutter);
    border-bottom: 1px dotted var(--line);
  }

  h1 {
    font-size: 1.35rem;
    font-weight: 500;
    letter-spacing: 0.06em;
  }

  main {
    flex: 1;
    width: 100%;
    max-width: 80rem;
    margin: 0 auto;
    padding: 1.5rem var(--gutter) 3rem;
  }
</style>
