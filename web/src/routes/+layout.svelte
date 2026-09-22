<script>
  import "../app.css";
  import { isTauri } from '$lib/tauri.js';
  import { onMount } from 'svelte';

  let { children } = $props();

  let isDesktop = $state(false);

  onMount(() => {
    isDesktop = isTauri();
  });
</script>

{@render children()}
