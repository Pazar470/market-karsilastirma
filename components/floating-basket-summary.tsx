'use client';

import { useBasket } from '@/context/basket-context';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export function FloatingBasketSummary() {
    const { items, totalItems } = useBasket();

    // if (totalItems === 0) return null;

    const totalPrice = items.reduce((sum, item) => sum + (item.addedPrice * item.quantity), 0);

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in">
            <Link href="/basket">
                <Button className="h-16 px-6 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center gap-1 border-4 border-white">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        <span className="font-bold text-lg">{totalItems} Ürün</span>
                    </div>
                    <div className="text-xs font-medium opacity-90">
                        Top: {totalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                    </div>
                </Button>
            </Link>
        </div>
    );
}
