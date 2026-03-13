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
    /** sm: küçük (listeler), md: orta, lg: kartlarda belirgin, düz tek satır */
    size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
    icon: {
        sm: 'h-3 w-auto',
        md: 'h-3.5 w-auto',
        lg: 'h-4 w-auto',
    },
    text: {
        sm: 'text-[10px]',
        md: 'text-xs',
        lg: 'text-xs',
    },
} as const;

const WRAPPER_CLASSES = {
    sm: 'h-3 w-8',
    md: 'h-3.5 w-10',
    lg: 'h-4 w-12',
} as const;

export function MarketLogo({ marketName, className, size = 'sm' }: MarketLogoProps) {
    const [imgFailed, setImgFailed] = useState(false);
    const name = marketName || 'Market';
    const slug = name && MARKET_LOGO_SLUG[name];
    const fallbackColor = (name && MARKET_FALLBACK_COLOR[name]) || 'bg-gray-400';
    const iconClass = SIZE_CLASSES.icon[size];
    const textClass = SIZE_CLASSES.text[size];

    const showLogoOnly = size === 'lg' && slug && !imgFailed;

    const content = (
        <>
            {(!slug || imgFailed) ? (
                <span className={cn('inline-block shrink-0', size === 'lg' ? 'h-5 w-12' : iconClass, fallbackColor)} />
            ) : (
                <span className={cn('inline-flex items-center justify-center shrink-0 bg-white overflow-hidden', WRAPPER_CLASSES[size])}>
                    <img
                        src={`/logos/${slug}.png`}
                        alt=""
                        className={cn('object-contain object-center', iconClass)}
                        onError={() => setImgFailed(true)}
                    />
                </span>
            )}
            {!showLogoOnly && <span className={cn('whitespace-nowrap', textClass)}>{name}</span>}
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
