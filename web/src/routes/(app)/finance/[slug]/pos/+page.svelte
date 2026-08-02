<script>
    import { goto, invalidateAll } from '$app/navigation';
    import { enhance } from '$app/forms';
    import { page } from '$app/stores';
    import { fade, scale, fly } from 'svelte/transition';
    import { flip } from 'svelte/animate';
    import { quintOut } from 'svelte/easing';
    import { onMount } from 'svelte';
    import BarcodeScanner from '$lib/components/BarcodeScanner.svelte';
    import { getIndustryGroup } from '$lib/posFeatures';
    export let data;

    // --- Barcode Scanner ---
    let scannerActive = false;
    function handleBarcodeScan(e) {
        const barcode = e.detail.barcode;
        scannerActive = false;
        const found = data.products.find(p => p.barcode === barcode || p.sku === barcode);
        if (found) addToCart(found);
        else searchTerm = barcode;
    }

    // --- Hold / Recall Order ---
    let showHoldList = false;
    let heldOrders = [];

    // --- Order History & Retur ---
    let showOrderHistoryModal = false;
    let orderHistory = [];
    let isFetchingOrders = false;

    async function fetchOrderHistory() {
        isFetchingOrders = true;
        try {
            const res = await fetch(`/finance/${$page.params.slug}/pos/orders?limit=20`);
            if (res.ok) {
                orderHistory = await res.json();
            }
        } catch (e) {
            console.error(e);
        } finally {
            isFetchingOrders = false;
        }
    }

    function openOrderHistory() {
        showOrderHistoryModal = true;
        fetchOrderHistory();
    }
    
    // --- Retur ---
    let showReturModal = false;
    let selectedOrderForRetur = null;
    let returItems = [];
    let returReason = "";
    let isSubmittingRetur = false;

    function openReturModal(order) {
        selectedOrderForRetur = order;
        returItems = order.items.map(item => ({ ...item, qty_returned: 0 }));
        returReason = "";
        showOrderHistoryModal = false;
        showReturModal = true;
    }

    async function submitRetur() {
        openWithPinCheck(async () => {
        const itemsToReturn = returItems.filter(i => i.qty_returned > 0);
        if (itemsToReturn.length === 0) return alert('Pilih minimal 1 barang untuk diretur');
        
        isSubmittingRetur = true;
        try {
            const res = await fetch(`/finance/${$page.params.slug}/pos/retur`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: selectedOrderForRetur.id,
                    items: itemsToReturn.map(i => ({
                        order_item_id: i.id,
                        product_id: i.productId,
                        qty_returned: i.qty_returned,
                        refund_amount: i.qty_returned * (Number(i.price) || 0)
                    })),
                    reason: returReason
                })
            });
            if (res.ok) {
                alert('Retur berhasil diproses');
                showReturModal = false;
                selectedOrderForRetur = null;
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal retur');
            }
        } catch (e) {
            alert(e.message);
        } finally {
            isSubmittingRetur = false;
        }
        });
    }
    
    // --- State Management ---
    let cart = [];
    let searchTerm = "";
    let discount = 0;
    let discountType = "persen"; // "persen" | "nominal"
    let voucherCodeInput = "";
    let appliedVoucher = null;
    let isApplyingVoucher = false;
    let paymentMethod = "tunai";
    let amountPaid = 0;
    let selectedCustomer = null;
    let selectedCustomerId = null;
    let receipt = null;
    let showReceipt = false;
    let showPaymentModal = false;
    let customerName = "";
    let selectedCategory = "semua";
    
    // --- Operational Features ---
    let orderType = 'TAKEAWAY';
    let tableNumber = '';
    let queueNumber = '';

    let isStaff = false;
    let isOwner = false;
    let staffName = "";
    let staffRole = null;

    // --- Shift State ---
    let activeShift = null;
    let cashierName = "Admin Kasir";
    
    // UI Modal Shift
    let modalAwalInput = 0;
    let kasAkhirInput = 0;
    let catatanShiftInput = "";
    let showTutupShiftModal = false;
    
    // UI Modal Cash Management
    let showCashModal = false;
    let cashType = 'CASH_IN';
    let cashAmount = 0;
    let cashDescription = '';

    // --- PIN Void/Retur Modal ---
    let showPinModal = false;
    let pinInput = '';
    let pinCallback = null;
    let pinError = '';

    function openWithPinCheck(callback) {
        if (!requirePinForVoid) {
            callback();
            return;
        }
        pinInput = '';
        pinError = '';
        pinCallback = callback;
        showPinModal = true;
    }

    async function verifyPin() {
        // Verifikasi PIN karyawan via API
        if (!pinInput || pinInput.length < 4) {
            pinError = 'PIN minimal 4 digit';
            return;
        }
        try {
            const res = await fetch(`/finance/${$page.params.slug}/pos/verify-pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pinInput })
            });
            const data = await res.json();
            if (data.valid) {
                showPinModal = false;
                pinCallback && pinCallback();
                pinCallback = null;
                pinInput = '';
            } else {
                pinError = 'PIN salah. Coba lagi.';
                pinInput = '';
            }
        } catch {
            // Jika endpoint belum ada, izinkan saja (graceful degradation)
            showPinModal = false;
            pinCallback && pinCallback();
            pinCallback = null;
        }
    }

    // --- Kategori unik dari produk ---
    $: categories = ["semua", ...new Set(data.products.map(p => p.nama_kategori || "Umum").filter(Boolean))];
    $: if (data) {
        isStaff = data.isStaff || false;
        isOwner = data.isOwner || false;
        staffName = data.staffName || '';
        staffRole = data.staffRole || null;
        cashierName = isStaff ? (staffName || 'Kasir') : 'Owner';
        activeShift = data.activeShift;
    }
    
    // --- Feature Flags from Configuration ---
    $: features = data.featureAktif || {};
    $: showBarcodeScanner = features.barcodeScanner || false;
    $: showTableManagement = features.tableManagement || false;
    $: showKitchenDisplay = features.kitchenDisplay || false;
    $: showAppointmentBooking = features.appointmentBooking || false;
    $: showWorkOrderTracking = features.workOrderTracking || false;
    $: allowSplitPayment = features.splitPayment || false;
    $: allowManualDiscount = features.manualDiscount || false;
    $: allowOpenPrice = features.openPrice || false;
    $: autoCalcChange = features.autoCalcChange || false;
    $: autoPrintReceipt = features.autoPrintReceipt || false;
    $: mandatoryShiftClose = features.mandatoryShiftClose || false;
    $: preventNegativeCash = features.preventNegativeCash || false;
    $: requirePinForVoid = features.requirePinForVoid || false;
    $: showStockIndicator = features.showStock || false;
    $: lowStockAlertEnabled = features.lowStockAlert || false;
    $: autoFocusSearch = features.autoFocusScanner || false;

    // --- Industry Group Detection for UI Customization ---
    $: industryGroup = getIndustryGroup(data.category);
    $: isFNB = industryGroup === 'FNB';
    $: isRetail = industryGroup === 'RETAIL';
    $: isServices = industryGroup === 'SERVICES';
    $: isTechnical = industryGroup === 'TECHNICAL';
    $: isEducation = industryGroup === 'EDUCATION';
    $: isB2B = industryGroup === 'B2B';
    $: isAgriculture = industryGroup === 'AGRICULTURE';
    $: isManufacturing = industryGroup === 'MANUFACTURING';
    $: isWholesale = industryGroup === 'WHOLESALER';

    // --- Filter Produk ---
    $: filteredBySearch = searchTerm.trim() === ""
        ? data.products
        : data.products.filter(p =>
            p.nama && p.nama.toLowerCase().includes(searchTerm.toLowerCase())
        );

    function chooseCustomer(customer) {
        selectedCustomer = customer;
        selectedCustomerId = customer?.id || null;
        customerName = customer?.nama_customer || '';
    }

    $: filteredProducts = selectedCategory === "semua"
        ? filteredBySearch
        : filteredBySearch.filter(p => (p.nama_kategori || "Umum") === selectedCategory);

    // --- Kalkulasi ---
    $: subtotal = cart.reduce((sum, item) => sum + (item.harga_jual * item.qty), 0);
    $: discountAmount = appliedVoucher
        ? (appliedVoucher.discountType === "PERCENTAGE" 
            ? Math.round(subtotal * (Number(appliedVoucher.discountValue) / 100))
            : Math.min(Number(appliedVoucher.discountValue), subtotal))
        : (discountType === "persen"
            ? Math.round(subtotal * (discount / 100))
            : Math.min(discount, subtotal));
    $: total = Math.max(0, subtotal - discountAmount);
    $: totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

    // --- Quantity Management ---
    function updateQty(id, newQty) {
        const product = data.products.find(p => p.id === id);
        if (newQty < 1) {
            cart = cart.filter(item => item.id !== id);
            return;
        }
        if (product && newQty > product.stok) {
            alert(`Stok tidak mencukupi! Maksimal: ${product.stok}`);
            return;
        }
        cart = cart.map(item =>
            item.id === id ? { ...item, qty: newQty } : item
        );
    }

    function removeFromCart(id) {
        cart = cart.filter(item => item.id !== id);
    }

    function clearCart() {
        if (cart.length === 0) return;
        if (confirm("Kosongkan seluruh keranjang?")) {
            cart = [];
        }
    }

    async function applyVoucher() {
        if (!voucherCodeInput.trim()) return;
        isApplyingVoucher = true;
        try {
            const res = await fetch(`/finance/${$page.params.slug}/pos/voucher`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: voucherCodeInput.trim(), subtotal })
            });
            const data = await res.json();
            if (res.ok) {
                appliedVoucher = data.voucher;
                alert(`Voucher ${data.voucher.code} berhasil digunakan!`);
            } else {
                appliedVoucher = null;
                alert("Gagal: " + (data.error || "Voucher tidak valid"));
            }
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            isApplyingVoucher = false;
        }
    }
    
    function removeVoucher() {
        appliedVoucher = null;
        voucherCodeInput = "";
    }

    // --- Cart Actions ---
    function addToCart(product) {
        const existingIndex = cart.findIndex(item => item.id === product.id);
        if (existingIndex !== -1) {
            updateQty(product.id, cart[existingIndex].qty + 1);
        } else {
            if (product.stok > 0) {
                cart = [...cart, { ...product, qty: 1 }];
            } else {
                alert("Stok habis!");
            }
        }
    }

    // --- Hold / Recall Order ---
    function holdCurrentOrder() {
        if (cart.length === 0) return alert("Keranjang kosong!");
        const newHold = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString('id-ID'),
            items: [...cart],
            total: total,
            customer: customerName || "Pelanggan Umum"
        };
        heldOrders = [newHold, ...heldOrders];
        cart = [];
        customerName = "";
        discount = 0;
        amountPaid = 0;
    }

    function restoreOrder(order) {
        if (cart.length > 0) {
            alert("Selesaikan atau tunda dulu pesanan yang ada di keranjang!");
            return;
        }
        cart = [...order.items];
        heldOrders = heldOrders.filter(o => o.id !== order.id);
        showHoldList = false;
    }

    function deleteHoldOrder(id) {
        heldOrders = heldOrders.filter(o => o.id !== id);
    }

    // --- Payment ---
    let payments = [{ id: 1, method: 'TUNAI', amount: 0 }];
    
    $: amountPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    $: change = Math.max(0, amountPaid - total);

    function addPaymentMethod() {
        payments = [...payments, { id: Date.now(), method: 'QRIS', amount: 0 }];
    }

    function removePaymentMethod(id) {
        if (payments.length > 1) {
            payments = payments.filter(p => p.id !== id);
        }
    }

    function openPaymentModal() {
        if (cart.length === 0) {
            alert("Keranjang masih kosong!");
            return;
        }
        // mandatoryShiftClose: staff wajib buka shift dulu sebelum transaksi
        if (mandatoryShiftClose && isStaff && !activeShift) {
            alert("⚠️ Wajib buka shift terlebih dahulu sebelum melakukan transaksi!");
            return;
        }
        // Reset payments to a single full-amount payment by default
        payments = [{ id: Date.now(), method: 'TUNAI', amount: total }];
        showPaymentModal = true;
    }

    async function processPayment() {
        if (!customerName.trim()) {
            alert("Nama Customer wajib diisi!");
            return;
        }
        if (amountPaid < total) {
            alert("Uang pembayaran belum cukup!");
            return;
        }

        const daftarBarang = cart.map(item =>
            `${item.qty}x ${item.nama} @Rp${item.harga_jual?.toLocaleString('id-ID') || 0}`
        ).join(", ");
        const keteranganSesi = `CUSTOMER: ${customerName.toUpperCase()} | ITEMS: ${daftarBarang}`;

        try {
            const res = await fetch(`/finance/${$page.params.slug}/pos`, {
                method: 'POST',
                body: JSON.stringify({
                    cart,
                    total_harga: total,
                    payments,
                    amount_paid: amountPaid,
                    change_amount: change,
                    keterangan: keteranganSesi,
                    customer_id: selectedCustomerId,
                    customer_name: customerName.trim(),
                    voucher_id: appliedVoucher ? appliedVoucher.id : null,
                    discount_value: discountAmount,
                    order_type: orderType,
                    table_number: tableNumber,
                    queue_number: queueNumber
                }),
            });

            if (res.ok) {
                const resData = await res.json().catch(() => ({}));
                receipt = {
                    id: 'TRX-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                    orderId: resData.orderId || null,
                    date: new Date().toLocaleString('id-ID'),
                    items: [...cart],
                    subtotal,
                    discount: { type: discountType, percentage: discountType === "persen" ? discount : 0, amount: discountAmount },
                    total,
                    payments: [...payments],
                    amountPaid,
                    change,
                    customer: customerName.toUpperCase(),
                    orderType,
                    tableNumber,
                    queueNumber
                };
                showReceipt = true;
                showPaymentModal = false;
                
                // Auto print receipt if feature is enabled
                if (autoPrintReceipt) {
                    setTimeout(() => window.print(), 500);
                }
            } else {
                const err = await res.json();
                alert("Error: " + (err.error || "Gagal memproses pembayaran"));
            }
        } catch (e) {
            alert("Error: " + e.message);
        }
    }

    function resetTransaction() {
        showReceipt = false;
        receipt = null;
        cart = [];
        amountPaid = 0;
        discount = 0;
        customerName = "";
        selectedCustomer = null;
    }

    function formatRupiah(num) {
        return 'Rp' + (num || 0).toLocaleString('id-ID');
    }

    onMount(() => {
        // Pusher client is now handled globally in +layout.svelte via realtimeStore
    });
</script>

<div class="flex h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 font-sans antialiased text-slate-900 dark:text-white overflow-hidden">

    <!-- ===== SIDEBAR ===== -->
    <aside class="w-16 lg:w-20 bg-slate-900 flex flex-col items-center py-5 shrink-0 z-20 shadow-2xl">
        <div class="w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-base lg:text-lg mb-6 shadow-lg shadow-blue-500/30">P</div>

        <nav class="flex flex-col gap-3 flex-1">
            <!-- POS -->
            <a href={`/finance/${$page.params.slug}/pos`}
               class="relative p-2.5 lg:p-3 rounded-xl transition-all group {$page.url.pathname.includes('/pos') && !$page.url.pathname.includes('/customers') && !$page.url.pathname.includes('/reports') ? 'text-blue-400 bg-blue-500/15' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-white hover:bg-white dark:hover:bg-slate-700/5'}">
                <svg class="w-5 h-5 lg:w-6 lg:h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                <span class="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">POS / Kasir</span>
            </a>

            <!-- Hold List -->
            <button on:click={() => showHoldList = true}
                    class="relative p-2.5 lg:p-3 rounded-xl transition-all text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-white hover:bg-white dark:hover:bg-slate-700/5 group">
                <svg class="w-5 h-5 lg:w-6 lg:h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {#if heldOrders.length > 0}
                    <span class="absolute top-1 right-1 lg:top-2 lg:right-2 w-3.5 h-3.5 lg:w-4 lg:h-4 bg-orange-500 text-[7px] lg:text-[8px] text-white flex items-center justify-center rounded-full border-2 border-slate-900 font-black animate-pulse">
                        {heldOrders.length}
                    </span>
                {/if}
                <span class="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">Pesanan Ditunda</span>
            </button>

            <!-- Active Orders / Kitchen -->
            {#if showKitchenDisplay}
                <a href={`/finance/${$page.params.slug}/pos/antrean`}
                   class="relative p-2.5 lg:p-3 rounded-xl transition-all group {$page.url.pathname.includes('/antrean') ? 'text-blue-400 bg-blue-500/15' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-white hover:bg-white dark:hover:bg-slate-700/5'}">
                    <svg class="w-5 h-5 lg:w-6 lg:h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <span class="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">Daftar Antrean / Dapur</span>
                </a>
            {/if}

            <!-- Customers -->
            <a href={`/finance/${$page.params.slug}/pos/customers`}
               class="relative p-2.5 lg:p-3 rounded-xl transition-all group {$page.url.pathname.includes('/customers') ? 'text-blue-400 bg-blue-500/15' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-white hover:bg-white dark:hover:bg-slate-700/5'}">
                <svg class="w-5 h-5 lg:w-6 lg:h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                <span class="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">Pelanggan</span>
            </a>

            <!-- Reports -->
            <a href={`/finance/${$page.params.slug}/pos/reports`}
               class="relative p-2.5 lg:p-3 rounded-xl transition-all group {$page.url.pathname.includes('/reports') ? 'text-blue-400 bg-blue-500/15' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-white hover:bg-white dark:hover:bg-slate-700/5'}">
                <svg class="w-5 h-5 lg:w-6 lg:h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                <span class="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">Laporan</span>
            </a>

            <!-- Kelola POS -->
            {#if isOwner || (isStaff && ['owner', 'manager', 'admin'].includes(staffRole))}
            <a href={`/finance/${$page.params.slug}/pos/kelola`}
               class="relative p-2.5 lg:p-3 rounded-xl transition-all group text-slate-500 dark:text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10">
                <svg class="w-5 h-5 lg:w-6 lg:h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span class="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">Kelola POS</span>
            </a>
            {/if}
        </nav>

        <!-- Logout / Shift -->
        {#if isStaff}
            <div class="flex flex-col gap-2">
                <button type="button" on:click={() => showCashModal = true}
                    class="w-12 h-12 flex items-center justify-center rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white transition group relative"
                    title="Kelola Kas">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span class="absolute left-16 top-1/2 -translate-y-1/2 bg-orange-500 text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">Kas In/Out</span>
                </button>
                <button type="button" on:click={() => showTutupShiftModal = true}
                    class="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition group relative"
                    title="Tutup Shift">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span class="absolute left-16 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">Tutup Shift</span>
                </button>
            </div>
        {:else}
            <button on:click={() => goto(`/finance/${$page.params.slug}`)}
                    class="p-2.5 lg:p-3 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-200/50 rounded-xl transition-all group relative"
                    title="Kembali ke Dashboard">
                <svg class="w-5 h-5 lg:w-6 lg:h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                <span class="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">Kembali ke Dashboard</span>
            </button>
        {/if}
    </aside>

    <!-- ===== MAIN CONTENT ===== -->
    <main class="flex-1 flex flex-col min-w-0">
        <!-- Header -->
        <header class="h-14 lg:h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/60 px-4 lg:px-6 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-4 lg:gap-6">
                <div>
                    <h1 class="text-xs lg:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter leading-none">
                        {#if isFNB}POS Restoran
                        {:else if isRetail}POS Retail
                        {:else if isServices}POS Layanan
                        {:else if isTechnical}POS Bengkel
                        {:else if isEducation}POS Pendidikan
                        {:else if isB2B}POS B2B
                        {:else if isAgriculture}POS Pertanian
                        {:else if isManufacturing}POS Produksi
                        {:else if isWholesale}POS Grosir
                        {:else}{isStaff ? 'POS Karyawan' : 'POS Owner'}
                        {/if}
                    </h1>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        <p class="text-[8px] lg:text-[9px] font-bold text-green-600 uppercase tracking-widest">
                            {isStaff ? `Shift Active: ${cashierName}` : `Owner: ${cashierName}`}
                        </p>
                    </div>
                    {#if isStaff}
                        <p class="text-[8px] lg:text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Role: {staffRole || 'kasir'}</p>
                    {:else}
                        <p class="text-[8px] lg:text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Mode Pemilik</p>
                    {/if}
                </div>

                <!-- Quick Hold Recall — tersedia untuk owner dan staff -->
                {#if heldOrders.length > 0}
                    <div class="hidden md:flex gap-1.5">
                        {#each heldOrders as ho}
                            <button on:click={() => restoreOrder(ho)}
                                    class="px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-lg text-[9px] font-bold text-orange-600 hover:bg-orange-100 transition-all truncate max-w-[120px]"
                                    title="{ho.customer} - {ho.items.length} item">
                                <span class="opacity-50 mr-1">#</span>{ho.id.toString().slice(-4)}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Search + Barcode Scanner -->
            <div class="flex items-center gap-2">
                <!-- Industry-specific quick actions -->
                {#if isFNB}
                    <button title="Meja"
                            class="p-2 lg:p-2.5 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl transition-all">
                        <svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                    </button>
                {:else if isServices}
                    <button title="Jadwal"
                            class="p-2 lg:p-2.5 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl transition-all">
                        <svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </button>
                {:else if isTechnical}
                    <button title="Work Order"
                            class="p-2 lg:p-2.5 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl transition-all">
                        <svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    </button>
                {:else if isEducation}
                    <button title="Kelas"
                            class="p-2 lg:p-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl transition-all">
                        <svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                    </button>
                {:else if isB2B}
                    <button title="Quotation"
                            class="p-2 lg:p-2.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all">
                        <svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </button>
                {:else if isAgriculture}
                    <button title="Panen"
                            class="p-2 lg:p-2.5 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl transition-all">
                        <svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/></svg>
                    </button>
                {:else if isManufacturing}
                    <button title="Produksi"
                            class="p-2 lg:p-2.5 bg-slate-50 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-900/30 text-slate-600 dark:text-slate-400 rounded-xl transition-all">
                        <svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                    </button>
                {/if}

                <button on:click={openOrderHistory}
                        title="Riwayat Transaksi & Retur"
                        class="p-2 lg:p-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 text-slate-400 dark:text-slate-500 rounded-xl transition-all mr-1 lg:mr-2">
                    <svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
                <div class="relative w-48 lg:w-72 xl:w-88">
                    <input type="text" bind:value={searchTerm}
                           autofocus={autoFocusSearch}
                           placeholder="{isRetail ? 'Cari produk / barcode...' : isServices ? 'Cari layanan / paket...' : isTechnical ? 'Cari jasa / sparepart...' : isEducation ? 'Cari kursus / kelas...' : 'Cari produk...'}"
                           class="w-full bg-slate-100 dark:bg-slate-800/80 border-none rounded-xl py-2 lg:py-2.5 pl-9 lg:pl-10 pr-4 text-[11px] lg:text-xs focus:ring-2 focus:ring-blue-500/20 transition-all outline-none placeholder:text-slate-400 dark:text-slate-500"/>
                    <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <!-- Barcode Scanner Button -->
                {#if showBarcodeScanner}
                <button on:click={() => scannerActive = true}
                        title="Scan Barcode"
                        class="p-2 lg:p-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 text-slate-400 dark:text-slate-500 rounded-xl transition-all">
                    <svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7V5a2 2 0 012-2h2M3 17v2a2 2 0 002 2h2M17 3h2a2 2 0 012 2v2M17 21h2a2 2 0 002-2v-2M7 9h10M7 12h4M7 15h7"/>
                    </svg>
                </button>
                {/if}
            </div>
        </header>

        <!-- Body -->
        <div class="flex-1 flex overflow-hidden">
            <!-- Product Grid -->
            <section class="flex-1 flex flex-col overflow-hidden">
                <!-- Category Filter -->
                <div class="px-4 lg:px-6 pt-3 lg:pt-4 pb-2 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-hide">
                    {#each categories as cat}
                        <button on:click={() => selectedCategory = cat}
                                class="shrink-0 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-wide transition-all
                                {selectedCategory === cat
                                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700'}">
                            {cat}
                        </button>
                    {/each}
                </div>

                <!-- Products -->
                <div class="flex-1 overflow-y-auto px-4 lg:px-6 py-3 custom-scrollbar">
                    {#if filteredProducts.length === 0}
                        <div class="flex flex-col items-center justify-center h-full text-center py-20">
                            <svg class="w-16 h-16 text-slate-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            <p class="text-sm font-bold text-slate-300 uppercase tracking-widest">{isServices ? 'Layanan tidak ditemukan' : isTechnical ? 'Jasa/Sparepart tidak ditemukan' : isEducation ? 'Kursus tidak ditemukan' : 'Produk tidak ditemukan'}</p>
                        </div>
                    {:else}
                        <div class="grid {isFNB ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'} gap-3 lg:gap-5">
                            {#each filteredProducts as p (p.id)}
                                <button on:click={() => addToCart(p)}
                                        disabled={p.stok === 0 && !isServices && !isEducation}
                                        class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 text-left group overflow-hidden flex flex-col disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                                        animate:flip={{duration: 300}}>
                                    <div class="{isFNB ? 'aspect-square' : 'aspect-[4/3]'} bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden relative">
                                        {#if p.foto}
                                            <img src={p.foto} alt={p.nama} class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                                        {:else}
                                            <span class="text-3xl lg:text-4xl font-black text-slate-200 uppercase">{p.nama.substring(0, 2)}</span>
                                        {/if}
                                        {#if lowStockAlertEnabled && p.stok <= 5 && p.stok > 0}
                                            <span class="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-sm">Sisa {p.stok}</span>
                                        {/if}
                                        {#if isServices || isEducation}
                                            <span class="absolute bottom-2 right-2 bg-blue-500 text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-sm">
                                                {isServices ? 'Layanan' : 'Kursus'}
                                            </span>
                                        {/if}
                                    </div>
                                    <div class="p-3 lg:p-5 flex-1 flex flex-col justify-between gap-2">
                                        <h3 class="text-xs lg:text-sm font-black text-slate-800 dark:text-slate-100 uppercase leading-tight line-clamp-2">{p.nama}</h3>
                                        {#if isFNB}
                                            <p class="text-[9px] text-slate-400 line-clamp-1">{p.deskripsi || ''}</p>
                                        {/if}
                                        <div class="flex items-center justify-between gap-1 mt-1">
                                            <span class="text-sm lg:text-base font-black text-blue-600 font-mono italic">{formatRupiah(p.harga_jual)}</span>
                                            {#if showStockIndicator && !isServices && !isEducation}
                                                <span class="text-[9px] lg:text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                                                    STOK: <b class={p.stok === 0 ? 'text-red-500' : p.stok < 10 ? 'text-orange-500' : 'text-slate-600 dark:text-slate-300'}>{p.stok}</b>
                                                </span>
                                            {:else if isServices || isEducation}
                                                <span class="text-[9px] lg:text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                                                    Tersedia
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>
            </section>

            <!-- ===== CART SIDEBAR (RIGHT) ===== -->
            <aside class="w-80 lg:w-96 xl:w-[420px] bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0 shadow-2xl shadow-slate-200/50">
                <!-- Customer Input -->
                <div class="px-4 lg:px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Data Pelanggan</span>
                        <span class="text-[9px] font-bold text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full">{totalItems} item</span>
                    </div>
                    <div class="space-y-2">
                        <div class="flex gap-2">
                            <input type="text" bind:value={customerName}
                                   placeholder="Nama customer..."
                                   class="flex-1 text-[11px] font-bold text-blue-600 uppercase bg-transparent border-b-2 border-blue-100 focus:border-blue-500 outline-none pb-1 placeholder:text-slate-300"/>
                            <button type="button" on:click={() => { selectedCustomer = null; selectedCustomerId = null; customerName = ''; }}
                                    class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-blue-600 transition">Reset</button>
                        </div>
                        {#if data.customers && data.customers.length > 0}
                            <div class="grid grid-cols-2 gap-2 text-[9px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                {#each data.customers.slice(0, 6) as customer}
                                    <button type="button" on:click={() => chooseCustomer(customer)}
                                            class="truncate rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.08em] hover:border-blue-300 hover:bg-blue-50 transition">
                                        {customer.nama_customer}
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Cart Items -->
                <div class="flex-1 overflow-y-auto px-4 lg:px-5 py-3 space-y-2 custom-scrollbar">
                    {#if cart.length === 0}
                        <div class="flex flex-col items-center justify-center h-full text-center py-16">
                            <svg class="w-14 h-14 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                            <p class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{isServices ? 'Tidak ada layanan' : isEducation ? 'Tidak ada kursus' : isTechnical ? 'Tidak ada jasa' : 'Keranjang kosong'}</p>
                            <p class="text-[9px] text-slate-200 mt-1">{isServices ? 'Pilih layanan untuk ditambahkan' : isEducation ? 'Pilih kursus untuk ditambahkan' : isTechnical ? 'Pilih jasa/sparepart' : 'Klik produk untuk menambah'}</p>
                        </div>
                    {:else}
                        {#each cart as item (item.id)}
                            <div class="flex items-center gap-3 p-2.5 lg:p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-blue-100 hover:shadow-md transition-all group"
                                 in:fly={{x: 20, duration: 200, delay: 50 * cart.indexOf(item)}}
                                 animate:flip={{duration: 300}}>
                                <div class="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center font-black text-slate-300 text-[9px] lg:text-[10px] overflow-hidden shrink-0">
                                {#if item.foto}
                                        <img src={item.foto} alt="" class="w-full h-full object-cover"/>
                                    {:else}
                                        {item.nama.slice(0, 2)}
                                    {/if}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h4 class="text-[10px] lg:text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase truncate leading-tight">{item.nama}</h4>
                                    {#if isFNB}
                                        <p class="text-[8px] text-slate-400 mt-0.5">{item.catatan || ''}</p>
                                    {/if}
                                    {#if isTechnical}
                                        <p class="text-[8px] text-orange-500 mt-0.5">{item.jenis || 'Jasa'}</p>
                                    {/if}
                                    {#if allowOpenPrice}
                                        <input type="number" bind:value={item.harga_jual} class="w-full text-[9px] lg:text-[10px] font-bold text-blue-600 mt-0.5 italic bg-transparent border-b border-blue-200 focus:border-blue-500 outline-none" />
                                    {:else}
                                        <p class="text-[9px] lg:text-[10px] font-bold text-blue-600 mt-0.5 italic">{formatRupiah(item.harga_jual)}</p>
                                    {/if}
                                </div>
                                <div class="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg p-0.5">
                                    <button on:click={() => updateQty(item.id, item.qty - 1)}
                                            class="w-6 h-6 lg:w-7 lg:h-7 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-800 rounded-md text-[11px] lg:text-xs transition-all text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 dark:text-slate-100 font-bold">−</button>
                                    <span class="w-7 lg:w-8 text-center text-[11px] lg:text-xs font-black italic text-slate-800 dark:text-slate-100">{item.qty}</span>
                                    <button on:click={() => updateQty(item.id, item.qty + 1)}
                                            class="w-6 h-6 lg:w-7 lg:h-7 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-800 rounded-md text-[11px] lg:text-xs transition-all text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 dark:text-slate-100 font-bold">+</button>
                                </div>
                                <button on:click={() => removeFromCart(item.id)}
                                        class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-1">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </div>
                        {/each}
                    {/if}
                </div>

                <!-- Cart Footer -->
                <div class="px-4 lg:px-5 py-4 lg:py-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800">
                    <!-- Subtotal & Discount -->
                    <div class="space-y-2 mb-4">
                        <div class="flex justify-between items-center text-[9px] lg:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                            <span>Subtotal ({totalItems} {isServices ? 'layanan' : isEducation ? 'kursus' : isTechnical ? 'jasa' : 'item'})</span>
                            <span class="text-slate-700 dark:text-slate-200 font-mono">{formatRupiah(subtotal)}</span>
                        </div>

                        <!-- Industry-specific additional info -->
                        {#if isFNB}
                            <div class="flex justify-between items-center text-[9px] font-bold text-amber-600">
                                <span>Order Type</span>
                                <span class="uppercase">{orderType}</span>
                            </div>
                        {/if}
                        {#if isB2B}
                            <div class="flex justify-between items-center text-[9px] font-bold text-indigo-600">
                                <span>PO Number</span>
                                <span class="font-mono">PO-{Date.now().toString().slice(-6)}</span>
                            </div>
                        {/if}

                        <!-- Discount & Voucher -->
                        <div class="space-y-2">
                            {#if appliedVoucher}
                                <div class="flex items-center justify-between bg-green-50 dark:bg-green-900/30 rounded-xl p-2 border border-green-100 dark:border-green-800">
                                    <div class="flex items-center gap-2">
                                        <span class="text-[9px] font-bold text-green-600 uppercase shrink-0">Voucher</span>
                                        <span class="text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded uppercase tracking-wider">{appliedVoucher.code}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-[10px] font-bold text-red-500">-{formatRupiah(discountAmount)}</span>
                                        <button class="text-red-400 hover:text-red-600 font-bold px-1" on:click={removeVoucher}>✕</button>
                                    </div>
                                </div>
                            {:else}
                                {#if allowManualDiscount}
                                <div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl p-2">
                                    <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0">Diskon</span>
                                    <div class="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <button on:click={() => { discountType = 'persen'; discount = 0; }}
                                                class="px-2 py-1 text-[9px] font-bold uppercase transition-all {discountType === 'persen' ? 'bg-slate-900 text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300'}">%</button>
                                        <button on:click={() => { discountType = 'nominal'; discount = 0; }}
                                                class="px-2 py-1 text-[9px] font-bold uppercase transition-all {discountType === 'nominal' ? 'bg-slate-900 text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300'}">Rp</button>
                                    </div>
                                    <input type="number" bind:value={discount} min="0"
                                           class="w-16 lg:w-20 text-[10px] lg:text-[11px] font-bold text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-200"/>
                                    <span class="text-[9px] font-bold text-red-500">-{formatRupiah(discountAmount)}</span>
                                </div>
                                {/if}
                                <div class="flex items-center gap-2">
                                    <input type="text" bind:value={voucherCodeInput} placeholder="Kode Voucher..." class="flex-1 text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 uppercase outline-none focus:border-blue-400">
                                    <button on:click={applyVoucher} disabled={isApplyingVoucher || !voucherCodeInput} class="px-3 py-1.5 bg-blue-100 text-blue-600 text-[9px] font-black uppercase rounded-lg hover:bg-blue-200 disabled:opacity-50">Pakai</button>
                                </div>
                            {/if}
                        </div>

                        <!-- Total -->
                        <div class="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span class="text-[10px] lg:text-xs font-black text-slate-800 dark:text-slate-100 uppercase">Total</span>
                            <span class="text-xl lg:text-2xl font-black text-blue-600 font-mono tracking-tighter italic">{formatRupiah(total)}</span>
                        </div>
                    </div>

                    <!-- Table Management (F&B) — tampil saat fitur aktif -->
                    {#if showTableManagement}
                    <div class="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50 space-y-2">
                        <p class="text-[9px] font-black text-amber-700 uppercase tracking-widest">Pengaturan Order</p>
                        <div class="grid grid-cols-3 gap-1.5">
                            {#each ['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as type}
                                <button type="button"
                                    on:click={() => orderType = type}
                                    class="py-1.5 rounded-lg text-[9px] font-black uppercase transition-all {orderType === type ? 'bg-amber-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-amber-200 dark:border-amber-800'}">
                                    {type === 'DINE_IN' ? 'Makan Di Sini' : type === 'TAKEAWAY' ? 'Bawa Pulang' : 'Delivery'}
                                </button>
                            {/each}
                        </div>
                        {#if orderType === 'DINE_IN'}
                            <div class="flex items-center gap-2">
                                <label class="text-[9px] font-bold text-amber-700 uppercase shrink-0">No. Meja</label>
                                <input type="text" bind:value={tableNumber} placeholder="Cth: A1, 5, VIP..." maxlength="10"
                                    class="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-amber-300 uppercase" />
                            </div>
                        {:else if orderType === 'DELIVERY'}
                            <div class="flex items-center gap-2">
                                <label class="text-[9px] font-bold text-amber-700 uppercase shrink-0">No. Antrean</label>
                                <input type="text" bind:value={queueNumber} placeholder="Cth: D-001..." maxlength="10"
                                    class="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-amber-300 uppercase" />
                            </div>
                        {/if}
                    </div>
                    {/if}

                    <!-- Action Buttons — Owner dan Staff sama-sama bisa kasir -->
                    <!-- Bedanya: Staff punya Hold & Shift management, Owner langsung bisa bayar -->
                    <div class="grid grid-cols-2 gap-2 lg:gap-3 mt-2">
                        <button on:click={holdCurrentOrder}
                                disabled={cart.length === 0}
                                class="py-3 lg:py-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] md:text-xs hover:border-orange-200 hover:text-orange-500 hover:bg-orange-50/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            {isB2B ? 'Simpan Draft' : 'Tunda'}
                        </button>
                        <button on:click={openPaymentModal}
                                disabled={cart.length === 0}
                                class="py-3 lg:py-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white font-black uppercase text-[10px] md:text-xs shadow-xl shadow-slate-200 hover:shadow-2xl hover:shadow-slate-300 hover:from-black hover:to-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            {isB2B ? 'Buat Invoice' : isServices ? 'Booking' : isEducation ? 'Daftar' : 'Bayar'}
                        </button>
                    </div>

                    {#if cart.length > 0}
                        <button on:click={clearCart}
                                class="w-full mt-3 py-2 text-[9px] md:text-[10px] font-bold text-slate-300 hover:text-red-500 uppercase tracking-widest transition-all">
                            {isServices ? 'Hapus Layanan' : isEducation ? 'Hapus Kursus' : isTechnical ? 'Hapus Jasa' : 'Kosongkan Keranjang'}
                        </button>
                    {/if}
                </div>
            </aside>
        </div>
    </main>
</div>

<!-- ===== PAYMENT MODAL ===== -->
{#if showPaymentModal}
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4"
         in:fade={{duration: 200}}
         out:fade={{duration: 150}}>
        <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 lg:p-8"
             in:scale={{duration: 200, start: 0.95, easing: quintOut}}>
            <!-- Header -->
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg lg:text-xl font-black text-slate-800 dark:text-slate-100 uppercase">Pilih Pembayaran</h2>
                <span class="text-2xl font-black text-blue-600 font-mono italic">{formatRupiah(total)}</span>
            </div>

            <!-- Order Type & Operational Fields -->
            {#if showTableManagement || showKitchenDisplay || isFNB || isServices || isEducation || isTechnical}
            <div class="mb-6 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                {#if isFNB}
                    <div class="flex gap-2 mb-4">
                        <button class="flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all {orderType === 'DINE_IN' ? 'bg-amber-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}" on:click={() => orderType = 'DINE_IN'}>Dine In</button>
                        <button class="flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all {orderType === 'TAKEAWAY' ? 'bg-amber-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}" on:click={() => orderType = 'TAKEAWAY'}>Takeaway</button>
                        <button class="flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all {orderType === 'DELIVERY' ? 'bg-amber-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}" on:click={() => orderType = 'DELIVERY'}>Delivery</button>
                    </div>
                {/if}

                <div class="grid grid-cols-2 gap-4">
                    {#if isFNB && orderType === 'DINE_IN'}
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nomor Meja</label>
                        <input type="text" bind:value={tableNumber} placeholder="Cth: 12" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none"/>
                    </div>
                    {/if}
                    {#if isFNB && showKitchenDisplay}
                    <div class={(!showTableManagement || orderType !== 'DINE_IN') ? 'col-span-2' : ''}>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nomor Antrean</label>
                        <div class="flex gap-2">
                            <input type="text" bind:value={queueNumber} placeholder="Auto atau isi manual" class="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none"/>
                            <button type="button" on:click={() => queueNumber = String(Math.floor(Math.random() * 900) + 100)}
                                class="px-3 py-2 bg-amber-100 text-amber-700 rounded-xl text-[9px] font-black uppercase hover:bg-amber-200 transition">Auto</button>
                        </div>
                    </div>
                    {/if}
                    {#if isServices}
                    <div class="col-span-2">
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tanggal & Waktu</label>
                        <input type="datetime-local" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none"/>
                    </div>
                    {/if}
                    {#if isEducation}
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Sesi / Batch</label>
                        <select class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none">
                            <option>Pilih Sesi</option>
                            <option>Sesi Pagi (08:00 - 12:00)</option>
                            <option>Sesi Siang (13:00 - 17:00)</option>
                            <option>Sesi Malam (18:00 - 21:00)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Instruktur</label>
                        <select class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none">
                            <option>Pilih Instruktur</option>
                            <option>Instruktur A</option>
                            <option>Instruktur B</option>
                        </select>
                    </div>
                    {/if}
                    {#if isTechnical}
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">No. Polisi / Unit</label>
                        <input type="text" placeholder="B 1234 ABC" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none"/>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Estimasi Selesai</label>
                        <input type="datetime-local" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none"/>
                    </div>
                    {/if}
                    {#if isB2B}
                    <div class="col-span-2">
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">PO Reference</label>
                        <input type="text" placeholder="PO Number dari klien" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none"/>
                    </div>
                    {/if}
                    {#if isAgriculture}
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Batch Number</label>
                        <input type="text" placeholder="BTH-2024-001" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none"/>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tanggal Panen</label>
                        <input type="date" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none"/>
                    </div>
                    {/if}
                    {#if isManufacturing}
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Production Order</label>
                        <input type="text" placeholder="PO-PROD-001" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none"/>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Line / Workstation</label>
                        <select class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none">
                            <option>Pilih Line</option>
                            <option>Line A - Assembly</option>
                            <option>Line B - Packaging</option>
                            <option>Line C - Quality Control</option>
                        </select>
                    </div>
                    {/if}
                    {#if isWholesale}
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Term Pembayaran</label>
                        <select class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none">
                            <option>COD</option>
                            <option>Net 7</option>
                            <option>Net 14</option>
                            <option>Net 30</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Diskon Volume</label>
                        <select class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none">
                            <option>Tidak ada</option>
                            <option>5% (≥ 1 juta)</option>
                            <option>10% (≥ 5 juta)</option>
                            <option>15% (≥ 10 juta)</option>
                        </select>
                    </div>
                    {/if}
                </div>
            </div>
            {/if}

            <!-- Split Payments List -->
            {#if allowSplitPayment}
            <div class="space-y-4 mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {#each payments as p, idx (p.id)}
                    <div class="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl relative">
                        {#if payments.length > 1}
                            <button class="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-[10px] hover:bg-red-500 hover:text-white transition" on:click={() => removePaymentMethod(p.id)}>
                                ✕
                            </button>
                        {/if}
                        <div class="flex gap-3 items-center">
                            <select bind:value={p.method} class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase rounded-lg px-3 py-3 w-1/3 outline-none focus:border-blue-400">
                                <option value="TUNAI">💵 Tunai</option>
                                <option value="QRIS">📱 QRIS</option>
                                <option value="DEBIT">💳 Debit</option>
                            </select>
                            <div class="relative w-2/3">
                                <input type="number" bind:value={p.amount}
                                       class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-3 px-8 text-sm lg:text-base font-black text-slate-800 dark:text-slate-100 outline-none focus:border-blue-400 transition-all"
                                       placeholder="0"/>
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">Rp</span>
                            </div>
                        </div>
                        {#if p.method === 'TUNAI' && p.amount > 0 && payments.length === 1}
                            <div class="flex gap-1 mt-3 overflow-x-auto scrollbar-hide py-1">
                                {#each [Math.ceil(total/1000)*1000, Math.ceil(total/1000)*1000 + 5000, Math.ceil(total/1000)*1000 + 10000, Math.ceil(total/1000)*1000 + 20000] as quick}
                                    {#if quick > total}
                                        <button on:click={() => p.amount = quick} class="shrink-0 px-3 py-1.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold hover:bg-blue-100 transition">
                                            {formatRupiah(quick)}
                                        </button>
                                    {/if}
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>

            <button on:click={addPaymentMethod} class="w-full mb-6 py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 font-bold text-[10px] uppercase rounded-xl hover:border-blue-300 hover:text-blue-500 transition">
                + Tambah Split Payment
            </button>
            {/if}

            <!-- Summary & Change -->
            <div class="space-y-3 mb-6">
                <div class="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Bayar</span>
                    <span class="text-sm lg:text-base font-black text-slate-800 dark:text-white font-mono">{formatRupiah(amountPaid)}</span>
                </div>
                {#if autoCalcChange && change >= 0}
                    <div class="flex justify-between items-center p-3 lg:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                        <span class="text-[9px] lg:text-[10px] font-black text-green-600 uppercase">Kembalian</span>
                        <span class="text-lg lg:text-xl font-black text-green-700 font-mono italic">{formatRupiah(change)}</span>
                    </div>
                {:else if change >= 0}
                    <div class="p-3 bg-red-50 rounded-xl border border-red-100">
                        <p class="text-[9px] font-bold text-red-500 text-center uppercase">Uang belum cukup! Kurang {formatRupiah(Math.abs(change))}</p>
                    </div>
                {/if}
            </div>

            <!-- Actions -->
            <div class="flex gap-3 mt-4">
                <button on:click={() => showPaymentModal = false}
                        class="flex-1 py-3 lg:py-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] lg:text-xs hover:bg-slate-200 transition-all">
                    Batal
                </button>
                <button on:click={processPayment}
                        disabled={amountPaid < total}
                        class="flex-[2] py-3 lg:py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase text-[10px] lg:text-xs shadow-xl shadow-blue-200 hover:shadow-2xl hover:shadow-blue-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    Konfirmasi Bayar
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- ===== RECEIPT MODAL ===== -->
{#if showReceipt && receipt}
    <div class="receipt-print-area fixed inset-0 z-[110] flex items-center justify-center bg-white/90 backdrop-blur-sm p-4 receipt-backdrop"
         in:fade={{duration: 300}}>
        <div class="receipt-card max-w-md w-full text-center" in:scale={{duration: 300, start: 0.9, easing: quintOut}}>
            <!-- Success Icon -->
            <div class="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white text-2xl lg:text-3xl mx-auto mb-4 lg:mb-5 shadow-2xl shadow-green-200">
                <svg class="w-8 h-8 lg:w-10 lg:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
            </div>
            <h2 class="text-xl lg:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">Pembayaran Sukses!</h2>
            <p class="text-[9px] lg:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{receipt.date}</p>
            <p class="text-[10px] font-bold text-blue-600 uppercase mb-6 lg:mb-8">{receipt.customer}</p>

            <!-- Order Info -->
            <div class="flex flex-wrap items-center justify-center gap-2 mb-6">
                {#if isFNB}
                    <span class="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-[9px] font-bold text-amber-600 uppercase tracking-widest border border-amber-100 dark:border-amber-800">{receipt.orderType || 'TAKEAWAY'}</span>
                    {#if receipt.queueNumber}
                        <span class="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-[9px] font-bold text-blue-600 uppercase tracking-widest border border-blue-100 dark:border-blue-800">Antrean: {receipt.queueNumber}</span>
                    {/if}
                    {#if receipt.tableNumber && receipt.orderType === 'DINE_IN'}
                        <span class="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-[9px] font-bold text-emerald-600 uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">Meja: {receipt.tableNumber}</span>
                    {/if}
                {:else if isServices}
                    <span class="px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-[9px] font-bold text-purple-600 uppercase tracking-widest border border-purple-100 dark:border-purple-800">Layanan</span>
                {:else if isTechnical}
                    <span class="px-2.5 py-1 bg-orange-50 dark:bg-orange-900/30 rounded-lg text-[9px] font-bold text-orange-600 uppercase tracking-widest border border-orange-100 dark:border-orange-800">Work Order</span>
                {:else if isEducation}
                    <span class="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-[9px] font-bold text-blue-600 uppercase tracking-widest border border-blue-100 dark:border-blue-800">Pendaftaran Kursus</span>
                {:else if isB2B}
                    <span class="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-[9px] font-bold text-indigo-600 uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">Invoice</span>
                {:else if isAgriculture}
                    <span class="px-2.5 py-1 bg-green-50 dark:bg-green-900/30 rounded-lg text-[9px] font-bold text-green-600 uppercase tracking-widest border border-green-100 dark:border-green-800">Batch: {receipt.batchNumber || 'N/A'}</span>
                {:else if isManufacturing}
                    <span class="px-2.5 py-1 bg-slate-50 dark:bg-slate-900/30 rounded-lg text-[9px] font-bold text-slate-600 uppercase tracking-widest border border-slate-100 dark:border-slate-800">PO: {receipt.productionOrder || 'N/A'}</span>
                {:else if isWholesale}
                    <span class="px-2.5 py-1 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-[9px] font-bold text-teal-600 uppercase tracking-widest border border-teal-100 dark:border-teal-800">Grosir</span>
                {:else}
                    <span class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-700">{receipt.orderType || 'RETAIL'}</span>
                {/if}
            </div>

            <!-- Receipt Detail -->
            <div class="border-y-2 border-dashed border-slate-100 dark:border-slate-800 py-5 lg:py-6 text-left space-y-2.5 mb-6 lg:mb-8">
                {#each receipt.items as item}
                    <div class="flex justify-between text-[10px] lg:text-xs font-bold">
                        <span class="text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase truncate mr-2">{item.qty}x {item.nama}</span>
                        <span class="text-slate-800 dark:text-slate-100 font-mono shrink-0">{formatRupiah(item.qty * item.harga_jual)}</span>
                    </div>
                {/each}

                {#if receipt.discount.amount > 0}
                    <div class="flex justify-between text-[10px] font-bold text-red-500 pt-2 border-t border-slate-50 dark:border-slate-800">
                        <span>Diskon {receipt.discount.type === 'persen' ? `(${receipt.discount.percentage}%)` : ''}</span>
                        <span class="font-mono">-{formatRupiah(receipt.discount.amount)}</span>
                    </div>
                {/if}

                <div class="flex justify-between text-sm lg:text-base font-black border-t-2 border-slate-200 dark:border-slate-700 pt-3 mt-2 receipt-total">
                    <span class="uppercase italic">Total</span>
                    <span class="text-blue-600 font-mono">{formatRupiah(receipt.total)}</span>
                </div>

                {#each receipt.payments as p}
                    <div class="flex justify-between text-[9px] lg:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        <span>{p.method}</span>
                        <span class="font-mono">{formatRupiah(p.amount)}</span>
                    </div>
                {/each}
                {#if receipt.change > 0}
                    <div class="flex justify-between text-[9px] lg:text-[10px] font-bold text-green-600 uppercase">
                        <span>Kembalian</span>
                        <span class="font-mono">{formatRupiah(receipt.change)}</span>
                    </div>
                {/if}
            </div>

            <!-- Actions — disembunyikan saat print -->
            <div class="receipt-actions grid grid-cols-4 gap-2">
                <button on:click={() => window.print()}
                        class="py-3 lg:py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-black uppercase text-[9px] lg:text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-all flex items-center justify-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                    Cetak
                </button>
                <button on:click={() => {
                        const text = `Halo, terima kasih telah berbelanja!\nTotal belanja Anda: Rp ${receipt.total.toLocaleString('id-ID')}\nDetail pesanan dapat dilihat pada struk.\n\nSimpan pesan ini sebagai bukti pembayaran.`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                        class="py-3 lg:py-4 rounded-2xl border-2 border-green-200 dark:border-green-800 text-green-600 dark:text-green-500 font-black uppercase text-[9px] lg:text-[10px] tracking-widest hover:bg-green-50 dark:hover:bg-green-900/30 transition-all flex items-center justify-center gap-1.5">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.003 21.053h-.002c-1.547 0-3.059-.415-4.386-1.201l-.314-.187-3.262.856.87-3.18-.205-.326c-.856-1.364-1.309-2.943-1.309-4.57 0-4.733 3.847-8.583 8.582-8.583 2.296 0 4.453.896 6.074 2.518 1.621 1.623 2.515 3.78 2.515 6.077 0 4.73-3.847 8.58-8.58 8.58l.017-.004zm0-17.16C7.272 3.893 3.42 7.743 3.42 12.478c0 1.512.395 2.988 1.144 4.288l-1.363 4.978 5.093-1.336c1.258.69 2.68 1.053 4.142 1.053h.004c5.23 0 9.489-4.258 9.489-9.486 0-2.535-1.018-4.915-2.812-6.705-1.792-1.79-4.172-2.777-6.706-2.777h-.408z"/></svg>
                    Kirim WA
                </button>
                {#if receipt?.orderId}
                <button on:click={() => window.open(`/api/invoice/${receipt.orderId}?type=pos`, '_blank')}
                        class="py-3 lg:py-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 text-indigo-600 font-black uppercase text-[9px] lg:text-[10px] tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all flex items-center justify-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    Invoice
                </button>
                {/if}
                <button on:click={resetTransaction}
                        class="py-3 lg:py-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white font-black uppercase text-[9px] lg:text-[10px] tracking-widest shadow-xl shadow-slate-200 hover:shadow-2xl transition-all flex items-center justify-center gap-1.5 {receipt?.orderId ? '' : 'col-span-2'}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    Selesai
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- ===== HOLD LIST MODAL ===== -->
{#if showHoldList}
    <div class="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
         in:fade={{duration: 200}}
         out:fade={{duration: 150}}>
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-5 lg:p-6"
             in:scale={{duration: 200, start: 0.95}}>
            <div class="flex items-center justify-between mb-5">
                <h2 class="text-sm lg:text-base font-black text-slate-800 dark:text-slate-100 uppercase italic flex items-center gap-2">
                    <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Pesanan Ditunda
                    {#if heldOrders.length > 0}
                        <span class="text-[9px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">{heldOrders.length}</span>
                    {/if}
                </h2>
                <button on:click={() => showHoldList = false}
                        class="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/80 rounded-lg transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            {#if heldOrders.length === 0}
                <div class="py-12 text-center">
                    <svg class="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Tidak ada pesanan ditunda</p>
                </div>
            {:else}
                <div class="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {#each heldOrders as order}
                        <div class="p-3 lg:p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-orange-200 hover:bg-orange-50/30 transition-all flex justify-between items-center group"
                             in:fly={{x: -20, duration: 200}}>
                            <div class="text-left min-w-0 flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-[9px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">#{order.id.toString().slice(-4)}</span>
                                    <span class="text-[8px] font-bold text-slate-400 dark:text-slate-500">{order.timestamp}</span>
                                </div>
                                <p class="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase truncate">{order.customer}</p>
                                <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500">{order.items.length} produk • {formatRupiah(order.total)}</p>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0 ml-3">
                                <button on:click={() => deleteHoldOrder(order.id)}
                                        class="p-2 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Hapus">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                                <button on:click={() => restoreOrder(order)}
                                        class="px-3 lg:px-4 py-2 bg-slate-900 hover:bg-black text-white text-[8px] lg:text-[9px] font-black uppercase rounded-lg shadow-lg transition-all flex items-center gap-1.5">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                    Buka
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}

            <button on:click={() => showHoldList = false}
                    class="w-full mt-4 py-3 text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] lg:text-[10px] tracking-widest hover:text-slate-600 dark:text-slate-300 transition-all">
                Tutup
            </button>
        </div>
    </div>
{/if}

<!-- ===== BARCODE SCANNER ===== -->
{#if showBarcodeScanner}
<BarcodeScanner active={scannerActive} on:scan={handleBarcodeScan} on:close={() => scannerActive = false} />
{/if}

<!-- Modal Buka Shift (Overlay jika tidak ada shift) -->
{#if !activeShift && !isOwner}
    <div class="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-slate-200 dark:border-slate-800" in:scale={{ duration: 300, start: 0.9 }}>
            <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Buka Shift Kasir</h2>
            <p class="text-xs text-slate-500 mb-6 leading-relaxed">Silakan masukkan jumlah modal awal tunai yang ada di laci kasir saat ini.</p>
            
            <form method="POST" action="?/bukaShift" use:enhance={() => {
                return async ({ result }) => {
                    if (result.type === 'success') {
                        invalidateAll();
                    }
                };
            }}>
                <div class="mb-5">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Modal Awal Kas (Rp)</label>
                    <input type="number" name="modal_awal" bind:value={modalAwalInput} class="w-full text-xl font-bold bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-4 focus:ring-4 focus:ring-indigo-500/20" required min="0" />
                </div>
                <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/30">
                    Buka Shift Sekarang
                </button>
                <div class="mt-4 text-center">
                    <a href={`/finance/${$page.params.slug}`} class="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase">← Kembali ke Dashboard</a>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Modal Tutup Shift -->
{#if showTutupShiftModal}
    <div class="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-slate-200 dark:border-slate-800" in:scale={{ duration: 200, start: 0.95 }}>
            <button class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white transition" on:click={() => showTutupShiftModal = false}>
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Tutup Shift</h2>
            <p class="text-xs text-slate-500 mb-6 leading-relaxed">Harap hitung jumlah uang tunai di laci kasir saat ini.</p>
            
            <form method="POST" action="?/tutupShift" use:enhance={() => {
                return async ({ result }) => {
                    if (result.type === 'success') {
                        showTutupShiftModal = false;
                        invalidateAll();
                    }
                };
            }}>
                <input type="hidden" name="shift_id" value={activeShift?.id} />
                <div class="mb-4">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Total Kas Aktual (Rp)</label>
                    <input type="number" name="kas_akhir" bind:value={kasAkhirInput} class="w-full text-xl font-bold bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-4 focus:ring-4 focus:ring-indigo-500/20" required min="0" />
                </div>
                <div class="mb-6">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Catatan (Opsional)</label>
                    <textarea name="catatan" bind:value={catatanShiftInput} class="w-full text-sm bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-4 focus:ring-indigo-500/20" rows="2" placeholder="Cth: Ada selisih Rp 500 karena kembalian..."></textarea>
                </div>
                <button type="submit" class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-rose-600/30">
                    Konfirmasi Tutup Shift
                </button>
            </form>
        </div>
    </div>
{/if}

<!-- Modal Cash Management (Cash In / Out) -->
{#if showCashModal}
    <div class="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-slate-200 dark:border-slate-800" in:scale={{ duration: 200, start: 0.95 }}>
            <button class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white transition" on:click={() => showCashModal = false}>
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Kelola Kas Laci</h2>
            <p class="text-xs text-slate-500 mb-6 leading-relaxed">Tambah modal kembalian atau ambil kas kecil (petty cash).</p>
            
            <form method="POST" action="?/cashManagement" use:enhance={() => {
                // preventNegativeCash: cek sebelum submit CASH_OUT
                if (preventNegativeCash && cashType === 'CASH_OUT') {
                    const kasSekarang = Number(activeShift?.kasAkhir || 0);
                    if (cashAmount > kasSekarang) {
                        alert(`⚠️ Kas tidak mencukupi! Kas tersedia: Rp ${kasSekarang.toLocaleString('id-ID')}, Anda ingin keluar: Rp ${cashAmount.toLocaleString('id-ID')}`);
                        return ({ cancel }) => cancel();
                    }
                }
                return async ({ result }) => {
                    if (result.type === 'success') {
                        showCashModal = false;
                        cashAmount = 0;
                        cashDescription = '';
                        invalidateAll();
                    } else {
                        alert(result.data?.error || "Gagal menyimpan transaksi kas");
                    }
                };
            }}>
                <input type="hidden" name="shift_id" value={activeShift?.id} />
                
                <div class="mb-4">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Jenis Transaksi</label>
                    <div class="grid grid-cols-2 gap-2">
                        <label class="cursor-pointer">
                            <input type="radio" name="type" value="CASH_IN" bind:group={cashType} class="peer sr-only" />
                            <div class="text-center py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 dark:peer-checked:bg-blue-900/20 text-xs font-bold uppercase transition-all text-slate-500 dark:text-slate-400">Kas Masuk</div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="type" value="CASH_OUT" bind:group={cashType} class="peer sr-only" />
                            <div class="text-center py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-700 dark:peer-checked:bg-orange-900/20 text-xs font-bold uppercase transition-all text-slate-500 dark:text-slate-400">Kas Keluar</div>
                        </label>
                    </div>
                </div>

                <div class="mb-4">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nominal Uang (Rp)</label>
                    <input type="number" name="amount" bind:value={cashAmount} class="w-full text-xl font-bold bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-4 focus:ring-4 focus:ring-blue-500/20" required min="1" />
                    {#if preventNegativeCash && cashType === 'CASH_OUT' && activeShift}
                        <p class="text-[10px] text-orange-600 font-bold mt-1.5">
                            Kas tersedia: Rp {Number(activeShift.kasAkhir || 0).toLocaleString('id-ID')}
                        </p>
                    {/if}
                </div>

                <div class="mb-6">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Keterangan</label>
                    <textarea name="description" bind:value={cashDescription} class="w-full text-sm bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-500/20" rows="2" placeholder="Cth: Tambah uang receh dari Owner..."></textarea>
                </div>
                
                <button type="submit" class="w-full {cashType === 'CASH_IN' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/30'} text-white font-bold py-4 rounded-xl transition-all shadow-lg">
                    Simpan Transaksi
                </button>
            </form>
        </div>
    </div>
{/if}

<!-- Modal Riwayat Pesanan -->
{#if showOrderHistoryModal}
    <div class="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 w-full max-w-4xl shadow-2xl relative border border-slate-200 dark:border-slate-800" in:scale={{ duration: 200, start: 0.95 }}>
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Riwayat Transaksi</h2>
                <button class="text-slate-400 hover:text-slate-700 dark:hover:text-white transition" on:click={() => showOrderHistoryModal = false}>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            
            <div class="overflow-auto max-h-[60vh] custom-scrollbar">
                {#if isFetchingOrders}
                    <div class="flex justify-center items-center py-10">
                        <span class="text-sm font-bold text-slate-400 animate-pulse">Memuat data...</span>
                    </div>
                {:else if orderHistory.length === 0}
                    <div class="py-12 text-center text-slate-400">Belum ada transaksi.</div>
                {:else}
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-bold text-slate-500 sticky top-0">
                            <tr>
                                <th class="p-3">Order ID</th>
                                <th class="p-3">Waktu</th>
                                <th class="p-3">Pelanggan</th>
                                <th class="p-3 text-right">Total</th>
                                <th class="p-3 text-center">Status</th>
                                <th class="p-3"></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            {#each orderHistory as order}
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td class="p-3 font-mono font-bold text-blue-600">#{order.id.toString().slice(-5)}</td>
                                    <td class="p-3 text-[10px] text-slate-500 font-bold">{new Date(order.createdAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</td>
                                    <td class="p-3 font-bold uppercase text-[11px]">{order.customerName || 'UMUM'}</td>
                                    <td class="p-3 text-right font-mono font-bold text-emerald-600">Rp {Number(order.total).toLocaleString('id-ID')}</td>
                                    <td class="p-3 text-center">
                                        <span class="text-[9px] px-2 py-0.5 rounded font-bold {order.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">{order.status}</span>
                                    </td>
                                    <td class="p-3 text-right">
                                        <button on:click={() => openReturModal(order)} class="px-3 py-1 bg-slate-900 text-white text-[9px] font-bold uppercase rounded-lg hover:bg-slate-800">
                                            Retur
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            </div>
        </div>
    </div>
{/if}

<!-- Modal Retur -->
{#if showReturModal && selectedOrderForRetur}
    <div class="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative border border-slate-200 dark:border-slate-800" in:scale={{ duration: 200, start: 0.95 }}>
            <h2 class="text-xl font-black text-slate-900 dark:text-white mb-2">Proses Retur</h2>
            <p class="text-xs text-slate-500 mb-6">Pilih barang yang akan dikembalikan dari Order #{selectedOrderForRetur.id.toString().slice(-5)}.</p>
            
            <div class="max-h-[50vh] overflow-y-auto mb-6 custom-scrollbar pr-2">
                {#each returItems as item, idx}
                    <div class="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <p class="text-[11px] font-bold text-slate-800 dark:text-slate-100">{item.productName}</p>
                            <p class="text-[9px] text-slate-500">Harga: {formatRupiah(item.price)} • Dibeli: {item.qty}x</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-[9px] font-bold uppercase text-slate-400">Qty Retur:</span>
                            <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                <button on:click={() => { if (item.qty_returned > 0) item.qty_returned--; }} class="w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-700 rounded shadow-sm hover:text-orange-500">-</button>
                                <span class="w-6 text-center text-xs font-bold">{item.qty_returned}</span>
                                <button on:click={() => { if (item.qty_returned < item.qty) item.qty_returned++; }} class="w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-700 rounded shadow-sm hover:text-blue-500">+</button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            <div class="mb-6">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Alasan Retur</label>
                <textarea bind:value={returReason} class="w-full text-sm bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-500/20" rows="2" placeholder="Cth: Barang cacat, kadaluarsa..."></textarea>
            </div>

            <div class="flex gap-3">
                <button class="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors uppercase text-[10px]" on:click={() => { showReturModal = false; showOrderHistoryModal = true; }}>Batal</button>
                <button on:click={submitRetur} disabled={isSubmittingRetur} class="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors uppercase text-[10px] shadow-lg disabled:opacity-50">Konfirmasi Retur</button>
            </div>
        </div>
    </div>
{/if}

<!-- ===== PIN AUTHORIZATION MODAL ===== -->
{#if showPinModal}
    <div class="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
         in:fade={{duration: 150}}>
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-xs w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center"
             in:scale={{duration: 200, start: 0.9}}>
            <div class="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
            </div>
            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-1">Otorisasi PIN</h3>
            <p class="text-xs text-slate-500 mb-5">Masukkan PIN karyawan untuk melanjutkan void/retur</p>

            <input
                type="password"
                bind:value={pinInput}
                maxlength="6"
                placeholder="● ● ● ●"
                class="w-full text-2xl font-black text-center bg-slate-50 dark:bg-slate-800 border-2 {pinError ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl py-4 px-4 outline-none focus:border-blue-500 tracking-[0.5em] mb-2"
                on:keydown={(e) => e.key === 'Enter' && verifyPin()}
            />
            {#if pinError}
                <p class="text-xs text-red-500 font-bold mb-3">{pinError}</p>
            {:else}
                <div class="h-5 mb-3"></div>
            {/if}

            <div class="grid grid-cols-3 gap-2 mb-4">
                {#each [1,2,3,4,5,6,7,8,9,'C',0,'✓'] as key}
                    <button
                        type="button"
                        on:click={() => {
                            if (key === 'C') { pinInput = ''; pinError = ''; }
                            else if (key === '✓') verifyPin();
                            else if (pinInput.length < 6) pinInput += String(key);
                        }}
                        class="py-3 rounded-xl font-black text-base transition-all
                            {key === '✓' ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' :
                             key === 'C' ? 'bg-red-50 text-red-500 hover:bg-red-100' :
                             'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'}"
                    >{key}</button>
                {/each}
            </div>

            <button type="button" on:click={() => { showPinModal = false; pinCallback = null; pinInput = ''; }}
                class="text-xs text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest transition-colors">
                Batal
            </button>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    :global(body) { background-color: #F8FAFC; }

    @media print {
        /* Sembunyikan semua UI POS saat print */
        :global(body > *:not(.print-receipt-wrapper)) { display: none !important; }
        :global(.desktop-titlebar) { display: none !important; }

        /* Hanya tampilkan area receipt */
        .receipt-print-area {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 99999 !important;
            background: white !important;
        }

        /* Sembunyikan backdrop/overlay modal */
        .receipt-backdrop {
            background: white !important;
            backdrop-filter: none !important;
        }

        /* Sembunyikan tombol aksi di receipt */
        .receipt-actions {
            display: none !important;
        }

        /* Styling struk untuk thermal printer */
        .receipt-card {
            box-shadow: none !important;
            border: none !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 4mm !important;
        }

        /* Font lebih kecil dan compact untuk thermal */
        .receipt-card * {
            font-size: 10px !important;
            line-height: 1.4 !important;
        }

        .receipt-card .receipt-total {
            font-size: 14px !important;
            font-weight: 900 !important;
        }

        .custom-scrollbar, .scrollbar-hide { overflow: visible !important; }
    }
</style>
