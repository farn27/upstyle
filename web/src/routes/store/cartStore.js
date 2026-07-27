import { writable, get } from 'svelte/store';

function createCartStore() {
    // Inisialisasi dari localStorage jika berjalan di browser
    const isBrowser = typeof window !== 'undefined';
    let initialCart = [];
    
    if (isBrowser) {
        const stored = localStorage.getItem('bizgrow_cart');
        if (stored) {
            try { initialCart = JSON.parse(stored); } catch (e) {}
        }
    }

    const { subscribe, set, update } = writable(initialCart);

    return {
        subscribe,
        add: (product) => update(items => {
            const existing = items.find(i => i.productId === product.id);
            let newItems;
            if (existing) {
                newItems = items.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
            } else {
                newItems = [...items, { productId: product.id, name: product.nama, price: Number(product.hargaJual), foto: product.foto, qty: 1 }];
            }
            if (isBrowser) localStorage.setItem('bizgrow_cart', JSON.stringify(newItems));
            return newItems;
        }),
        updateQty: (productId, qty) => update(items => {
            const newItems = items.map(i => i.productId === productId ? { ...i, qty } : i).filter(i => i.qty > 0);
            if (isBrowser) localStorage.setItem('bizgrow_cart', JSON.stringify(newItems));
            return newItems;
        }),
        remove: (productId) => update(items => {
            const newItems = items.filter(i => i.productId !== productId);
            if (isBrowser) localStorage.setItem('bizgrow_cart', JSON.stringify(newItems));
            return newItems;
        }),
        clear: () => {
            set([]);
            if (isBrowser) localStorage.removeItem('bizgrow_cart');
        }
    };
}

export const cart = createCartStore();
