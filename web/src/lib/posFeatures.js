const BASE_FEATURES = {
    // 1. Modul Industri Dasar
    posEnabled: true, barcodeScanner: false, tableManagement: false, appointmentBooking: false, workOrderTracking: false, kitchenDisplay: false,
    // 2. Pengaturan Perilaku Kasir
    splitPayment: true, manualDiscount: false, openPrice: false, autoCalcChange: true, autoPrintReceipt: false,
    // 3. Keamanan & Shift
    mandatoryShiftClose: true, preventNegativeCash: true, requirePinForVoid: false,
    // 4. Tampilan UI
    showStock: true, lowStockAlert: true, autoFocusScanner: false
};

// Industry Group Defaults - Scalable system for hundreds of categories
const INDUSTRY_GROUPS = {
    // F&B Group - Restaurant, Cafe, Bakery, etc.
    FNB: {
        tableManagement: true,
        kitchenDisplay: true,
        showStock: false,
        lowStockAlert: false
    },
    // Retail Group - All retail stores
    RETAIL: {
        barcodeScanner: true,
        autoFocusScanner: true,
        showStock: true,
        lowStockAlert: true
    },
    // Services Group - Clinics, Salons, Spas, etc.
    SERVICES: {
        appointmentBooking: true,
        showStock: false,
        lowStockAlert: false
    },
    // Technical Services - Auto repair, workshops, etc.
    TECHNICAL: {
        workOrderTracking: true,
        showStock: false,
        lowStockAlert: false
    },
    // Education - Courses, training, etc.
    EDUCATION: {
        appointmentBooking: true,
        showStock: false,
        lowStockAlert: false
    },
    // B2B / Project-based
    B2B: {
        barcodeScanner: false,
        showStock: false,
        lowStockAlert: false,
        mandatoryShiftClose: false
    },
    // Agriculture
    AGRICULTURE: {
        barcodeScanner: false,
        showStock: true,
        lowStockAlert: true
    },
    // Manufacturing
    MANUFACTURING: {
        barcodeScanner: true,
        showStock: true,
        lowStockAlert: true
    },
    // Wholesale / Distribution
    WHOLESALER: {
        barcodeScanner: true,
        showStock: true,
        lowStockAlert: true,
        splitPayment: true
    }
};

