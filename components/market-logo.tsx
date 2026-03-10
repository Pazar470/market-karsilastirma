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
    /** sm: küçük (listeler), md: orta, lg: kartlarda belirgin */
    size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
    icon: { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' },
    text: { sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm' },
} as const;

export function MarketLogo({ marketName, className, size = 'sm' }: MarketLogoProps) {
    const [imgFailed, setImgFailed] = useState(false);
    const name = marketName || 'Market';
    const slug = name && MARKET_LOGO_SLUG[name];
    const fallbackColor = (name && MARKET_FALLBACK_COLOR[name]) || 'bg-gray-400';
    const iconClass = SIZE_CLASSES.icon[size];
    const textClass = SIZE_CLASSES.text[size];

    const content = (
        <>
            {(!slug || imgFailed) ? (
                <span className={cn('inline-block rounded-sm shrink-0', iconClass, fallbackColor)} />
            ) : (
                <img
                    src={`/logos/${slug}.png`}
                    alt=""
                    className={cn('shrink-0 rounded-sm object-contain', iconClass)}
                    onError={() => setImgFailed(true)}
                />
            )}
            <span className={cn('whitespace-nowrap', textClass)}>{name}</span>
        </>
    );

    return (
        <span
            className={cn('inline-flex items-center gap-1.5 min-w-0 overflow-visible', className)}
            title={name}
        >
            {content}
        </span>
    );
}
