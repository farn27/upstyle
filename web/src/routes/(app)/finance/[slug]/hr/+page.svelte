<script>
    import { fade } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import PageLayout from '$lib/components/PageLayout.svelte';
    export let data;

    // Filter karyawan berdasarkan unit bisnis yang sedang dibuka
    $: employees = data.employees || [];
    $: slug = data.unit.slug;
    $: portalHref = data.portalLink || (data.unit?.login_slug ? `/portal/${data.unit.login_slug}` : `/finance/${slug}/settings`);
    $: activeEmployees = employees.filter((emp) => (emp.status || 'active') === 'active').length;
    $: pendingApprovals = data.approvalRequests?.length || 0;
    $: payrollThisMonth = data.payrollRuns?.length || 0;
    $: payrollSummary = Array.isArray(data.payrollSummary) ? data.payrollSummary : [];
    $: paidPayrollCount = payrollSummary.find((item) => String(item.payment_status || '').toLowerCase() === 'paid')?.cnt || 0;
    $: unpaidPayrollCount = payrollSummary.find((item) => String(item.payment_status || '').toLowerCase() === 'unpaid')?.cnt || 0;
    $: leaveSummary = Array.isArray(data.leaveSummary) ? data.leaveSummary : [];
    $: lifecycleSummary = Array.isArray(data.lifecycleSummary) ? data.lifecycleSummary : [];
    $: contractExpiring = Array.isArray(data.contractExpiring) ? data.contractExpiring : [];
    $: activityFeed = Array.isArray(data.activityFeed) ? data.activityFeed : [];
    $: criticalIssues = Math.max(0, contractExpiring.length + (unpaidPayrollCount ? 1 : 0) + (pendingApprovals ? 1 : 0));
    $: leaveCount = leaveSummary.find((item) => String(item.type || '').toLowerCase() === 'leave')?.cnt || 0;
    $: overtimeCount = leaveSummary.find((item) => String(item.type || '').toLowerCase() === 'overtime')?.cnt || 0;
    $: activeLifecycleCount = lifecycleSummary.find((item) => String(item.status || '').toLowerCase() === 'active')?.cnt || 0;
    $: roleSummary = activeRole === 'owner'
        ? 'Pantau persetujuan, kesiapan payroll, dan kesehatan tenaga kerja dari satu tampilan eksekutif.'
        : activeRole === 'manager'
          ? 'Koordinasikan permintaan tim, kebutuhan staffing, dan tindak lanjut operasional.'
          : 'Akses tugas HR pribadi, slip gaji, dan permintaan layanan.';
    let notice = '';
    let activeRole = 'owner';
    let requestForm = { employeeId: '', type: 'leave', startDate: '', endDate: '', reason: '' };
    let approvalForm = { requesterId: '', module: 'reimbursement', amount: '', note: '' };
    let requestSubmitting = false;
    let approvalSubmitting = false;
    let payrollRunning = false;
    let requestMessage = '';
    let approvalMessage = '';
    let payrollMessage = '';
    let processingApprovalId = null;
    let payrollStatusSubmitting = false;

    const formatDate = (value) => value ? new Date(value).toLocaleDateString('id-ID') : '—';

    async function submitRequest() {
        if (!requestForm.employeeId || !requestForm.startDate || !requestForm.endDate) {
            requestMessage = 'Pilih karyawan dan isi rentang tanggal.';
            return;
        }

        requestSubmitting = true;
        requestMessage = '';

        try {
            const res = await fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create-request', request: requestForm })
            });
            const json = await res.json();
            requestMessage = json.message || 'Permintaan berhasil dikirim.';
            if (json.success) {
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            requestMessage = 'Gagal mengirim permintaan.';
        } finally {
            requestSubmitting = false;
        }
    }

    async function submitApproval() {
        if (!approvalForm.requesterId || !approvalForm.amount) {
            approvalMessage = 'Pilih karyawan dan isi nominal pengajuan.';
            return;
        }

        approvalSubmitting = true;
        approvalMessage = '';

        try {
            const res = await fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create-approval', approval: approvalForm })
            });
            const json = await res.json();
            approvalMessage = json.message || 'Pengajuan berhasil dibuat.';
            if (json.success) {
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            approvalMessage = 'Gagal mengajukan permohonan.';
        } finally {
            approvalSubmitting = false;
        }
    }

    async function runPayroll() {
        payrollRunning = true;
        payrollMessage = '';

        try {
            const res = await fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'run-payroll' })
            });
            const json = await res.json();
            payrollMessage = json.message || 'Payroll berhasil dibuat.';
            if (json.success) {
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            payrollMessage = 'Gagal menjalankan payroll.';
        } finally {
            payrollRunning = false;
        }
    }

    async function decideApproval(approvalId, decision) {
        processingApprovalId = approvalId;
        approvalMessage = '';

        try {
            const res = await fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'decide-approval', approval_id: approvalId, decision })
            });
            const json = await res.json();
            approvalMessage = json.message || 'Status pengajuan diperbarui.';
            if (json.success) {
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            approvalMessage = 'Gagal memperbarui status pengajuan.';
        } finally {
            processingApprovalId = null;
        }
    }

    async function markPayrollPaid() {
        payrollStatusSubmitting = true;
        payrollMessage = '';

        try {
            const res = await fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark-payroll-paid' })
            });
            const json = await res.json();
            payrollMessage = json.message || 'Status payroll diperbarui.';
            if (json.success) {
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            payrollMessage = 'Gagal memperbarui status payroll.';
        } finally {
            payrollStatusSubmitting = false;
        }
    }

    onMount(() => {
        if ($page.url.searchParams.has('pesan')) {
            notice = $page.url.searchParams.get('pesan');
        }
    });
