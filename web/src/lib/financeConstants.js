// MASTER SVG ICONS
export const ICONS = {
    pemasukan: `<path stroke-linecap="round" stroke-linejoin="round" d="m9 12.75 3 3m0 0 3-3m-3 3v-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />`,
    pengeluaran: `<path stroke-linecap="round" stroke-linejoin="round" d="m15 11.25-3-3m0 0-3 3m3-3v7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />`,
    ai: `<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />`,
    box: `<path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-10.5v10.5" />`,
    ads: `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.5 4.5L21.75 7.5" />`,
    user: `<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />`,
    power: `<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />`,
    legal: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v13.5m0 0l-3-3m3 3l3-3m-9.75 3h13.5" />`,
    truck: `<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.333-5.228c-.039-.62-.533-1.108-1.154-1.108h-1.545a1.125 1.125 0 0 0-1.125 1.125v4.5m0-4.5V8.25m0 0h1.5v2.25h-1.5M10.5 8.25h1.5v2.25h-1.5M6.75 8.25h1.5v2.25h-1.5m-3 0h1.5v2.25h-1.5" />`,
    bank: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18" />`
};

// MASTER ABC CONFIG (1-25)
export const ABC_CONFIG = {
    // --- [A] PRODUCTION & DIRECT COSTS (Level: Unit/Batch) ---
    1: { labelQty: "Volume Bahan", unitQty: "Kg/Yard", icon: ICONS.box, extraFields: [{ key: 'vendor', label: 'Vendor', type: 'text', placeholder: 'Supplier Global' }, { key: 'country', label: 'Origin', type: 'text', placeholder: 'Negara Asal' }] },
    2: { labelQty: "Jumlah Unit", unitQty: "Pcs/Unit", icon: ICONS.box, extraFields: [{ key: 'sku', label: 'SKU Code', type: 'text' }, { key: 'wh_zone', label: 'Zona Gudang', type: 'select', options: ['A-Cold', 'B-Dry', 'C-Hazardous'] }] },
    3: { labelQty: "Batch Produksi", unitQty: "Lot", icon: ICONS.box, extraFields: [{ key: 'contractor', label: 'Pihak Maklon', type: 'text' }, { key: 'spk', label: 'No. Perintah Kerja', type: 'text' }] },
    4: { labelQty: "Volume Pack", unitQty: "Pack/Ctn", icon: ICONS.box, extraFields: [{ key: 'material', label: 'Material', type: 'select', options: ['Eco-Plastic', 'Corrugated', 'Biodegradable'] }] },
    5: { labelQty: "Frekuensi Kirim", unitQty: "Trip", icon: ICONS.truck, extraFields: [{ key: 'incoterms', label: 'Incoterms', type: 'select', options: ['FOB', 'CIF', 'EXW', 'DDP'] }, { key: 'tracking', label: 'Airway Bill', type: 'text' }] },
    6: { labelQty: "Unit Reject", unitQty: "Pcs", icon: ICONS.box, extraFields: [{ key: 'root_cause', label: 'Penyebab', type: 'select', options: ['Handling', 'Defect Factory', 'Expired'] }] },

    // --- [B] GROWTH & CUSTOMER ACQUISITION (Level: Product/Market) ---
    7: { labelQty: "Ad Duration", unitQty: "Day", icon: ICONS.ads, extraFields: [{ key: 'platform', label: 'Ads Network', type: 'select', options: ['Meta Ads', 'TikTok Forge', 'Google Search', 'LinkedIn'] }, { key: 'objective', label: 'Objective', type: 'select', options: ['Conversion', 'Awareness', 'Leads'] }] },
    8: { labelQty: "Total Talent", unitQty: "Person", icon: ICONS.user, extraFields: [{ key: 'handle', label: 'KOL Username', type: 'text' }, { key: 'engagement', label: 'Est. Reach', type: 'text' }] },
    9: { labelQty: "Order Volume", unitQty: "Order", icon: ICONS.box, extraFields: [{ key: 'channel', label: 'Platform', type: 'select', options: ['Global Store', 'Amazon', 'Shopee', 'Shopify'] }] },
    10: { labelQty: "Total Trx", unitQty: "Trx", icon: ICONS.bank, extraFields: [{ key: 'gateway', label: 'Payment Method', type: 'select', options: ['Stripe', 'PayPal', 'Xendit', 'Crypto'] }] },
    11: { labelQty: "Total Claim", unitQty: "Voucher", icon: ICONS.ads, extraFields: [{ key: 'campaign_id', label: 'Campaign Code', type: 'text' }] },
    12: { labelQty: "Shoot Session", unitQty: "Session", icon: ICONS.ads, extraFields: [{ key: 'usage_rights', label: 'Licensing', type: 'select', options: ['Commercial 1yr', 'Perpetual', 'Internal Only'] }] },
    13: { labelQty: "Event Duration", unitQty: "Day", icon: ICONS.ads, extraFields: [{ key: 'booth_type', label: 'Booth Type', type: 'select', options: ['Island', 'Corner', 'Standard'] }] },
    14: { labelQty: "Sales Volume", unitQty: "Pcs", icon: ICONS.user, extraFields: [{ key: 'partner_id', label: 'Affiliate ID', type: 'text' }] },

    // --- [C] OVERHEAD & SUSTAINABILITY (Level: Facility) ---
    15: { labelQty: "Headcount", unitQty: "Staff", icon: ICONS.user, extraFields: [{ key: 'dept', label: 'Department', type: 'select', options: ['Operations', 'Engineering', 'C-Level', 'Support'] }, { key: 'tax_period', label: 'Payroll Period', type: 'text' }] },
    16: { labelQty: "Work Hours", unitQty: "Man-Hour", icon: ICONS.user, extraFields: [{ key: 'contract_type', label: 'Contract', type: 'select', options: ['Fixed Term', 'Project Base', 'Retainer'] }] },
    17: { labelQty: "Lease Period", unitQty: "Month", icon: ICONS.box, extraFields: [{ key: 'building', label: 'Building/Site', type: 'text' }] },
    18: { labelQty: "Usage Period", unitQty: "Month", icon: ICONS.power, extraFields: [{ key: 'meter_id', label: 'Meter/Subscription ID', type: 'text' }] },
    19: { labelQty: "Total License", unitQty: "Seat/Acc", icon: ICONS.ai, extraFields: [{ key: 'provider', label: 'SaaS Vendor', type: 'text', placeholder: 'AWS/Adobe/Microsoft' }] },
    20: { labelQty: "Unit Serviced", unitQty: "Asset", icon: ICONS.power, extraFields: [{ key: 'asset_tag', label: 'Serial/Tag No', type: 'text' }] },
    21: { labelQty: "Supplies Qty", unitQty: "Pack", icon: ICONS.box, extraFields: [{ key: 'cat', label: 'Inventory Cat', type: 'select', options: ['Stationary', 'Pantry', 'Cleaning'] }] },
    22: { labelQty: "Fuel Volume", unitQty: "Litre", icon: ICONS.truck, extraFields: [{ key: 'fleet_id', label: 'Vehicle Plat', type: 'text' }] },
    23: { labelQty: "Pax Count", unitQty: "Person", icon: ICONS.user, extraFields: [{ key: 'meeting_id', label: 'Agenda/Client', type: 'text' }] },
    24: { labelQty: "Legal Docs", unitQty: "File", icon: ICONS.legal, extraFields: [{ key: 'compliance', label: 'Regulation', type: 'select', options: ['Tax Filing', 'Operating Permit', 'Intellectual Property'] }] },
    25: { labelQty: "Incident Freq", unitQty: "Times", icon: ICONS.ai, extraFields: [{ key: 'desc', label: 'Reason', type: 'text' }] },

    // --- [IN] REVENUE & INFLOW (ID 26 - 40) ---
    26: { labelQty: "Total Trx", unitQty: "Trx", icon: ICONS.pemasukan, extraFields: [{ key: 'shift', label: 'Working Shift', type: 'select', options: ['Morning', 'Swing', 'Night'] }] },
    27: { labelQty: "Order Count", unitQty: "Order", icon: ICONS.pemasukan, extraFields: [{ key: 'platform', label: 'Marketplace', type: 'text' }] },
    28: { labelQty: "Delivery Vol", unitQty: "Pcs", icon: ICONS.pemasukan, extraFields: [{ key: 'app', label: 'Aggregator', type: 'select', options: ['UberEats', 'GrabFood', 'Deliveroo'] }] },
    29: { labelQty: "Add-on Qty", unitQty: "Unit", icon: ICONS.pemasukan, extraFields: [{ key: 'upsell_item', label: 'Promotion Name', type: 'text' }] },
    30: { labelQty: "Total Pax", unitQty: "Pax", icon: ICONS.pemasukan, extraFields: [{ key: 'client', label: 'Client/Org', type: 'text' }, { key: 'event_date', label: 'Execution Date', type: 'text' }] },
    31: { labelQty: "Event Duration", unitQty: "Day", icon: ICONS.pemasukan, extraFields: [{ key: 'location', label: 'Venue Name', type: 'text' }] },
    32: { labelQty: "Total Bundle", unitQty: "Set", icon: ICONS.pemasukan, extraFields: [{ key: 'seasonal', label: 'Season', type: 'select', options: ['Eid/CNY', 'Christmas', 'Summer Promo'] }] },
    33: { labelQty: "Active Member", unitQty: "User", icon: ICONS.pemasukan, extraFields: [{ key: 'tier', label: 'Plan Tier', type: 'select', options: ['Basic', 'Premium', 'Ultimate/VIP'] }] },
    34: { labelQty: "Store Count", unitQty: "Unit", icon: ICONS.pemasukan, extraFields: [{ key: 'franchisee', label: 'Partner Name', type: 'text' }] },
    35: { labelQty: "Order Volume", unitQty: "Batch", icon: ICONS.pemasukan, extraFields: [{ key: 'corp_client', label: 'Company Name', type: 'text' }] },
    36: { labelQty: "Space Size", unitQty: "Sqm", icon: ICONS.pemasukan, extraFields: [{ key: 'tenant', label: 'Tenant Name', type: 'text' }] },
    37: { labelQty: "Period", unitQty: "Month", icon: ICONS.pemasukan, extraFields: [{ key: 'bank_source', label: 'Account Name', type: 'text' }] },
    38: { labelQty: "Total Weight", unitQty: "Kg", icon: ICONS.pemasukan, extraFields: [{ key: 'waste_type', label: 'Scrap Category', type: 'select', options: ['Metal', 'Oil', 'Paper/Cardboard'] }] },
    39: { labelQty: "Refund Count", unitQty: "Trx", icon: ICONS.pemasukan, extraFields: [{ key: 'vendor_ref', label: 'Vendor Name', type: 'text' }] },
    40: { labelQty: "Contract Term", unitQty: "Year/Month", icon: ICONS.pemasukan, extraFields: [{ key: 'brand_partner', label: 'Partner Brand', type: 'text' }] }
};