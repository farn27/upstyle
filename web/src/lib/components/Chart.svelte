<script>
  /**
   * Universal Chart component — Chart.js wrapper
   * Usage:
   *   <Chart type="bar" data={chartData} options={opts} height={300} />
   *
   * Types: bar, line, doughnut, pie, radar, polarArea
   */
  import { onMount, onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { formatRupiahShort } from '$lib/rupiah.js';

  Chart.register(...registerables);

  let {
    type = 'bar',
    data = { labels: [], datasets: [] },
    options = {},
    height = 280,
    className = '',
  } = $props();

  let canvas = $state(null);
  let chart = $state(null);

  // Default options yang bagus
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { family: 'Inter, sans-serif', size: 11 }, padding: 16, usePointStyle: true }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y ?? ctx.parsed;
            if (typeof val === 'number' && val > 1000) {
              return ' ' + formatRupiahShort(val);
            }
            return ' ' + val;
          }
        }
      }
    },
    scales: type !== 'doughnut' && type !== 'pie' && type !== 'radar' ? {
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 }, callback: (v) => formatRupiahShort(v) }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } }
      }
    } : {},
  };

  const mergedOptions = { ...defaultOptions, ...options, plugins: { ...defaultOptions.plugins, ...(options.plugins || {}) } };

  onMount(() => {
    if (!canvas) return;
    chart = new Chart(canvas, { type, data, options: mergedOptions });
  });

  onDestroy(() => chart?.destroy());

  // Reaktif update saat data berubah
  $effect(() => {
    if (!chart) return;
    chart.data = data;
    chart.update('active');
  });
</script>

<div class="relative {className}" style="height: {height}px">
  <canvas bind:this={canvas}></canvas>
</div>
