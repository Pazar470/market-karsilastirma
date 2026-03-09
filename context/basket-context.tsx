'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Simplified Basket Item (we only store enough to fetch fresh data or show basic info)
export interface BasketItem {
    productId: string;
    quantity: number;
    // Cached display data (for instant UI feedback)
    name: string;
    imageUrl: string;
    // We optionally store the price at add time, but ideally we re-fetch prices on the basket page
    addedPrice: number;
    addedMarket: string;
}

interface BasketContextType {
    items: BasketItem[];
    addItem: (item: Omit<BasketItem, 'quantity'>) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearBasket: () => void;
    totalItems: number;
}

const BasketContext = createContext<BasketContextType | undefined>(undefined);

export function BasketProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<BasketItem[]>([]);

    // 1. Load from LocalStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('market-basket');
        if (stored) {
            try {
                setItems(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse basket', e);
            }
        }
    }, []);

    // 2. Sync to LocalStorage on change
    useEffect(() => {
        localStorage.setItem('market-basket', JSON.stringify(items));
    }, [items]);

    const addItem = (newItem: Omit<BasketItem, 'quantity'>) => {
        setItems(prev => {
            const existing = prev.find(i => i.productId === newItem.productId);
            if (existing) {
                return prev.map(i =>
                    i.productId === newItem.productId
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }
            return [...prev, { ...newItem, quantity: 1 }];
        });
    };

    const removeItem = (productId: string) => {
        setItems(prev => prev.filter(i => i.productId !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity < 1) {
            setItems(prev => prev.filter(i => i.productId !== productId));
            return;
        }
        setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity } : i));
    };

    const clearBasket = () => setItems([]);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <BasketContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearBasket, totalItems }}>
            {children}
        </BasketContext.Provider>
    );
}

export function useBasket() {
    const context = useContext(BasketContext);
    if (context === undefined) {
        throw new Error('useBasket must be used within a BasketProvider');
    }
    return context;
}
