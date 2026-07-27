<script>
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';

    export let data;

    const today = new Date().toISOString().split('T')[0];

    onMount(() => {
        if ($page.url.searchParams.has('pesan')) {
            setTimeout(() => {
                const newUrl = $page.url.pathname;
                goto(newUrl, { replaceState: true, noScroll: true, keepFocus: true });
            }, 3000);
        }
    });

    let loading = false;

    const roleGroups = [
        {
            label: 'Manajemen & Pemilik',
            roles: ['owner', 'admin', 'manajer', 'kepala cabang', 'supervisor', 'leader', 'boss']
        },
        {
            label: 'Keuangan & Akuntansi',
            roles: ['finance', 'keuangan', 'akuntan', 'accounting', 'pembukuan', 'audit', 'billing']
        },
        {
            label: 'SDM & HR',
            roles: ['hr', 'sdm', 'people', 'recruiter', 'talenta']
        },
        {
            label: 'Kasir & POS',
            roles: ['kasir', 'cashier', 'teller', 'pos']
        },
        {
            label: 'Operasional & Produksi',
            roles: ['operator', 'operasional', 'produksi', 'production']
        },
        {
            label: 'Logistik & Gudang',
            roles: ['gudang', 'logistik', 'warehouse', 'inventori', 'stock']
        },
        {
            label: 'Layanan & Dukungan',
            roles: ['service', 'layanan', 'dukungan', 'support', 'customer service', 'pelayanan pelanggan']
        },
        {
            label: 'Administrasi & Front Office',
            roles: ['resepsionis', 'front office', 'back office', 'administrasi']
        },
        {
            label: 'Teknis & IT',
            roles: ['teknisi', 'technician', 'support it', 'engineering']
        },
        {
            label: 'Pengadaan & Procurement',
            roles: ['sopir', 'driver', 'purchasing', 'pengadaan', 'procurement']
        },
        {
            label: 'Quality & Safety',
            roles: ['quality', 'quality control', 'pemeliharaan', 'maintenance', 'safety']
        },
        {
            label: 'Pemasaran & Penjualan',
            roles: ['marketing', 'pemasaran', 'digital marketing', 'e-commerce', 'brand', 'content', 'sales', 'penjualan', 'business development', 'growth', 'community', 'event']
        }
    ];

    function formatRoleLabel(role) {
        if (!role) return '';
        return String(role)
            .split(/[-_\s]+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    function normalizeRole(role) {
        return String(role || '').toLowerCase().trim();
    }

    $: groupedRoles = (() => {
        const available = new Set((data.availableRoles || []).map((r) => normalizeRole(r)));
        const groups = roleGroups
            .map((group) => ({
                label: group.label,
                roles: group.roles.filter((role) => available.has(normalizeRole(role)))
            }))
            .filter((group) => group.roles.length > 0);

        const assigned = new Set(groups.flatMap((group) => group.roles.map((role) => normalizeRole(role))));
        const otherRoles = (data.availableRoles || [])
            .filter((role) => !assigned.has(normalizeRole(role)))
            .map((role) => String(role).trim())
            .filter(Boolean);

        if (otherRoles.length) {
            groups.push({ label: 'Peran lainnya', roles: otherRoles });
        }

        return groups;
    })();

    let formKaryawan = {
        full_name: '',
        id_number: '',
        email: '',
        phone: '',
        address: '',
        position: '',
        division: '',
        job_grade: 'Junior',
        manager_id: '',
        placement_location: '',
        employment_status: 'Contract',
        join_date: today,
        contract_start: today,
        contract_end: '',
        password: '',
        pin: '',
        role: 'employee',
        role_custom: '',
        status: 'active',
        salary: 0,
        bank_name: '',
        bank_account_number: '',
        tax_id: '',
        emergency_contact: '',
        emergency_relation: '',
        blood_type: ''
    };

    function resetForm() {
        formKaryawan = {
            ...formKaryawan,
            full_name: '',
            id_number: '',
            email: '',
            phone: '',
            address: '',
            position: '',
            division: '',
            job_grade: 'Junior',
            manager_id: '',
            placement_location: '',
            employment_status: 'Contract',
            join_date: today,
            contract_start: today,
            contract_end: '',
            password: '',
            pin: '',
            role: 'employee',
            role_custom: '',
            status: 'active',
            salary: 0,
            bank_name: '',
            bank_account_number: '',
            tax_id: '',
            emergency_contact: '',
            emergency_relation: '',
            blood_type: ''
        };
    }

    async function submitKaryawan() {
        if (!String(formKaryawan.full_name || '').trim()) {
            alert('⚠️ Nama lengkap wajib diisi.');
            return;
        }

        if (!String(formKaryawan.position || '').trim()) {
            alert('⚠️ Jabatan wajib diisi.');
            return;
        }

        if (formKaryawan.password && String(formKaryawan.password).length < 6) {
            alert('⚠️ Password minimal 6 karakter.');
            return;
        }

        if (formKaryawan.pin && String(formKaryawan.pin).length !== 6) {
            alert('⚠️ PIN harus 6 digit.');
            return;
        }

        loading = true;
        try {
            const payload = {
                ...formKaryawan,
                company_id: data.unit.id,
                join_date: formKaryawan.join_date || today,
                contract_start: formKaryawan.contract_start || formKaryawan.join_date || today,
                contract_end: formKaryawan.contract_end || null,
                salary: Number(formKaryawan.salary || 0)
            };

            const res = await fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (result.success) {
                window.location.href = `/finance/${data.unit.slug}/hr?pesan=${encodeURIComponent(result.message)}`;
            } else {
                alert('❌ Gagal: ' + result.message);
            }
        } catch (err) {
            console.error(err);
            alert('❌ Error: Terjadi masalah pada koneksi server.');
        } finally {
            loading = false;
        }
    }
</script>

<div class="max-w-6xl mx-auto px-6 py-10" in:fade>
    <nav class="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        <a href={`/finance/${data.unit.slug}/hr`} class="transition-colors hover:text-indigo-600">HR</a>
        <span>/</span>
        <span class="text-slate-800 dark:text-slate-100">Tambah Karyawan</span>
    </nav>

    <div class="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div class="space-y-1">
            <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Tambah Karyawan Baru</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Daftarkan anggota tim baru ke unit {data.unit.nama_unit}</p>
        </div>
        <div class="flex items-center gap-3">
            <button on:click={resetForm} class="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-all hover:text-slate-700 dark:hover:text-slate-200 dark:text-slate-200">Bersihkan</button>
            <button on:click={() => history.back()} class="rounded-full px-4 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 transition-all hover:text-slate-600 dark:text-slate-300">Batal</button>
            <button
                on:click={submitKaryawan}
                disabled={loading}
                class="rounded-full bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50"
            >
                {loading ? 'Menyimpan...' : 'Simpan Data'}
            </button>
        </div>
    </div>

    <div class="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
                <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Ringkasan pendaftaran</p>
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">Data yang dimasukkan akan langsung tersimpan ke HR unit ini.</p>
            </div>
            <div class="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">Siap diproses</div>
        </div>
    </div>

    <div class="space-y-8">
        <section class="grid grid-cols-1 gap-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm md:grid-cols-[1fr_3fr]">
            <div>
                <h2 class="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Identitas</h2>
                <p class="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">Pastikan nama, kontak, dan akses portal sesuai dokumen.</p>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div class="md:col-span-2 xl:col-span-3">
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nama Lengkap</label>
                    <input bind:value={formKaryawan.full_name} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="Nama sesuai KTP" />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">NIK</label>
                    <input bind:value={formKaryawan.id_number} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="16 digit" />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">NPWP</label>
                    <input bind:value={formKaryawan.tax_id} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="00.000..." />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Email</label>
                    <input type="email" bind:value={formKaryawan.email} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="nama@perusahaan.com" />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Telepon</label>
                    <input bind:value={formKaryawan.phone} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="0812..." />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Password Portal</label>
                    <input type="password" bind:value={formKaryawan.password} class="w-full rounded-lg border border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/40 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="Minimal 6 karakter" />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">PIN Portal</label>
                    <input type="text" maxlength="6" bind:value={formKaryawan.pin} class="w-full rounded-lg border border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/40 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="6 digit" />
                </div>
                <div class="md:col-span-2 xl:col-span-3">
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Alamat</label>
                    <input bind:value={formKaryawan.address} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="Alamat sesuai KTP" />
                </div>
            </div>
        </section>

        <section class="grid grid-cols-1 gap-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm md:grid-cols-[1fr_3fr]">
            <div>
                <h2 class="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Pekerjaan</h2>
                <p class="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">Atur jabatan, struktur, dan status kerja.</p>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div class="md:col-span-2 xl:col-span-3">
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Jabatan</label>
                    <input bind:value={formKaryawan.position} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="Contoh: Staff Finance" />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Level Jabatan</label>
                    <select bind:value={formKaryawan.job_grade} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none">
                        <option value="Junior">Junior / Staff</option>
                        <option value="Middle">Middle / Officer</option>
                        <option value="Senior">Senior / Lead</option>
                        <option value="Manager">Managerial</option>
                    </select>
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Divisi</label>
                    <select bind:value={formKaryawan.division} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none">
                        <option value="">Pilih divisi</option>
                        <option value="Operations">Operations</option>
                        <option value="Finance">Finance</option>
                        <option value="HR">Human Resources</option>
                        <option value="Marketing">Marketing</option>
                    </select>
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Lokasi Penempatan</label>
                    <input bind:value={formKaryawan.placement_location} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="Contoh: Jakarta HQ" />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Peran Akses</label>
                    <p class="mb-2 text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Pilih role sesuai kebutuhan unit bisnis Anda. Jika tidak ada yang cocok, pilih "Lainnya (kustom)" dan tulis sendiri.</p>
                    <div class="flex gap-2">
                        <select bind:value={formKaryawan.role} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none">
                            <option value="">Pilih peran akses</option>
                            {#if Array.isArray(groupedRoles) && groupedRoles.length}
                                {#each groupedRoles as group}
                                    <optgroup label={group.label}>
                                        {#each group.roles as r}
                                            <option value={r}>{formatRoleLabel(r)}</option>
                                        {/each}
                                    </optgroup>
                                {/each}
                                <option value="__custom__">-- Lainnya (kustom) --</option>
                            {:else}
                                <option value="employee">Karyawan</option>
                                <option value="manager">Manajer</option>
                                <option value="hr">HR</option>
                                <option value="__custom__">-- Lainnya (kustom) --</option>
                            {/if}
                        </select>
                        {#if formKaryawan.role === '__custom__'}
                            <input placeholder="Masukkan peran kustom" bind:value={formKaryawan.role_custom} class="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none w-56" />
                        {/if}
                    </div>
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Status Kerja</label>
                    <select bind:value={formKaryawan.employment_status} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none">
                        <option value="Contract">Kontrak</option>
                        <option value="Full-time">Tetap</option>
                    </select>
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Status Aktif</label>
                    <select bind:value={formKaryawan.status} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none">
                        <option value="active">Aktif</option>
                        <option value="inactive">Tidak Aktif</option>
                    </select>
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Tanggal Bergabung</label>
                    <input type="date" bind:value={formKaryawan.join_date} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none" />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Tanggal Mulai Kontrak</label>
                    <input type="date" bind:value={formKaryawan.contract_start} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none" />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Tanggal Berakhir Kontrak</label>
                    <input type="date" bind:value={formKaryawan.contract_end} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none" />
                </div>
                <div class="md:col-span-2 xl:col-span-3">
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Atasan Langsung</label>
                    <select bind:value={formKaryawan.manager_id} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500">
                        <option value="">Tanpa atasan langsung</option>
                        {#each data.employees || [] as emp}
                            <option value={emp.id}>{emp.full_name} — {emp.position}</option>
                        {/each}
                    </select>
                </div>
            </div>
        </section>

        <section class="grid grid-cols-1 gap-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm md:grid-cols-[1fr_3fr]">
            <div>
                <h2 class="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Kompensasi</h2>
                <p class="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">Data gaji dan rekening bank untuk payroll.</p>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 md:col-span-2">
                    <label class="mb-1 block text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600">Gaji Pokok (IDR)</label>
                    <input bind:value={formKaryawan.salary} type="number" class="w-full bg-transparent text-2xl font-black text-emerald-700 outline-none" />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nama Bank</label>
                    <input bind:value={formKaryawan.bank_name} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="Contoh: BCA" />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nomor Rekening</label>
                    <input bind:value={formKaryawan.bank_account_number} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="0000" />
                </div>
            </div>
        </section>

        <section class="grid grid-cols-1 gap-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm md:grid-cols-[1fr_3fr]">
            <div>
                <h2 class="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Darurat</h2>
                <p class="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">Data kontak darurat dan informasi medis dasar.</p>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Kontak Darurat</label>
                    <input bind:value={formKaryawan.emergency_contact} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="0812..." />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Hubungan</label>
                    <input bind:value={formKaryawan.emergency_relation} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none transition-all focus:border-indigo-500" placeholder="Suami / Istri / Orang Tua" />
                </div>
                <div>
                    <label class="mb-1 block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Golongan Darah</label>
                    <select bind:value={formKaryawan.blood_type} class="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold outline-none">
                        <option value="">-</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                        <option value="O">O</option>
                    </select>
                </div>
            </div>
        </section>
    </div>
</div>
