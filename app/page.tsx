import { Suspense } from 'react';
import { ProductSearch } from '@/components/product-search';
import { CategorySidebar } from '@/components/category-sidebar';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl mb-4">
            <span className="block text-blue-600">Market Fiyatlarını</span>
            Karşılaştır
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            A101, BİM, Şok ve diğer marketlerdeki fiyatları anlık olarak takip edin, tasarruf edin.
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
