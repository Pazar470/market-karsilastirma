import { Suspense } from 'react';
import { ProductSearch } from '@/components/product-search';
import { CategorySidebar } from '@/components/category-sidebar';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* İçerik: mobilde ürünler ön planda, kategoriler silik etiket */}
      <section className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col md:flex-row gap-4 md:gap-6">
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