// Pattern matching for category names to auto-assign industry group
const CATEGORY_PATTERNS = [
    // F&B Patterns
    { pattern: /resto|restaurant|cafe|coffee|warung|rumah makan|kedai|kopi|bakery|toko kue|roti|catering|kuliner|masakan|food|beverage|minuman|makanan/i, group: 'FNB' },
    { pattern: /fnb|f&b|food & beverage/i, group: 'FNB' },
    
    // Retail Patterns
    { pattern: /retail|toko|store|shop|market|supermarket|minimarket|warung|toko kelontong|convenience/i, group: 'RETAIL' },
    { pattern: /elektronik|electronic|gadget|hp|smartphone|laptop|komputer|computer|it store/i, group: 'RETAIL' },
    { pattern: /fashion|baju|pakaian|clothing|apparel|sepatu|shoe|tas|bag|aksesoris|accessory/i, group: 'RETAIL' },
    { pattern: /grocery|supermarket|sayur|buah|fresh market|pasar/i, group: 'RETAIL' },
    { pattern: /pharmacy|apotek|obat|medicine|drugstore/i, group: 'RETAIL' },
    { pattern: /bookstore|toko buku|buku|stationery|alat tulis/i, group: 'RETAIL' },
    { pattern: /furniture|mebel|meubel|perabot|home decor|dekorasi/i, group: 'RETAIL' },
    { pattern: /sport|olahraga|sepatu olahraga|fitness|gym equipment/i, group: 'RETAIL' },
    { pattern: /toy|mainan|game|games/i, group: 'RETAIL' },
    { pattern: /jewelry|perhiasan|emas|gold|diamond/i, group: 'RETAIL' },
    { pattern: /cosmetic|kosmetik|makeup|kecantikan|beauty/i, group: 'RETAIL' },
    { pattern: /optical|kacamata|optic|lensa/i, group: 'RETAIL' },
    
    // Services Patterns
    { pattern: /klinik|clinic|medical|health|kesehatan|rumah sakit|hospital|puskesmas/i, group: 'SERVICES' },
    { pattern: /salon|barber|barbershop|potong rambut|haircut|spa|massage|pijat|kecantikan|beauty salon/i, group: 'SERVICES' },
    { pattern: /laundry|cuci|dry clean|binatu/i, group: 'SERVICES' },
    { pattern: /car wash|cuci mobil|cuci motor|auto wash/i, group: 'SERVICES' },
    { pattern: /photography|foto|video|studio/i, group: 'SERVICES' },
    { pattern: /event|wedding|pernikahan|organizer|eo/i, group: 'SERVICES' },
    { pattern: /travel|agent|tour|wisata|tiket|ticket/i, group: 'SERVICES' },
    { pattern: /hotel|homestay|guest house|penginapan|lodging/i, group: 'SERVICES' },
    
    // Technical Services Patterns
    { pattern: /bengkel|workshop|repair|perbaikan|service|servis|montir|mekanik/i, group: 'TECHNICAL' },
    { pattern: /otomotif|automotive|mobil|motor|kendaraan|vehicle/i, group: 'TECHNICAL' },
    { pattern: /elektrik|electric|kelistrikan|ac|pendingin|air conditioner|refrigerator|kulkas/i, group: 'TECHNICAL' },
    { pattern: /plumbing|tukang ledeng|pipa|air/i, group: 'TECHNICAL' },
    { pattern: /konstruksi|construction|bangunan|renovasi|proyek|project/i, group: 'TECHNICAL' },
    
    // Education Patterns
    { pattern: /sekolah|school|pendidikan|education|kursus|course|training|pelatihan|les|tutor/i, group: 'EDUCATION' },
    { pattern: /bimbel|bimbingan belajar|tutorial/i, group: 'EDUCATION' },
    { pattern: /academy|akademi|institute|institut/i, group: 'EDUCATION' },
    
    // B2B Patterns
    { pattern: /b2b|business to business|wholesale|grosir|distributor|supplier/i, group: 'B2B' },
    { pattern: /tech|technology|software|saas|platform|digital|agency|consulting|konsultan/i, group: 'B2B' },
    { pattern: /media|advertising|iklan|marketing|creative|design|desain/i, group: 'B2B' },
    { pattern: /export|impor|import|export|trading|perdagangan/i, group: 'B2B' },
    
    // Agriculture Patterns
    { pattern: /pertanian|agriculture|farm|kebun|tani|petani|perkebunan/i, group: 'AGRICULTURE' },
    { pattern: /peternakan|livestock|ternak|hewan|animal/i, group: 'AGRICULTURE' },
    { pattern: /perikanan|fishery|ikan|fish/i, group: 'AGRICULTURE' },
    
    // Manufacturing Patterns
    { pattern: /manufaktur|manufacturing|pabrik|factory|produksi|production|industri|industry/i, group: 'MANUFACTURING' },
    { pattern: /workshop|bengkel|garage|fabrikasi|fabrication/i, group: 'MANUFACTURING' }
];

