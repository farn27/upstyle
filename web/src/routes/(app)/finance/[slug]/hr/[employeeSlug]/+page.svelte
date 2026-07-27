<script>
    import { fade } from 'svelte/transition';
    import { onMount } from 'svelte';

    export let data;
    $: emp = data.employee;
    $: components = Array.isArray(data.salaryComponents) ? data.salaryComponents : [];
    $: kpiScore = data.kpiScore ?? 0;
    $: managers = Array.isArray(data.managers) ? data.managers : [];

    let activeTab = 'employment';
    let message = '';
    let saving = false;
    let editMode = false;
    let salaryForm = { name: '', amount: 0, type: 'addition' };
    let employeeForm = {
        manager_id: '',
        position: '',
        division: '',
        job_grade: 'Junior',
        salary: 0,
        email: '',
        phone: '',
        id_number: '',
        address: '',
        contract_start: '',
        contract_end: '',
        employment_status: 'Contract',
        placement_location: '',
        bank_name: '',
        bank_account_number: '',
        emergency_contact: '',
        emergency_relation: '',
        blood_type: '',
        status: 'active'
    };

    $: if (emp) {
        employeeForm = {
            manager_id: emp.manager_id || '',
            position: emp.position || '',
            division: emp.division || '',
            job_grade: emp.job_grade || 'Junior',
            salary: emp.salary || 0,
            email: emp.email || '',
            phone: emp.phone || '',
            id_number: emp.id_number || '',
            address: emp.address || '',
            contract_start: emp.contract_start || '',
            contract_end: emp.contract_end || '',
            employment_status: emp.employment_status || 'Contract',
            placement_location: emp.placement_location || '',
            bank_name: emp.bank_name || '',
            bank_account_number: emp.bank_account_number || '',
            emergency_contact: emp.emergency_contact || '',
            emergency_relation: emp.emergency_relation || '',
            blood_type: emp.blood_type || '',
            status: emp.status || 'active'
        };
    }

    $: allowances = Array.isArray(components) ? components.filter((c) => c?.type === 'addition') : [];
    $: deductions = Array.isArray(components) ? components.filter((c) => c?.type === 'deduction') : [];
    $: totalAllowance = allowances.reduce((a, b) => a + Number(b?.amount || 0), 0);
    $: managerName = managers.find((m) => String(m.id) === String(emp?.manager_id))?.full_name || '—';
    $: totalDeduction = deductions.reduce((a, b) => a + Number(b?.amount || 0), 0);
    $: takeHomePay = Number(employeeForm.salary || emp?.salary || 0) + totalAllowance - totalDeduction;

    /** @param {number|string|null|undefined} n */
    const formatIDR = (n = 0) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));
    /** @param {string|null|undefined} value */
    const formatDate = (value = '') => value ? new Date(value).toLocaleDateString('id-ID') : '—';

    function toggleEditMode() {
        editMode = !editMode;
        if (!editMode) {
            message = '';
        }
    }

    async function saveEmployee() {
        saving = true;
        message = '';

        try {
            const res = await fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update-employee',
                    employee: employeeForm
                })
            });
            const json = await res.json();

            if (json.success) {
                message = json.message;
                window.location.reload();
            } else {
                message = json.message || 'Gagal menyimpan data.';
            }
        } catch (err) {
            console.error(err);
            message = 'Terjadi kesalahan saat menyimpan data employee.';
        } finally {
            saving = false;
        }
    }

    async function addComponent() {
        saving = true;
        message = '';

        try {
            const res = await fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add-component',
                    component: salaryForm
                })
            });
            const json = await res.json();

            if (json.success) {
                message = json.message;
                window.location.reload();
            } else {
                message = json.message || 'Gagal menambahkan komponen gaji.';
            }
        } catch (err) {
            console.error(err);
            message = 'Terjadi kesalahan saat menambahkan komponen gaji.';
        } finally {
            saving = false;
        }
    }

    /** @param {number|string} id */
    async function deleteComponent(id) {
        if (!confirm('Hapus komponen gaji ini?')) return;

        saving = true;
        message = '';

        try {
            const res = await fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete-component',
                    component_id: id
                })
            });
            const json = await res.json();

            if (json.success) {
                message = json.message;
                window.location.reload();
            } else {
                message = json.message || 'Gagal menghapus komponen gaji.';
            }
        } catch (err) {
            console.error(err);
            message = 'Terjadi kesalahan saat menghapus komponen gaji.';
        } finally {
            saving = false;
        }
    }
</script>

