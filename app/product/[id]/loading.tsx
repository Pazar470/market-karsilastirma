import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ProductLoading() {
    return (
        <div className="container mx-auto px-4 py-8 animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
            <Card className="overflow-hidden">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-gray-100 p-8 flex items-center justify-center min-h-[400px]">
                        <div className="w-full aspect-square max-w-md bg-gray-200 rounded-lg" />
                    </div>
                    <div className="p-8 space-y-4">
                        <div className="h-4 w-3/4 bg-gray-200 rounded" />
                        <div className="h-8 w-full bg-gray-200 rounded" />
                        <div className="h-6 w-1/2 bg-gray-200 rounded" />
                        <div className="h-12 w-32 bg-gray-200 rounded mt-6" />
                        <div className="flex gap-2 mt-4">
                            <div className="h-9 w-24 bg-gray-200 rounded" />
                            <div className="h-9 w-24 bg-gray-200 rounded" />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