// Specific category overrides (takes precedence over pattern matching)
export const POS_FEATURE_DEFAULTS = {
    // Specific F&B
    FNB_RESTO:         { ...BASE_FEATURES, ...INDUSTRY_GROUPS.FNB },
    FNB_FRANCHISE:     { ...BASE_FEATURES, ...INDUSTRY_GROUPS.FNB, barcodeScanner: true },
    FNB_PRODUKSI:      { ...BASE_FEATURES, ...INDUSTRY_GROUPS.FNB },
    
    // Specific Retail
    RETAIL_ELECTRONIC: { ...BASE_FEATURES, ...INDUSTRY_GROUPS.RETAIL },
    RETAIL_FASHION:    { ...BASE_FEATURES, ...INDUSTRY_GROUPS.RETAIL },
    RETAIL_GROCERY:    { ...BASE_FEATURES, ...INDUSTRY_GROUPS.RETAIL },
    
    // Specific Services
    HEALTH_CLINIC:     { ...BASE_FEATURES, ...INDUSTRY_GROUPS.SERVICES },
    
    // Specific Technical
    JASA_TEKNIK:       { ...BASE_FEATURES, ...INDUSTRY_GROUPS.TECHNICAL },
    AUTOMOTIVE:        { ...BASE_FEATURES, ...INDUSTRY_GROUPS.TECHNICAL },
    
    // Specific Education
    EDUCATION_COURSE:  { ...BASE_FEATURES, ...INDUSTRY_GROUPS.EDUCATION },
    
    // Specific B2B
    CONSTRUCTION:      { ...BASE_FEATURES, ...INDUSTRY_GROUPS.B2B },
    TECH_MEDIA:        { ...BASE_FEATURES, ...INDUSTRY_GROUPS.B2B },
    TECH_SAAS:         { ...BASE_FEATURES, ...INDUSTRY_GROUPS.B2B },
    
    // Specific Agriculture
    AGRIBISNIS:        { ...BASE_FEATURES, ...INDUSTRY_GROUPS.AGRICULTURE },
    
    // Specific Manufacturing
    MANUFACTURING:     { ...BASE_FEATURES, ...INDUSTRY_GROUPS.MANUFACTURING },
    
    // Specific Wholesale
    WHOLESALER:        { ...BASE_FEATURES, ...INDUSTRY_GROUPS.WHOLESALER },
    
    // Fallback
    UMUM:              { ...BASE_FEATURES, barcodeScanner: true }
};

// Helper function to detect industry group from category name
function detectIndustryGroup(categoryName) {
    if (!categoryName) return null;
    
    const upperName = categoryName.toUpperCase();
    
    // Check if it's a direct match in POS_FEATURE_DEFAULTS
    if (POS_FEATURE_DEFAULTS[upperName]) {
        // Find which group this belongs to
        for (const [groupName, groupFeatures] of Object.entries(INDUSTRY_GROUPS)) {
            const defaultFeatures = POS_FEATURE_DEFAULTS[upperName];
            const hasAllGroupFeatures = Object.keys(groupFeatures).every(key => 
                defaultFeatures[key] === groupFeatures[key]
            );
            if (hasAllGroupFeatures) return groupName;
        }
    }
    
    // Pattern matching
    for (const { pattern, group } of CATEGORY_PATTERNS) {
        if (pattern.test(categoryName)) {
            return group;
        }
    }
    
    return null;
}

// Export helper to get industry group for UI customization
export function getIndustryGroup(unitCategory) {
    return detectIndustryGroup(unitCategory) || 'RETAIL'; // Default to RETAIL
}

export function getActivePosFeatures(unitCategory, overrideJson = null) {
    const category = (unitCategory || 'UMUM').toUpperCase();
    let defaults = POS_FEATURE_DEFAULTS[category] || POS_FEATURE_DEFAULTS['UMUM'];
    
    // If category not in defaults, try to detect industry group
    if (!POS_FEATURE_DEFAULTS[category] && unitCategory) {
        const detectedGroup = detectIndustryGroup(unitCategory);
        if (detectedGroup && INDUSTRY_GROUPS[detectedGroup]) {
            defaults = { ...BASE_FEATURES, ...INDUSTRY_GROUPS[detectedGroup] };
        }
    }
    
    // Parse override if it's a string, or use directly if it's already an object
    let overrides = {};
    if (overrideJson) {
        if (typeof overrideJson === 'string') {
            try { overrides = JSON.parse(overrideJson); } catch(e) {}
        } else {
            overrides = overrideJson;
        }
    }

    return { ...defaults, ...overrides };
}
