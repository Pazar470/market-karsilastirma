'use client';

import { Button } from '@/components/ui/button';
import { useBasket, BasketItem } from '@/context/basket-context';
import { Plus, Minus, ShoppingBasket } from 'lucide-react';

interface AddToBasketButtonProps {
    product: {
        id: string;
        name: string;
        imageUrl: string;
        price: number;
        marketName: string;
    };
    variant?: 'default' | 'icon'; // 'default' = Full width button, 'icon' = Small icon/controls
    className?: string;
}

export function AddToBasketButton({ product, variant = 'default', className = '' }: AddToBasketButtonProps) {
    const { items, addItem, removeItem, updateQuantity } = useBasket();

    // Find if item is in basket
    const basketItem = items.find(i => i.productId === product.id);
    const quantity = basketItem?.quantity || 0;

    const handleAdd = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent Link navigation if inside a card link
        e.stopPropagation();

        addItem({
            productId: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            addedPrice: product.price,
            addedMarket: product.marketName
        });
    };

    const handleIncrease = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        updateQuantity(product.id, quantity + 1);
    };

    const handleDecrease = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        updateQuantity(product.id, quantity - 1);
    };

    if (quantity > 0) {
        return (
            <div className={`flex items-center gap-2 ${variant === 'default' ? 'w-full justify-center' : ''} ${className}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDecrease}
                >
                    <Minus className="h-4 w-4" />
                </Button>
                <span className="font-semibold w-6 text-center">{quantity}</span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleIncrease}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    if (variant === 'icon') {
        return (
            <Button
                size="icon"
                className={`h-8 w-8 rounded-full shadow-md bg-blue-600 hover:bg-blue-700 text-white ${className}`}
                onClick={handleAdd}
                title="Sepete Ekle"
            >
                <Plus className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <Button
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white ${className}`}
            onClick={handleAdd}
        >
            <ShoppingBasket className="mr-2 h-4 w-4" />
            Sepete Ekle
        </Button>
    );
}
