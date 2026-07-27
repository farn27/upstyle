<script>
    import { page } from '$app/stores';
    import { fade } from 'svelte/transition';

    export let data;
    const { unit, invoice } = data;
    $: slug = $page.params.slug;

    const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
    const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    let printMode = false;

    function handlePrint() {
        printMode = true;
        setTimeout(() => {
            window.print();
            printMode = false;
        }, 100);
    }
</script>

<svelte:head>
    <title>Faktur Tagihan {invoice.nomorFaktur} - {unit.namaUnit}</title>
    <style>
        @media print {
            body { background: white !important; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            @page { margin: 1cm; }
        }
    </style>
</svelte:head>

<div class="min-h-screen bg-slate-100 dark:bg-slate-900 py-8 px-4 no-print" class:!hidden={printMode}>
    <div class="max-w-3xl mx-auto flex justify-between items-center mb-6">
        <a href="/finance/{slug}/hutang" class="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Kembali
        </a>
        <button on:click={handlePrint} class="bg-rose-600 text-white px-5 py-2.5 rounded-lg font-bold shadow hover:bg-rose-700 transition flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Cetak / Export PDF
        </button>
    </div>
</div>

<!-- INVOICE DOCUMENT -->
<div class="max-w-3xl mx-auto bg-white p-10 md:p-14 shadow-lg border-t-8 border-rose-600 mt-0 {printMode ? '' : 'no-print'}" class:no-print={!printMode && false} style={!printMode ? 'margin-top: -2rem;' : ''}>
    
    <div class="flex justify-between items-start border-b pb-8 mb-8">
        <div>
            <h1 class="text-4xl font-black text-slate-800 tracking-tight uppercase">FAKTUR HUTANG</h1>
            <p class="text-slate-500 font-mono mt-2">{invoice.nomorFaktur}</p>
        </div>
        <div class="text-right">
            <h2 class="text-xl font-bold text-slate-800">{invoice.contact?.namaKontak || 'Supplier'}</h2>
            <p class="text-slate-500 text-sm mt-1 max-w-xs">{invoice.contact?.perusahaan || '-'}</p>
            {#if invoice.contact?.telepon}
                <p class="text-slate-500 text-sm mt-1">Telp: {invoice.contact?.telepon}</p>
            {/if}
        </div>
    </div>

    <div class="flex justify-between items-start mb-10">
        <div>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ditagihkan Kepada:</p>
            <h3 class="text-lg font-bold text-slate-800">{unit.namaUnit}</h3>
            <p class="text-slate-600 text-sm mt-1">{unit.alamat || '-'}</p>
            {#if unit.telepon}
                <p class="text-slate-600 text-sm mt-1">{unit.telepon}</p>
            {/if}
        </div>
        <div class="text-right">
            <div class="mb-4">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal Faktur:</p>
                <p class="text-slate-800 font-bold">{fmtDate(invoice.tanggal)}</p>
            </div>
            <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jatuh Tempo:</p>
                <p class="text-slate-800 font-bold text-rose-600">{fmtDate(invoice.jatuhTempo)}</p>
            </div>
        </div>
    </div>

    <table class="w-full mb-10 text-left">
        <thead>
            <tr class="border-b-2 border-slate-200">
                <th class="py-3 px-2 text-slate-800 font-bold">Keterangan Hutang</th>
                <th class="py-3 px-2 text-slate-800 font-bold text-right">Total</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
            <tr>
                <td class="py-4 px-2 text-slate-700 whitespace-pre-wrap">{invoice.keterangan || 'Penagihan hutang usaha / transaksi pembelian.'}</td>
                <td class="py-4 px-2 text-right font-mono font-bold text-slate-800">{rp(invoice.nominal)}</td>
            </tr>
        </tbody>
    </table>

    <div class="flex justify-end mb-12">
        <div class="w-1/2">
            <div class="flex justify-between py-2 border-b">
                <span class="font-bold text-slate-600">Subtotal</span>
                <span class="font-mono text-slate-800">{rp(invoice.nominal)}</span>
            </div>
            <div class="flex justify-between py-2 border-b">
                <span class="font-bold text-slate-600">Sudah Dibayar</span>
                <span class="font-mono text-emerald-600">- {rp(invoice.sudahDibayar)}</span>
            </div>
            <div class="flex justify-between py-3 border-b-2 border-slate-800 mt-2">
                <span class="font-black text-slate-800 text-lg">Sisa Tagihan</span>
                <span class="font-mono font-black text-rose-700 text-lg">{rp(Number(invoice.nominal) - Number(invoice.sudahDibayar))}</span>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-2 gap-8 text-sm text-slate-600">
        <div>
            <p class="font-bold text-slate-800 mb-2">Instruksi Pembayaran:</p>
            <p>Bukti cetak tagihan ini bersifat sah secara sistem. Pembayaran akan dilakukan sesuai termin.</p>
        </div>
        <div class="text-center pt-8">
            <p class="font-bold text-slate-800 mb-16">Penyetuju,</p>
            <p class="font-bold text-slate-800 border-t inline-block px-8 pt-2">{unit.namaUnit}</p>
        </div>
    </div>
</div>
