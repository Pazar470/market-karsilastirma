'use client';

import { isProductImagePlaceholder } from '@/lib/utils';

const PLACEHOLDER = '/placeholder.png';

interface ProductImageProps {
    src: string | null | undefined;
    alt: string;
    className?: string;
    /** Detay sayfası gibi büyük gösterimde kullanılıyorsa true; daha yüksek netlik için ek sınıf/öznitelik. */
    priority?: boolean;
}

/**
 * Ürün görseli: donuk/yerli rozet URL'leri placeholder'a çevrilir,
 * yükleme hatası (kırık link, 404) durumunda da placeholder gösterilir.
 */
export function ProductImage({ src, alt, className, priority }: ProductImageProps) {
    const effectiveSrc = !src || isProductImagePlaceholder(src) ? PLACEHOLDER : src;

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={effectiveSrc}
            alt={alt}
            className={className}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onError={(e) => {
                const el = e.currentTarget;
                if (el.src !== PLACEHOLDER) el.src = PLACEHOLDER;
            }}
        />
    );
}