</script>

<PageLayout title="Dasbor HR Pemilik" subtitle="Ringkasan operasional untuk {data.unit?.nama_unit}" badge="HR & SDM" slug={data.unit.slug} unit={data.unit}>
    <div slot="actions" class="flex flex-wrap gap-2">
        <a href={portalHref}
           class="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-all">
            {data.unit?.login_slug ? 'Buka Portal Karyawan' : 'Buat Portal Karyawan'}
        </a>
        <a href={`/finance/${data.unit.slug}/hr/add`}
           class="bg-indigo-600 text-white px-6 py-3 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
            + Tambah Anggota Tim
        </a>
    </div>

    {#if notice}
        <div class="mb-4 rounded-md border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
            {notice}
        </div>
    {/if}
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Kesehatan Tim</p>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{data.avgKpi ? data.avgKpi.toFixed(1) : '0.0'} <span class="text-xs text-emerald-500">/ 10</span></p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Tim Aktif</p>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{activeEmployees || 0}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Persetujuan Tertunda</p>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{pendingApprovals || 0}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Pembayaran Gaji Bulan Ini</p>
            <p class="text-2xl font-black text-rose-500">{payrollThisMonth || 0} kali</p>
        </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4 mt-4">
        <div class="bg-slate-900 text-white p-5 rounded-md border border-slate-800 shadow-sm">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Prioritas hari ini</p>
                    <h3 class="text-base font-bold text-white">Pusat kendali HR eksekutif</h3>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" on:click={() => activeRole = 'owner'} class="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest {activeRole === 'owner' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white' : 'bg-white/10 text-slate-300'}">Pemilik</button>
                    <button type="button" on:click={() => activeRole = 'manager'} class="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest {activeRole === 'manager' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white' : 'bg-white/10 text-slate-300'}">Manajer</button>
                    <button type="button" on:click={() => activeRole = 'staff'} class="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest {activeRole === 'staff' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white' : 'bg-white/10 text-slate-300'}">Staf</button>
                </div>
            </div>
            <p class="mt-3 text-sm text-slate-300">{roleSummary}</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div class="rounded-md border border-white/10 bg-white/10 p-3">
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Persetujuan</p>
                    <p class="mt-2 text-2xl font-black">{pendingApprovals}</p>
                </div>
                <div class="rounded-md border border-white/10 bg-white/10 p-3">
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Pembayaran Gaji</p>
                    <p class="mt-2 text-2xl font-black">{payrollThisMonth} run</p>
                </div>
                <div class="rounded-md border border-white/10 bg-white/10 p-3">
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Tenaga Kerja</p>
                    <p class="mt-2 text-2xl font-black">{activeEmployees}</p>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
            <div>
                <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Aksi cepat</p>
                <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Langkah prioritas</h3>
            </div>
            <div class="grid gap-2">
                <a href={`/finance/${data.unit.slug}/hr/add`} class="rounded-md border border-slate-200 dark:border-slate-700 p-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900">➜ Rekrut karyawan baru</a>
                <button on:click={runPayroll} disabled={payrollRunning} class="rounded-md border border-slate-200 dark:border-slate-700 p-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 disabled:opacity-50">➜ {payrollRunning ? 'Memproses payroll...' : 'Jalankan payroll sekarang'}</button>
                <a href="#" on:click|preventDefault={() => window.open(`/api/laporan-wa`, '_blank')} class="rounded-md border border-emerald-200 dark:border-emerald-800 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">📊 Laporan Ringkasan WA</a>
                <a href="#approvals" class="rounded-md border border-slate-200 dark:border-slate-700 p-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900">➜ Tinjau antrian persetujuan</a>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Cuti & Lembur</p>
            <div class="mt-3 grid gap-3">
                <div class="rounded-md border border-slate-200 dark:border-slate-700 p-3">
                    <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">Cuti tertunda</p>
                    <p class="text-xl font-black text-slate-900 dark:text-white">{leaveCount}</p>
                </div>
                <div class="rounded-md border border-slate-200 dark:border-slate-700 p-3">
                    <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">Lembur tertunda</p>
                    <p class="text-xl font-black text-slate-900 dark:text-white">{overtimeCount}</p>
                </div>
            </div>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Daur Hidup Karyawan</p>
            <div class="mt-3 rounded-md border border-slate-200 dark:border-slate-700 p-3">
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">Karyawan aktif</p>
                <p class="text-xl font-black text-slate-900 dark:text-white">{activeLifecycleCount}</p>
            </div>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Kesiapan Payroll</p>
            <div class="mt-3 rounded-md border border-slate-200 dark:border-slate-700 p-3">
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">Status bulan ini</p>
                <p class="text-xl font-black text-slate-900 dark:text-white">{paidPayrollCount} lunas / {unpaidPayrollCount} belum lunas</p>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4 mt-4">
        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Pusat Tindakan Pemilik</p>
                    <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Kontrol Payroll & Persetujuan</h3>
                </div>
                <button on:click={runPayroll} disabled={payrollRunning} class="rounded-md bg-indigo-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-700 disabled:opacity-50">
                    {payrollRunning ? 'Memproses...' : 'Jalankan Payroll'}
                </button>
            </div>
            {#if payrollMessage}
                <div class="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{payrollMessage}</div>
            {/if}
            <div class="rounded-md border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Antrian Persetujuan</p>
                <p class="text-sm text-slate-600 dark:text-slate-300">Permintaan cuti, lembur, reimbursement, dan pinjaman masuk dari portal karyawan. Pemilik cukup menilai dan memutuskan persetujuan.</p>
                {#each data.pendingRequests || [] as req}
                    <div class="rounded-md bg-slate-50 dark:bg-slate-900 p-3 text-sm">
                        <p class="font-semibold text-slate-800 dark:text-slate-100">{req.full_name}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{req.type === 'overtime' ? 'Lembur' : 'Cuti'} • {formatDate(req.start_date)} - {formatDate(req.end_date)}</p>
                    </div>
                {:else}
                    <p class="text-sm text-slate-400 dark:text-slate-500">Belum ada permintaan yang menunggu.</p>
                {/each}
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Tinjauan Pemilik</p>
                    <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Permintaan karyawan tetap di portal</h3>
                </div>
            </div>
            <div class="rounded-md border border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/60 p-4 text-sm text-slate-700 dark:text-slate-200">
                Fitur seperti cuti, lembur, reimbursement, pinjaman, dan akses self-service tetap dipakai oleh karyawan melalui portal karyawan. Pemilik hanya memantau, menilai, dan mengambil keputusan persetujuan.
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="rounded-md border border-slate-200 dark:border-slate-700 p-3">
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Alur Permintaan</p>
                    <p class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Berbasis portal, ditinjau pemilik</p>
                </div>
                <div class="rounded-md border border-slate-200 dark:border-slate-700 p-3">
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Tingkat Keputusan</p>
                    <p class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Setujui / Tolak / Pantau</p>
                </div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4 mt-4">
        <div id="approvals" class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Alur Persetujuan</p>
                    <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Pengawasan Reimbursement & Pinjaman</h3>
                </div>
            </div>
            {#if approvalMessage}
                <div class="mb-3 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{approvalMessage}</div>
            {/if}
            <div class="space-y-3">
                {#each data.approvalRequests || [] as approval}
                    <div class="rounded-md border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p class="font-semibold text-slate-800 dark:text-slate-100">{approval.full_name || 'Karyawan'}</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{approval.module} • {approval.status}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="rounded-full bg-slate-100 dark:bg-slate-800/80 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{approval.amount ? `Rp ${Number(approval.amount).toLocaleString('id-ID')}` : '—'}</span>
                            <button on:click={() => decideApproval(approval.id, 'approve')} disabled={processingApprovalId === approval.id} class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">Setujui</button>
                            <button on:click={() => decideApproval(approval.id, 'reject')} disabled={processingApprovalId === approval.id} class="rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-100 disabled:opacity-50">Tolak</button>
                        </div>
                    </div>
                {:else}
                    <p class="text-sm text-slate-400 dark:text-slate-500">Belum ada pengajuan reimbursement atau pinjaman.</p>
                {/each}
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Denyut Payroll</p>
                    <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Tren Bulanan</h3>
                </div>
                <button on:click={markPayrollPaid} disabled={payrollStatusSubmitting} class="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 disabled:opacity-50">{payrollStatusSubmitting ? 'Memperbarui...' : 'Tandai Lunas'}</button>
            </div>
            {#if payrollMessage}
                <div class="mb-3 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{payrollMessage}</div>
            {/if}
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="rounded-md border border-emerald-100 bg-emerald-50 p-3">
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">Lunas</p>
                    <p class="mt-1 text-xl font-black text-emerald-700">{paidPayrollCount}</p>
                </div>
                <div class="rounded-md border border-amber-100 bg-amber-50 p-3">
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">Belum Lunas</p>
                    <p class="mt-1 text-xl font-black text-amber-700">{unpaidPayrollCount}</p>
                </div>
            </div>
            <div class="space-y-3">
                {#each data.analyticsRows || [] as item}
                    <div class="rounded-md border border-slate-200 dark:border-slate-700 p-3">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">Bulan {item.period_month}</p>
                            <p class="text-sm font-black text-emerald-600">Rp {Number(item.total_payroll || 0).toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                {:else}
                    <p class="text-sm text-slate-400 dark:text-slate-500">Belum ada data payroll bulanan.</p>
                {/each}
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4 mt-4">
        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Masalah Kritis</p>
                    <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Antrian tindak lanjut</h3>
                </div>
                <span class="rounded-full bg-rose-50 dark:bg-rose-950/30 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-rose-700">{criticalIssues} terbuka</span>
            </div>
            <div class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {#if pendingApprovals}
                    <div class="rounded-md border border-slate-200 dark:border-slate-700 p-3">{pendingApprovals} persetujuan menunggu tinjauan.</div>
                {/if}
                {#if unpaidPayrollCount}
                    <div class="rounded-md border border-slate-200 dark:border-slate-700 p-3">{unpaidPayrollCount} entri payroll masih belum lunas.</div>
                {/if}
                {#if contractExpiring.length}
                    <div class="rounded-md border border-slate-200 dark:border-slate-700 p-3">{contractExpiring.length} kontrak karyawan mendekati batas berakhir.</div>
                {/if}
                {#if !pendingApprovals && !unpaidPayrollCount && !contractExpiring.length}
                    <div class="rounded-md border border-slate-200 dark:border-slate-700 p-3">Tidak ada tindak lanjut kritis yang diperlukan saat ini.</div>
                {/if}
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Alur Aktivitas</p>
                    <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Aktivitas HR terbaru</h3>
                </div>
            </div>
            <div class="space-y-2">
                {#each activityFeed as item}
                    <div class="rounded-md border border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-600 dark:text-slate-300">
                        <p class="font-semibold text-slate-800 dark:text-slate-100">{item.pesan}</p>
                        <p class="text-[11px] mt-1 uppercase tracking-wider text-slate-400 dark:text-slate-500">{item.kategori} • {item.tipe} • {item.waktu ? new Date(item.waktu).toLocaleString('id-ID') : '—'}</p>
                    </div>
                {:else}
                    <p class="text-sm text-slate-400 dark:text-slate-500">Belum ada aktivitas HR terbaru.</p>
                {/each}
            </div>
        </div>
    </div>

    <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-md shadow-sm overflow-hidden mt-4">
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                    <th class="px-6 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">Profil Karyawan</th>
                    <th class="px-6 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">Jabatan</th>
                    <th class="px-6 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">Gaji Pokok</th>
                    <th class="px-6 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase text-center">Status</th>
                    <th class="px-6 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase text-center">Aksi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
                {#each employees as emp}
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50/50 dark:bg-slate-900/50 transition-all group">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-600 text-xs uppercase">
                                {emp.full_name.charAt(0)}
                            </div>
                            <div>
                                <p class="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase">{emp.full_name}</p>
                                <p class="text-[9px] text-slate-400 dark:text-slate-500 font-medium tracking-tighter italic">Bergabung: {new Date(emp.joined_at).toLocaleDateString('id-ID')}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 rounded-md text-[9px] font-black uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-colors">{emp.position}</span>
                    </td>
                    <td class="px-6 py-4">
                        <p class="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">Rp {emp.salary?.toLocaleString('id-ID')}</p>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full {emp.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'}">
                            <div class="w-1 h-1 rounded-full {emp.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}"></div>
                            <span class="text-[9px] font-black uppercase">{emp.status}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <a href={`/finance/${data.unit.slug}/hr/${emp.slug}`}
                               class="inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm">
                                Kelola Profil
                            </a>
                            <a href={`/api/slip-gaji/${emp.id}`} target="_blank"
                               class="inline-flex items-center justify-center px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm"
                               title="Cetak Slip Gaji">
                                Slip
                            </a>
                        </div>
                    </td>
                </tr>
                {/each}
            </tbody>
        </table>
    </div>
</PageLayout>

