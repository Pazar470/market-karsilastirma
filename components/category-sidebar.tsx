
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';

export function CategorySidebar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedCategory = searchParams.get('category');

    const handleSelectCategory = (category: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (category) {
            params.set('category', category);
        } else {
            params.delete('category');
        }
        router.push(`/?${params.toString()}`);
    };

    // Dynamic Categories from DB (or Hardcoded Essentials if DB is empty - but user wants sync)
    // For now, let's keep it empty or fetch.
    // Since we only have Peynir, let's just use empty default and fetch if possible.
    // Or better, for this "Clean Slate" phase, let's Comment out the hardcoded ones and put only "Peynir" as a placeholder until we build dynamic fetch.
    // Actually, I should check if we can fetch facets from search results.
    // But sidebar is global.

    // TEMPORARY FIX: Empty the hardcoded list to reflect DB state.
    const CATEGORIES: string[] = [
        "Peynir", // Only valid category for now
        // "Süt",
        // ... others commented out ...
    ];

    return (
        <div className="w-full md:w-64 flex-shrink-0 bg-white rounded-lg border p-4 h-fit">
            <h3 className="font-semibold mb-4 text-lg">Kategoriler</h3>
            <div className="h-[calc(100vh-300px)] overflow-y-auto pr-2">
                <div className="space-y-1">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-emerald-600 font-bold hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => router.push('/temel-gida-fiyatlari')}
                    >
                        🔥 En Ucuz Temel Gıda
                    </Button>
                    <div className="my-2 border-b" />

                    <Button
                        variant={selectedCategory === null ? 'default' : 'ghost'}
                        className={cn("w-full justify-start", selectedCategory === null && "bg-blue-600 text-white")}
                        onClick={() => handleSelectCategory(null)}
                    >
                        Tüm Ürünler
                    </Button>
                    {CATEGORIES.map((cat) => (
                        <Button
                            key={cat}
                            variant={selectedCategory === cat ? 'default' : 'ghost'}
                            className={cn("w-full justify-start text-left whitespace-normal h-auto py-2", selectedCategory === cat && "bg-blue-600 text-white")}
                            onClick={() => handleSelectCategory(cat)}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
