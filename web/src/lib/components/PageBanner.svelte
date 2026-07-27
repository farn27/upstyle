<script>
	export let title = 'Page Title';
	export let subtitle = 'Page subtitle goes here.';
	export let badge = '';
</script>

<div class="relative w-full py-2 pb-4 mb-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
	<div class="flex-1 min-w-0">
		<div class="flex items-center gap-2.5 flex-wrap">
			<h1 class="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
				{title}
			</h1>
			{#if badge}
				<span class="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide border border-slate-200 dark:border-slate-700">
					{badge}
				</span>
			{/if}
		</div>
		{#if subtitle}
			<p class="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
				{subtitle}
			</p>
		{/if}
	</div>

	<div class="flex items-center justify-end shrink-0">
		<slot name="actions" />
	</div>
</div>
