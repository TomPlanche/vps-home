<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>vps-home</title>
</svelte:head>

<h1>vps-home</h1>

<ul>
  {#each data.services as service (service.name)}
    <li>
      <a href={service.url}>{service.name}</a>
      <small>{service.group}</small>
    </li>
  {/each}
</ul>
