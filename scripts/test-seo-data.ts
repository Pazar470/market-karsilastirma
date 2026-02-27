
import { prisma } from '../lib/db';

async function getCheapestStaples(slug: string, queryFilter?: string) {
    const category = await prisma.category.findUnique({
        where: { slug },
        include: { children: true }
    });

    if (!category) {
        console.log(`Category not found: ${slug}`);
        return [];
    }
    console.log(`Found Cat: ${category.name} (${category.id}) - Children: ${category.children.length}`);

    const where = {
        OR: [
            { categoryId: category.id },
            { masterCategory: { parentId: category.id } }
        ],
        // name: queryFilter ? { contains: queryFilter } : undefined
    };

    const products = await prisma.product.findMany({
        where: where,
        include: {
            prices: {
                orderBy: { date: 'desc' },
                take: 1,
                include: { market: true }
            }
        }
    });

    console.log(`Products found in cat (before name filter): ${products.length}`);

    const filtered = products.filter(p => !queryFilter || p.name.includes(queryFilter));
    console.log(`Products after name filter '${queryFilter}': ${filtered.length}`);

    return filtered
        .map(p => {
            const price = p.prices[0];
            if (!price) return null;

            let unitPrice = Number(price.amount);
            if (p.quantityAmount) {
                unitPrice = Number(price.amount) / p.quantityAmount;
            }

            return {
                name: p.name,
                price: Number(price.amount),
                unitPrice,
                market: price.market.name,
                cat: p.category
            };
        })
        .filter(p => p !== null)
        .sort((a, b) => a!.unitPrice - b!.unitPrice)
        .slice(0, 3);
}

async function test() {
    console.log('--- Testing SEO Page Data ---');

    const staples = [
        { slug: 'sivi-yag', filter: 'Ayçiçek' },
        { slug: 'seker-tuz-baharat', filter: 'Toz Şeker' },
        { slug: 'un-pastane-malzemeleri', filter: 'Un' },
        { slug: 'cay-kahve', filter: 'Çay' },
        { slug: 'yumurta', filter: '' },
    ];

    for (const s of staples) {
        console.log(`\nChecking: ${s.slug} (${s.filter})`);
        const items = await getCheapestStaples(s.slug, s.filter);
        items.forEach(i => {
            console.log(`- ${i.unitPrice.toFixed(2)} TL/birim | ${i.price} TL | ${i.market} | ${i.name}`);
        });
    }
}

test()
    .finally(() => prisma.$disconnect());
