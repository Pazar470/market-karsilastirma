'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

export function NavigationButtons() {
    const router = useRouter();

    return (
        <div className="flex gap-2 mb-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="gap-2"
            >
                <ArrowLeft className="h-4 w-4" />
                Geri Dön
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="gap-2"
            >
                <Home className="h-4 w-4" />
                Ana Sayfa
            </Button>
        </div>
    );
}
