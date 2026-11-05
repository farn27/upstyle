<script>
	export let form = null;
</script>

{#if form?.error}
	<div role="alert" class="mb-4 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 px-4 py-3 text-sm font-medium text-rose-800 dark:text-rose-200">
		{form.error}
	</div>
{:else if form?.pesan}
	<div role="status" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-4 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-200">
		{form.pesan}
	</div>
{/if}
