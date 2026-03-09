'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const MARKET_LOGO_SLUG: Record<string, string> = {
    'A101': 'a101',
    'Şok': 'sok',
    'Migros': 'migros',
    'BİM': 'bim',
};

const MARKET_FALLBACK_COLOR: Record<string, string> = {
    'A101': 'bg-cyan-500',
    'Migros': 'bg-orange-500',
    'Şok': 'bg-yellow-400',
    'BİM': 'bg-red-500',
};

interface MarketLogoProps {
    marketName: string | null | undefined;
    className?: string;
    size?: 'sm' | 'md';
}

export function MarketLogo({ marketName, className, size = 'sm' }: MarketLogoProps) {
    const [imgFailed, setImgFailed] = useState(false);
    const name = marketName || 'Market';
    const slug = name && MARKET_LOGO_SLUG[name];
    const fallbackColor = (name && MARKET_FALLBACK_COLOR[name]) || 'bg-gray-400';
    const sizeClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

    if (!slug || imgFailed) {
        return (
            <span
                className={cn('inline-flex items-center gap-1', className)}
                title={name}
            >
                <span className={cn('inline-block rounded-sm shrink-0', sizeClass, fallbackColor)} />
                <span>{name}</span>
            </span>
        );
    }

    return (
        <span className={cn('inline-flex items-center gap-1', className)} title={name}>
            <img
                src={`/logos/${slug}.png`}
                alt=""
                className={cn('shrink-0 rounded-sm object-contain', sizeClass)}
                onError={() => setImgFailed(true)}
            />
            <span>{name}</span>
        </span>
    );
}