<div class="max-w-6xl mx-auto p-6 space-y-6 antialiased text-slate-800 dark:text-slate-100">
    
    <div class="bg-white dark:bg-slate-800 p-5 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
        <div class="flex items-center gap-5">
            <div class="h-16 w-16 bg-indigo-600 rounded-md flex items-center justify-center text-white text-2xl font-bold">
                {emp.full_name.charAt(0)}
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="text-xl font-bold tracking-tight">{emp.full_name}</h1>
                    <span class="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded border border-emerald-100">{emp.status}</span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">{emp.position} • ID: {emp.id}</p>
            </div>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
            {#if editMode}
                <button on:click={saveEmployee} disabled={saving} class="px-4 py-2 bg-indigo-600 text-white rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all">
                    {saving ? 'Saving...' : 'Save Employee'}
                </button>
            {/if}
            <!-- Slip Gaji Button -->
            <button on:click={() => window.open(`/api/slip-gaji/${emp.id}`, '_blank')}
                class="px-4 py-2 bg-emerald-600 text-white rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Slip Gaji
            </button>
            <button on:click={toggleEditMode} class={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${editMode ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                {editMode ? 'Cancel' : 'Edit'}
            </button>
        </div>
    </div>

    {#if message}
        <div class="rounded-md border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
        </div>
    {/if}

    <div class="grid grid-cols-12 gap-6">
        <aside class="col-span-12 lg:col-span-3 space-y-4">
            <nav class="bg-white dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                {#each [['employment', 'Personal Data'], ['payroll', 'Payroll & Salary']] as [id, label]}
                    <button 
                        on:click={() => activeTab = id}
                        class="px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all text-left
                        {activeTab === id ? 'bg-indigo-600 text-white' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}">
                        {label}
                    </button>
                {/each}
            </nav>

            <div class="bg-slate-50 dark:bg-slate-900 p-5 rounded-md border border-slate-200 dark:border-slate-700 text-center">
                <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Integrity Score</p>
                <p class="text-3xl font-bold text-slate-800 dark:text-slate-100">{kpiScore || 0}<span class="text-sm text-slate-300 font-normal">/10</span></p>
            </div>
        </aside>

        <main class="col-span-12 lg:col-span-9">
            {#if activeTab === 'employment'}
                <div class="bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in duration-300">
                    <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <h2 class="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{editMode ? 'Edit Employee Data' : 'Employee Information'}</h2>
                    </div>
                    {#if editMode}
                        <div class="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div class="space-y-4">
                                <label for="position" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Position</label>
                                <input id="position" bind:value={employeeForm.position} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                            <div class="space-y-4">
                                <label for="division" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Division</label>
                                <input id="division" bind:value={employeeForm.division} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                            <div class="space-y-4">
                                <label for="manager" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Direct Manager</label>
                                <select id="manager" bind:value={employeeForm.manager_id} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                                    <option value="">No direct manager</option>
                                    {#each managers as manager}
                                        <option value={manager.id}>{manager.full_name} — {manager.position || 'Team Member'}</option>
                                    {/each}
                                </select>
                            </div>
                            <div class="space-y-4">
                                <label for="job-grade" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Job Grade</label>
                                <select id="job-grade" bind:value={employeeForm.job_grade} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                                    <option value="Junior">Junior</option>
                                    <option value="Middle">Middle</option>
                                    <option value="Senior">Senior</option>
                                    <option value="Manager">Manager</option>
                                </select>
                            </div>
                            <div class="space-y-4">
                                <label for="employment-status" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Employment Status</label>
                                <select id="employment-status" bind:value={employeeForm.employment_status} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                                    <option value="Contract">Contract</option>
                                    <option value="Full-time">Full-time</option>
                                </select>
                            </div>
                            <div class="space-y-4">
                                <label for="email" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Email</label>
                                <input id="email" type="email" bind:value={employeeForm.email} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                            <div class="space-y-4">
                                <label for="phone" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Phone</label>
                                <input id="phone" bind:value={employeeForm.phone} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                            <div class="space-y-4">
                                <label for="salary" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Salary</label>
                                <input id="salary" type="number" bind:value={employeeForm.salary} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                            <div class="space-y-4">
                                <label for="bank-name" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Bank Name</label>
                                <input id="bank-name" bind:value={employeeForm.bank_name} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                            <div class="space-y-4">
                                <label for="bank-account" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Bank Account</label>
                                <input id="bank-account" bind:value={employeeForm.bank_account_number} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                            <div class="space-y-4">
                                <label for="contract-start" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Contract Start</label>
                                <input id="contract-start" type="date" bind:value={employeeForm.contract_start} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                            <div class="space-y-4">
                                <label for="contract-end" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Contract End</label>
                                <input id="contract-end" type="date" bind:value={employeeForm.contract_end} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                            <div class="space-y-4">
                                <label for="emergency-contact" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Emergency Contact</label>
                                <input id="emergency-contact" bind:value={employeeForm.emergency_contact} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                            <div class="space-y-4">
                                <label for="emergency-relation" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Emergency Relation</label>
                                <input id="emergency-relation" bind:value={employeeForm.emergency_relation} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                            <div class="space-y-4">
                                <label for="blood-type" class="block text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">Blood Type</label>
                                <input id="blood-type" bind:value={employeeForm.blood_type} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                        </div>
                    {:else}
                        <div class="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Position</p>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{emp.position || '—'}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Division</p>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{emp.division || '—'}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Direct Manager</p>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{managerName}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Job Grade</p>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{emp.job_grade || '—'}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Employment Status</p>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{emp.employment_status || '—'}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Email</p>
                                <p class="text-sm font-semibold text-indigo-600">{emp.email || '—'}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Phone</p>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{emp.phone || '—'}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Salary</p>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatIDR(emp.salary)}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Bank</p>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{emp.bank_name || '—'} {emp.bank_account_number ? `• ${emp.bank_account_number}` : ''}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Contract</p>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{emp.contract_start ? `${formatDate(emp.contract_start)}${emp.contract_end ? ` - ${formatDate(emp.contract_end)}` : ''}` : '—'}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Emergency Contact</p>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{emp.emergency_contact || '—'}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Emergency Relation</p>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{emp.emergency_relation || '—'}</p>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Blood Type</p>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{emp.blood_type || '—'}</p>
                            </div>
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="space-y-6 animate-in fade-in duration-300">
                    <div class="grid grid-cols-2 gap-6">
                        <div class="bg-white dark:bg-slate-800 p-6 rounded-md border border-slate-200 dark:border-slate-700 space-y-4">
                            <h3 class="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.2em] border-b border-emerald-50 pb-2">Earnings</h3>
                            <div class="space-y-3 text-xs">
                                <div class="flex justify-between font-bold">
                                    <span>Gaji Pokok</span>
                                    <span>{formatIDR(emp.salary)}</span>
                                </div>
                                {#each Array.isArray(components) ? components.filter((c) => c?.type === 'addition') : [] as item}
                                    <div class="flex justify-between text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                        <span>{item.name || 'Komponen Tambahan'}</span>
                                        <span class="text-emerald-600 font-bold">+{formatIDR(item.amount)}</span>
                                    </div>
                                {/each}
                            </div>
                        </div>

                        <div class="bg-white dark:bg-slate-800 p-6 rounded-md border border-slate-200 dark:border-slate-700 space-y-4">
                            <h3 class="text-[9px] font-bold text-rose-600 uppercase tracking-[0.2em] border-b border-rose-50 pb-2">Deductions</h3>
                            <div class="space-y-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                {#each Array.isArray(components) ? components.filter((c) => c?.type === 'deduction') : [] as item}
                                    <div class="flex justify-between">
                                        <span>{item.name || 'Potongan'}</span>
                                        <span class="text-rose-600 font-bold">-{formatIDR(item.amount)}</span>
                                    </div>
                                {:else}
                                    <p class="text-[10px] italic text-slate-400 dark:text-slate-500 py-2">Tidak ada potongan.</p>
                                {/each}
                            </div>
                        </div>
                    </div>

                    <div class="bg-indigo-600 p-8 rounded-md text-white flex justify-between items-center shadow-lg shadow-indigo-100">
                        <div>
                            <p class="text-[9px] font-bold text-indigo-200 uppercase tracking-[0.2em] mb-1">Take Home Pay</p>
                            <h2 class="text-4xl font-black">{formatIDR(takeHomePay)}</h2>
                        </div>
                        <button class="bg-white dark:bg-slate-800 text-indigo-600 px-5 py-2.5 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-50 dark:bg-indigo-900/30 transition-all">Download Slip</button>
                    </div>

                    <div class="bg-white dark:bg-slate-800 p-6 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Payroll Components</h3>
                                <p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Tambah atau hapus komponen gaji karyawan.</p>
                            </div>
                            <button on:click={addComponent} disabled={saving} class="rounded-md bg-indigo-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-indigo-700 disabled:opacity-50">
                                {saving ? 'Saving...' : 'Add Component'}
                            </button>
                        </div>

                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div class="space-y-2">
                                <label for="component-name" class="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Name</label>
                                <input id="component-name" bind:value={salaryForm.name} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="Contoh: Tunjangan Makan" />
                            </div>
                            <div class="space-y-2">
                                <label for="component-amount" class="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Amount</label>
                                <input id="component-amount" type="number" bind:value={salaryForm.amount} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                            </div>
                            <div class="space-y-2">
                                <label for="component-type" class="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Type</label>
                                <select id="component-type" bind:value={salaryForm.type} class="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                                    <option value="addition">Addition</option>
                                    <option value="deduction">Deduction</option>
                                </select>
                            </div>
                        </div>

                        <div class="space-y-3 pt-2">
                            {#each Array.isArray(components) ? components : [] as item}
                                <div class="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 px-4 py-3">
                                    <div>
                                        <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.name || 'Komponen'}</p>
                                        <p class="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{item.type === 'addition' ? 'Addition' : 'Deduction'}</p>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class={`text-sm font-bold ${item.type === 'addition' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {item.type === 'addition' ? '+' : '-'}{formatIDR(item.amount)}
                                        </span>
                                        <button on:click={() => deleteComponent(item.id)} class="rounded-md border border-rose-200 dark:border-rose-900/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-50 dark:bg-rose-950/30">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            {:else}
                                <p class="rounded-md border border-dashed border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-400 dark:text-slate-500">Belum ada komponen gaji yang ditambahkan.</p>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}
        </main>
    </div>
</div>