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
    /** sm: küçük (listeler), md: orta, lg: kartlarda belirgin (daha büyük + yuvarlak) */
    size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
    icon: { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-7 w-7' },
    text: { sm: 'text-[10px]', md: 'text-xs', lg: 'text-xs' },
} as const;

export function MarketLogo({ marketName, className, size = 'sm' }: MarketLogoProps) {
    const [imgFailed, setImgFailed] = useState(false);
    const name = marketName || 'Market';
    const slug = name && MARKET_LOGO_SLUG[name];
    const fallbackColor = (name && MARKET_FALLBACK_COLOR[name]) || 'bg-gray-400';
    const iconClass = SIZE_CLASSES.icon[size];
    const textClass = SIZE_CLASSES.text[size];
    const isRounded = size === 'lg';

    const content = (
        <>
            {(!slug || imgFailed) ? (
                <span className={cn('inline-block shrink-0', iconClass, fallbackColor, isRounded ? 'rounded-xl' : 'rounded-sm')} />
            ) : (
                <img
                    src={`/logos/${slug}.png`}
                    alt=""
                    className={cn('shrink-0 object-contain', iconClass, isRounded ? 'rounded-xl' : 'rounded-sm')}
                    onError={() => setImgFailed(true)}
                />
            )}
            <span className={cn('whitespace-nowrap', textClass)}>{name}</span>
        </>
    );

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 min-w-0 overflow-visible',
                size === 'lg' && 'py-0.5',
                className
            )}
            title={name}
        >
            {content}
        </span>
    );
}
