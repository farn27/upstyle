<script>
  import "../app.css";
  import DesktopTitleBar from '$lib/components/DesktopTitleBar.svelte';
  import { isTauri } from '$lib/tauri.js';
  import { onMount } from 'svelte';

  let { children } = $props();

  let isDesktop = $state(false);

  onMount(() => {
    isDesktop = isTauri();
    // Tambah padding-top di body kalau desktop (untuk titlebar custom 32px)
    if (isDesktop) {
      document.body.style.paddingTop = '32px';
    }
  });
</script>

<DesktopTitleBar />
{@render children()}
