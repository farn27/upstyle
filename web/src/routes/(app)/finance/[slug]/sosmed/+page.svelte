<script>
    import { enhance } from '$app/forms';
    import { toastPesan } from '$lib/notifStore';
    import { page } from '$app/stores';
    export let data;
    const { unit, posts } = data;
    let isSubmitting = false;
    // Form fields
    let platform = '';
    let caption = '';
    let imageUrl = '';
    let scheduledAt = '';
    // Generate caption AI
    async function generateAI(event) {
        event.preventDefault();
        const form = event.target;
        const productName = form.elements.productName?.value || '';
        const response = await fetch('/?/' + encodeURIComponent('generateCaption'), {
            method: 'POST',
            body: new URLSearchParams({ productName })
        });
        const json = await response.json();
        if (json.success) {
            caption = json.caption;
            toastPesan.set('Caption AI berhasil dihasilkan');
            setTimeout(() => toastPesan.set(''), 3000);
        } else {
            toastPesan.set('⚠️ Gagal menghasilkan caption');
            setTimeout(() => toastPesan.set(''), 4000);
        }
    }
</script>

<div class="max-w-4xl mx-auto p-4 space-y-6">
    <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-200">Perencana Media Sosial</h1>
    <p class="text-sm text-slate-500 dark:text-slate-400">Kelola postingan media sosial untuk <strong>{unit.name}</strong></p>

    <!-- New Post Form -->
    <form method="POST" action="?/createPost" use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => {
            isSubmitting = false;
            const result = await update();
            if (result?.success) {
                toastPesan.set('Postingan berhasil dibuat');
                setTimeout(() => toastPesan.set(''), 3000);
            } else if (result?.message) {
                toastPesan.set('⚠️ ' + result.message);
                setTimeout(() => toastPesan.set(''), 4000);
            }
        };
    }} class="space-y-4 bg-white dark:bg-slate-800 p-6 rounded-xl shadow">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Platform</label>
                <select bind:value={platform} name="platform" required class="w-full px-3 py-2 border rounded bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">-- Pilih Platform --</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Twitter">Twitter</option>
                    <option value="WhatsApp">WhatsApp</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jadwal (optional)</label>
                <input type="datetime-local" bind:value={scheduledAt} name="scheduledAt" class="w-full px-3 py-2 border rounded bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
        </div>
        <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Caption</label>
            <textarea bind:value={caption} name="caption" required rows="3" class="w-full px-3 py-2 border rounded bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
        </div>
        <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL Gambar (optional)</label>
            <input type="url" bind:value={imageUrl} name="imageUrl" placeholder="https://..." class="w-full px-3 py-2 border rounded bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div class="flex items-center space-x-4">
            <button type="submit" disabled={isSubmitting} class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50">
                {#if isSubmitting}Menyimpan...{:else}Buat Postingan{/if}
            </button>
            <button type="button" on:click={async (e) => {
                const productName = prompt('Nama produk untuk AI caption');
                if (!productName) return;
                const formData = new FormData();
                formData.append('productName', productName);
                const res = await fetch('/?/' + encodeURIComponent('generateCaption'), {
                    method: 'POST',
                    body: formData
                });
                const json = await res.json();
                if (json.success) {
                    caption = json.caption;
                    toastPesan.set('Caption AI berhasil dihasilkan');
                    setTimeout(() => toastPesan.set(''), 3000);
                } else {
                    toastPesan.set('⚠️ Gagal menghasilkan caption');
                    setTimeout(() => toastPesan.set(''), 4000);
                }
            }} class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded">
                AI Caption
            </button>
        </div>
    </form>

    <!-- Existing Posts List -->
    <section class="space-y-4">
        <h2 class="text-xl font-semibold text-slate-800 dark:text-slate-200">Daftar Postingan</h2>
        {#if posts && posts.length > 0}
            <ul class="space-y-3">
                {#each posts as p}
                    <li class="p-4 bg-white dark:bg-slate-800 rounded shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <span class="font-medium text-slate-800 dark:text-slate-200">{p.platform}</span>
                                <span class="ml-2 text-xs text-slate-500 dark:text-slate-400">{p.status}</span>
                            </div>
                            <div class="text-sm text-slate-500 dark:text-slate-400">
                                {#if p.scheduledAt}
                                    Dijadwalkan: {new Date(p.scheduledAt).toLocaleString()}
                                {:else}
                                    Dibuat: {new Date(p.createdAt).toLocaleString()}
                                {/if}
                            </div>
                        </div>
                        <p class="mt-2 text-slate-700 dark:text-slate-300 line-clamp-3">{p.caption}</p>
                        {#if p.imageUrl}
                            <img src={p.imageUrl} alt="Post image" class="mt-2 max-h-48 w-full object-cover rounded" />
                        {/if}
                    </li>
                {/each}
            </ul>
        {:else}
            <p class="text-slate-500 dark:text-slate-400">Belum ada postingan.</p>
        {/if}
    </section>
</div>
