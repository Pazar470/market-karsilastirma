'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
    productId: string;
    categoryId?: string | null;
    variant?: 'icon' | 'text';
    className?: string;
    onFollowChange?: (followed: boolean) => void;
}

export function FollowButton({ productId, categoryId, variant = 'icon', className, onFollowChange }: FollowButtonProps) {
    const [followed, setFollowed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        fetch('/api/follow?idsOnly=1')
            .then((res) => (res.ok ? res.json() : { productIds: [] }))
            .then((data) => {
                setFollowed(Array.isArray(data.productIds) && data.productIds.includes(productId));
                setChecked(true);
            })
            .catch(() => setChecked(true));
    }, [productId]);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (loading) return;
        setLoading(true);
        try {
            if (followed) {
                await fetch(`/api/follow?productId=${encodeURIComponent(productId)}`, { method: 'DELETE' });
                setFollowed(false);
                onFollowChange?.(false);
            } else {
                await fetch('/api/follow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, categoryId: categoryId || null }),
                });
                setFollowed(true);
                onFollowChange?.(true);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!checked) return null;

    if (variant === 'text') {
        return (
            <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className={className}
                title={followed ? 'Takibi bırak' : 'Takibe al'}
            >
                {followed ? 'Takibi bırak' : 'Takibe al'}
            </button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={loading}
            className={cn('rounded-full bg-amber-50 border border-amber-200/80 hover:bg-amber-100 hover:border-amber-300 text-amber-600', className)}
            title={followed ? 'Takibi bırak' : 'Takibe al'}
        >
            {followed ? (
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            ) : (
                <Star className="h-4 w-4 text-amber-500 hover:text-amber-600" />
            )}
        </Button>
    );
}
