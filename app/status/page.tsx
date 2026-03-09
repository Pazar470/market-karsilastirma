
import { PrismaClient } from '@prisma/client';
import React from 'react';

// Initialize Prisma
const prisma = new PrismaClient();

// Force dynamic rendering so we always get fresh data
export const dynamic = 'force-dynamic';

async function getStats() {
    const totalProducts = await prisma.product.count();
    const totalPrices = await prisma.price.count();
    const totalMarkets = await prisma.market.count();

    // Markets distribution
    const markets = await prisma.market.findMany({
        include: {
            _count: {
                select: { prices: true }
            }
        }
    });

    // Check for "Orphan" products (No prices attached)
    // Prisma doesn't support "does not have" in count easily without raw query or lengthy syntax, 
    // but we can check distinct productIds in Price table vs Total Products.
    // A simpler proxy: Products with 0 prices.
    const productsWithNoPrices = await prisma.product.count({
        where: {
            prices: {
                none: {}
            }
        }
    });

    // Recent Activity (Last 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentPrices = await prisma.price.count({
        where: {
            date: {
                gte: yesterday
            }
        }
    });

    return {
        totalProducts,
        totalPrices,
        totalMarkets,
        markets,
        productsWithNoPrices,
        recentPrices
    };
}

export default async function StatusPage() {
    const stats = await getStats();

    return (
        <div className="container mx-auto py-10 px-4">
            <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-100">
                Sistem Durum Raporu 🟢
            </h1>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <StatCard
                    title="Toplam Ürün"
                    value={stats.totalProducts}
                    icon="📦"
                    desc="Veritabanındaki eşsiz ürün sayısı"
                />
                <StatCard
                    title="Toplam Fiyat"
                    value={stats.totalPrices}
                    icon="🏷️"
                    desc="Tüm zamanların fiyat kayıtları"
                />
                <StatCard
                    title="Fiyatsız Ürünler"
                    value={stats.productsWithNoPrices}
                    icon="⚠️"
                    desc="Yetim veya hatalı ürünler"
                    alert={stats.productsWithNoPrices > 0}
                />
                <StatCard
                    title="Son 24 Saat"
                    value={stats.recentPrices}
                    icon="⏱️"
                    desc="Güncel eklenen fiyat sayısı"
                />
            </div>

            {/* Market Distribution */}
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                Market Dağılımı
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.markets.map((m) => (
                    <div key={m.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold">{m.name}</h3>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Aktif
                            </span>
                        </div>
                        <p className="text-3xl font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {m._count.prices.toLocaleString('tr-TR')}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Toplam Fiyat Girişi</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, desc, alert = false }: { title: string, value: number, icon: string, desc: string, alert?: boolean }) {
    return (
        <div className={`p-6 rounded-lg shadow-md border ${alert ? 'bg-red-50 border-red-200' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
            <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{icon}</span>
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">{title}</h3>
            </div>
            <p className={`text-4xl font-bold mb-1 ${alert ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                {value.toLocaleString('tr-TR')}
            </p>
            <p className="text-sm text-gray-400">{desc}</p>
        </div>
    );
}
