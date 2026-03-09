import { Suspense } from 'react';
import { ProductSearch } from '@/components/product-search';
import { CategorySidebar } from '@/components/category-sidebar';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-8 sm:py-12 text-center relative">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3">
            <span className="block text-blue-600">Market Fiyatlarını</span>
            Karşılaştır
          </h1>
          <p className="mt-2 max-w-xl mx-auto text-sm sm:text-base text-gray-500 hidden sm:block">
            A101, BİM, Şok ve diğer marketlerdeki fiyatları takip edin, en uygun sepeti oluşturun.
          </p>
        </div>
      </section>

      {/* App Content */}
      <section className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-6">
        <Suspense fallback={<div>Kategoriler yükleniyor...</div>}>
          <CategorySidebar />
        </Suspense>
        <div className="flex-1">
          <Suspense fallback={<div>Yükleniyor...</div>}>
            <ProductSearch />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
