export default function RootLoading() {
    return (
        <main className="min-h-screen bg-gray-50">
            <section className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 flex flex-col md:flex-row gap-2 md:gap-4 animate-pulse">
                <div className="w-full md:w-56 h-64 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1">
                    <div className="h-10 bg-gray-200 rounded w-full max-w-md mb-4" />
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="aspect-[4/5] bg-gray-200 rounded-lg" />
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
