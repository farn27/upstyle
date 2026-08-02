<script>
  import { onMount } from 'svelte';
  import { isTauri, getAppVersion } from '$lib/tauri.js';

  let appVersion = $state('');
  let isDesktop = $state(false);

  onMount(async () => {
    isDesktop = isTauri();
    if (isDesktop) {
      appVersion = await getAppVersion();
    }
  });

  async function minimizeWindow() {
    if (!isTauri()) return;
    const pkg = '@tauri-apps' + '/api/window';
    const { getCurrentWindow } = await import(/* @vite-ignore */ pkg);
    await getCurrentWindow().minimize();
  }

  async function maximizeWindow() {
    if (!isTauri()) return;
    const pkg = '@tauri-apps' + '/api/window';
    const { getCurrentWindow } = await import(/* @vite-ignore */ pkg);
    const win = getCurrentWindow();
    const isMax = await win.isMaximized();
    isMax ? await win.unmaximize() : await win.maximize();
  }

  async function closeWindow() {
    if (!isTauri()) return;
    const pkg = '@tauri-apps' + '/api/window';
    const { getCurrentWindow } = await import(/* @vite-ignore */ pkg);
    await getCurrentWindow().close();
  }
</script>

{#if isDesktop}
  <div
    class="desktop-titlebar"
    data-tauri-drag-region
    role="banner"
  >
    <div class="titlebar-left" data-tauri-drag-region>
      <span class="titlebar-logo">⚡</span>
      <span class="titlebar-title" data-tauri-drag-region>Upstyle</span>
      {#if appVersion}
        <span class="titlebar-version">v{appVersion}</span>
      {/if}
    </div>

    <div class="titlebar-controls">
      <button
        class="titlebar-btn minimize"
        onclick={minimizeWindow}
        aria-label="Minimize"
        title="Minimize"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
          <rect width="10" height="1" />
        </svg>
      </button>

      <button
        class="titlebar-btn maximize"
        onclick={maximizeWindow}
        aria-label="Maximize"
        title="Maximize"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2">
          <rect x="0.6" y="0.6" width="8.8" height="8.8" />
        </svg>
      </button>

      <button
        class="titlebar-btn close"
        onclick={closeWindow}
        aria-label="Close"
        title="Minimize to tray"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" stroke-width="1.5">
          <line x1="1" y1="1" x2="9" y2="9" />
          <line x1="9" y1="1" x2="1" y2="9" />
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .desktop-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    padding: 0 8px 0 12px;
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
    user-select: none;
    -webkit-user-select: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
  }

  .titlebar-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
  }

  .titlebar-logo {
    font-size: 14px;
  }

  .titlebar-title {
    font-size: 12px;
    font-weight: 600;
    color: #f1f5f9;
    letter-spacing: 0.02em;
  }

  .titlebar-version {
    font-size: 10px;
    color: #64748b;
    padding: 1px 5px;
    background: #1e293b;
    border-radius: 3px;
  }

  .titlebar-controls {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .titlebar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: #94a3b8;
    transition: background 0.15s, color 0.15s;
    padding: 0;
  }

  .titlebar-btn:hover {
    background: #1e293b;
    color: #f1f5f9;
  }

  .titlebar-btn.close:hover {
    background: #dc2626;
    color: #fff;
  }

  .titlebar-btn.minimize:hover,
  .titlebar-btn.maximize:hover {
    background: #334155;
  }
</style>
