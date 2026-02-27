
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BellPlus, CheckCircle2 } from 'lucide-react';

interface Alarm {
    id: string;
    name: string;
    includedProductIds: string;
}

export function AddToAlarmButton({ productId }: { productId: string }) {
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    const fetchAlarms = async () => {
        const res = await fetch('/api/alarms');
        if (res.ok) {
            const data = await res.json();
            // Map the formatted alarms (which already have arrays, but we check just in case)
            setAlarms(data);
        }
    };

    const handleAddToAlarm = async (alarmId: string) => {
        setStatus('loading');
        const alarm = alarms.find(a => a.id === alarmId);
        if (!alarm) return;

        // Note: API already parses JSON, but we check if it's string or array
        const currentIds = Array.isArray(alarm.includedProductIds)
            ? alarm.includedProductIds
            : JSON.parse((alarm.includedProductIds as any) || '[]');

        if (!currentIds.includes(productId)) {
            currentIds.push(productId);
            await fetch(`/api/alarms/${alarmId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    includedProductIds: JSON.stringify(currentIds)
                })
            });
        }

        setStatus('success');
        setTimeout(() => {
            setStatus('idle');
            setShowModal(false);
        }, 1500);
    };

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowModal(true);
                    fetchAlarms();
                }}
            >
                {status === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <BellPlus className="h-4 w-4" />}
            </Button>

            {showModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModal(false); }}
                >
                    <div
                        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Hangi Alarma Eklensin?</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {alarms.length > 0 ? alarms.map(alarm => (
                                <button
                                    key={alarm.id}
                                    onClick={() => handleAddToAlarm(alarm.id)}
                                    className="w-full text-left p-3 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all flex justify-between items-center group"
                                >
                                    <span className="text-sm font-medium text-gray-700">{alarm.name}</span>
                                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600">Seç</span>
                                </button>
                            )) : (
                                <p className="text-center text-gray-500 py-4 text-sm">Aktif alarm bulunamadı.</p>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-xs font-bold text-gray-400 hover:text-gray-600"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
