<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { buildNavItems } from '$lib/navItems.js';
	import {
		LayoutDashboard,
		Package,
		ShoppingCart,
		Users,
		Database,
		BookOpen,
		Book,
		ArrowUpRight,
		ArrowDownLeft,
		FileBarChart,
		Target,
		Megaphone,
		LifeBuoy,
		ShoppingBag,
		Settings,
		Building,
		Plus,
		X,
		HelpCircle,
		Handshake
	} from 'lucide-svelte';

	export let isOpen = false;

	$: slug = $page.params.slug || '';

	const iconMap = {
		dashboard: LayoutDashboard,
		package: Package,
		cart: ShoppingCart,
		users: Users,
		crm: Handshake,
		database: Database,
		journal: BookOpen,
		ledger: Book,
		receivable: ArrowUpRight,
		payable: ArrowDownLeft,
		report: FileBarChart,
		sales: Target,
		marketing: Megaphone,
		support: LifeBuoy,
		ecommerce: ShoppingBag,
		settings: Settings,
		help: HelpCircle,
		building: Building,
		plus: Plus
	};

	$: menuItems = buildNavItems(slug).map((item) => ({
		...item,
		icon: iconMap[item.iconKey] || LayoutDashboard
	}));

	$: validItems = menuItems.filter((item) => {
		if (!slug) {
			const isUnitSpecific =
				item.path.includes('/finance/') ||
				item.path.includes('/sales/') ||
				item.path.includes('/marketing/') ||
				item.path.includes('/customer-service/') ||
				item.path.includes('/ecommerce/');

			if (isUnitSpecific) {
				if (item.path === '/finance/create') return true;
				return false;
			}
		}
		return true;
	});

	$: grouped = validItems.reduce((acc, item) => {
		if (!acc[item.cat]) acc[item.cat] = [];
		acc[item.cat].push(item);
		return acc;
	}, {});

	function navigateTo(path) {
		isOpen = false;
		goto(path);
	}

	function isPathActive(path) {
		const [base, query] = path.split('?');
		if (query) {
			const params = new URLSearchParams(query);
			for (const [k, v] of params) {
				if ($page.url.searchParams.get(k) !== v) return false;
			}
			return $page.url.pathname === base || $page.url.pathname.startsWith(base + '/');
		}
		return $page.url.pathname === base || ($page.url.pathname.startsWith(base + '/') && base !== `/finance/${slug}`);
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-[300] flex">
		<div
			class="fixed inset-0 bg-slate-900/60 transition-opacity"
			in:fade={{ duration: 200 }}
			out:fade={{ duration: 200 }}
			role="button"
			tabindex="-1"
			aria-label="Tutup sidebar"
			on:click={() => (isOpen = false)}
			on:keydown={(e) => e.key === 'Escape' && (isOpen = false)}
		></div>

		<div
			in:fly={{ x: -320, duration: 300, opacity: 1 }}
			out:fly={{ x: -320, duration: 300, opacity: 1 }}
			class="relative w-80 max-w-full h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col z-10"
		>
			<div class="px-6 h-16 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
				<div class="flex items-center gap-3">
					<div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">B</div>
					<span class="text-base font-bold tracking-tight text-slate-800 dark:text-white">Bizgrow</span>
				</div>
				<button
					on:click={() => (isOpen = false)}
					class="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<div class="flex-1 overflow-y-auto no-scrollbar py-4 px-4 space-y-6">
				{#each Object.entries(grouped) as [cat, items]}
					<div class="space-y-1">
						<h3 class="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{cat}</h3>

						{#each items as item}
							{@const isActive = isPathActive(item.path)}
							<div class="w-full flex flex-col">
								<button
									on:click={() => navigateTo(item.path)}
									class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group
										{isActive
										? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-indigo-800/50'
										: 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white border border-transparent'}"
								>
									<div
										class="shrink-0 p-1.5 rounded-lg transition-colors
										{isActive
										? 'bg-indigo-100 dark:bg-indigo-800/60 text-indigo-700 dark:text-indigo-300'
										: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-500'}"
									>
										<svelte:component this={item.icon} class="w-4 h-4" />
									</div>
									<div class="text-left flex-1 min-w-0">
										<p class="text-sm font-semibold truncate leading-tight">{item.name}</p>
										<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-snug line-clamp-2">{item.desc}</p>
									</div>
								</button>

								{#if item.subItems?.length}
									<div class="ml-10 mt-1 mb-2 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 pl-2">
										{#each item.subItems as sub}
											<a
												href={sub.path}
												on:click={() => (isOpen = false)}
												class="block text-xs font-medium py-1.5 px-2 rounded-lg transition-colors
													{isPathActive(sub.path)
													? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
													: 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/80'}"
											>
												{sub.name}
											</a>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/each}
			</div>

			<div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
				<p class="text-center text-xs font-medium text-slate-400 dark:text-slate-500">UpStyle ERP v1.0</p>
			</div>
		</div>
	</div>
{/if}
