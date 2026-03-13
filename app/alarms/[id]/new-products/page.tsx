'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AlarmEditProductCard, type AlarmEditProduct } from '@/components/alarm-edit-product-card';
import { Button } from '@/components/ui/button';

export default function NewProductsPage() {
    const router = useRouter();
    const { id } = useParams();
    const [alarmName, setAlarmName] = useState('');
    const [categoryNames, setCategoryNames] = useState<string[]>([]);
    const [products, setProducts] = useState<AlarmEditProduct[]>([]);
    const [currentIncluded, setCurrentIncluded] = useState<string[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id || typeof id !== 'string') return;
        Promise.all([
            fetch(`/api/alarms/${id}`).then((r) => r.json()),
            fetch(`/api/alarms/${id}/new-products`).then((r) => r.json()),
        ])
            .then(([alarm, data]) => {
                if (alarm?.error) return;
                setAlarmName(alarm.name || '');
                setCurrentIncluded(alarm.includedProductIds || []);
                setProducts(Array.isArray(data.products) ? data.products : []);
                setCategoryNames(Array.isArray(data.categoryNames) ? data.categoryNames : []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [id]);

    const toggle = (productId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
    };

    const addToAlarm = async () => {
        if (selectedIds.size === 0 || !id || typeof id !== 'string') return;
        setSaving(true);
        try {
            const newIncluded = [...new Set([...currentIncluded, ...Array.from(selectedIds)])];
            const res = await fetch(`/api/alarms/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ includedProductIds: newIncluded }),
            });
            if (res.ok) router.push(`/alarms/${id}/edit`);
        } finally {
            setSaving(false);
        }
    };

    const gridClass = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3';

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                        <Link href={`/alarms/${id}/edit`} className="text-sm text-blue-600 hover:underline mb-1 inline-block">
                            ← Alarmı düzenle
                        </Link>
                        <h1 className="text-xl font-semibold">
                            Bu kategoride yeni ürünler — {alarmName || 'Alarm'}
                        </h1>
                        {categoryNames.length > 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                                Kategoriler: {categoryNames.join(', ')}
                            </p>
                        )}
                    </div>
                    {products.length > 0 && (
                        <Button
                            onClick={addToAlarm}
                            disabled={saving || selectedIds.size === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {saving ? 'Ekleniyor...' : `Seçilenleri alarma ekle (${selectedIds.size})`}
                        </Button>
                    )}
                </div>

                {products.length === 0 ? (
                    <div className="py-16 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                        Bu alarmdaki kategorilerde alarmda olmayan yeni ürün yok.
                    </div>
                ) : (
                    <div className={gridClass}>
                        {products.map((product) => (
                            <div key={product.id} className="relative">
                                <label className="absolute top-2 left-2 z-10 flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(product.id)}
                                        onChange={() => toggle(product.id)}
                                        className="w-4 h-4 rounded text-blue-600"
                                    />
                                    <span className="text-xs font-medium text-gray-700 bg-white/90 px-1.5 py-0.5 rounded">
                                        Alarma ekle
                                    </span>
                                </label>
                                <AlarmEditProductCard product={product} actions={null} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
