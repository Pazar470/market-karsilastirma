
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function syncCategories() {
    console.log('🚀 Starting Category Sync...');

    const marketFiles = [
        { name: 'Migros', file: 'migros_categories.json' },
        { name: 'A101', file: 'a101_categories.json' },
        { name: 'Sok', file: 'sok_categories.json' }
    ];

    for (const entry of marketFiles) {
        const filePath = path.join(process.cwd(), entry.file);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ File not found: ${entry.file}`);
            continue;
        }

        console.log(`📦 Processing ${entry.name}...`);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const categories = data.categories || data; // Handle different JSON structures

        for (const cat of categories) {
            // Migros uses 'path' like "Meyve, Sebze > Meyve > Egzotik Meyveler"
            // A101 uses 'path' like "Kişisel Bakım > Duş, Banyo, Sabun"
            // Sok uses 'path' like "Yemeklik Malzemeler > Kağıt Ürünleri"

            const pathParts = cat.path ? cat.path.split(' > ') : [cat.name];
            let lastParentId: string | null = null;

            for (let i = 0; i < pathParts.length; i++) {
                const partName = pathParts[i].trim();
                const isLeaf = i === pathParts.length - 1;

                // Parent categories can be shared, but leaf categories are market-specific for now
                // to allow precise tracking unless we map them via MASTER_CATEGORIES.
                const slug = partName.toLowerCase()
                    .replace(/ /g, '-')
                    .replace(/[^\w-]+/g, '')
                    + (isLeaf ? `-${entry.name.toLowerCase()}` : '');

                const catRecord = await prisma.category.upsert({
                    where: { slug },
                    update: { name: partName },
                    create: {
                        name: partName,
                        slug: slug,
                        parentId: lastParentId
                    }
                });
                lastParentId = catRecord.id;
            }
        }
    }

    console.log('✅ Category Sync Finished.');
}

syncCategories()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
