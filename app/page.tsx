import { Suspense } from 'react';
import { ProductSearch } from '@/components/product-search';
import { CategorySidebar } from '@/components/category-sidebar';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* İçerik: mobilde ürünler ön planda, kategoriler silik etiket */}
      <section className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 flex flex-col md:flex-row gap-2 md:gap-4">
        <Suspense fallback={<div className="w-full md:w-56 h-64 bg-gray-200 rounded-lg animate-pulse shrink-0" />}>
          <CategorySidebar />
        </Suspense>
        <div className="flex-1 min-w-0">
          <Suspense fallback={
            <div className="space-y-4 animate-pulse">
              <div className="h-10 bg-gray-200 rounded w-full max-w-md" />
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-[4/5] bg-gray-200 rounded-lg" />
                ))}
              </div>
            </div>
          }>
            <ProductSearch />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
