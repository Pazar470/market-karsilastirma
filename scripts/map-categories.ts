
import { prisma } from '../lib/db';

async function mapCategories() {
    console.log('--- Mapping Categories (Path-Based Bridge Strategy) ---');

    // 1. Fetch all products
    // We select 'category' (The Market Path) and 'name' (For fallback)
    const products = await prisma.product.findMany({
        select: { id: true, name: true, category: true, categoryId: true }
    });

    console.log(`Processing ${products.length} products...`);

    const stats = { mapped: 0, updated: 0, unmapped: new Set<string>() };
    const batchUpdates: any[] = [];

    // MASTER CATEGORY DICTIONARY
    const masterCategories = await prisma.category.findMany();
    const slugToId = new Map(masterCategories.map(c => [c.slug, c.id]));

    for (const p of products) {
        if (!p.category) continue;

        const path = p.category.toLowerCase();
        // const name = p.name.toLowerCase(); // Name is less important now, but can be used for disambiguation if needed.
        let targetSlug: string | null = null;

        // --- 1. GLOBAL EXCLUSIONS (The Firewall) ---
        // If the path contains these, it is STRICTLY NOT Food/Target
        if (path.includes('elektronik') || path.includes('züccaciye') || path.includes('giyim') || path.includes('kitap') || path.includes('kırtasiye') || path.includes('oyuncak')) {
            // Explicitly set to null (or a specific non-food category if we had one)
            // For now, we assume if it's electronics, we don't map it to a food category.
            // If the product was previously mapped to a food category, this logic prevents re-mapping it there.
            // But we might want to CLEAR the categoryId if it was wrong?
            // Yes, let's say if we identify it as 'elektronik', we map it to 'elektronik' master if exists, or leave it null.
            if (slugToId.has('elektronik')) targetSlug = 'elektronik';
            else if (slugToId.has('ev-gerecleri')) targetSlug = 'ev-gerecleri';
            else {
                // Determine if we should clear the existing bad mapping
                // If current categoryId points to 'kasar-peyniri' but path is 'elektronik', we MUST change it.
                // Since we don't know what the current categoryId points to easily without a join, 
                // we'll just set targetSlug to null, effectively "Unmapping" it if we enforce it?
                // Actually, the loop only updates if targetSlug is found.
                // TO FIX "Tost Makinesi as Cheese": We need to explicitly map it to SOMETHING else or NULL.
                // Let's assume user wants it out of "Kaşar".
                // If I set targetSlug = 'elektronik' (and create it if missing), that's best.
                // For now, let's map to 'ev-gerecleri' if 'elektronik' is missing.
                targetSlug = 'ev-gerecleri';
            }
        }

        // --- 2. PATH-BASED MAPPING (The Bridge) ---

        // Cheese
        else if (path.includes('kaşar')) targetSlug = 'kasar-peyniri';
        else if (path.includes('peynir') && (path.includes('dilimli') || path.includes('tost'))) targetSlug = 'kasar-peyniri';
        else if (path.includes('tost peynir')) targetSlug = 'kasar-peyniri'; // Explicit path

        // Dairy Generic
        else if (path.includes('süzme peynir') || path.includes('beyaz peynir')) targetSlug = 'beyaz-peynir';
        else if (path.includes('peynir') && (path.includes('labne') || path.includes('krem') || path.includes('tulum'))) targetSlug = 'diger-peynir';
        else if (path.includes('peynir')) targetSlug = 'beyaz-peynir'; // Default Cheese

        // Milk / Breakfast
        else if (path.includes('süt') && path.includes('kahvaltılık')) {
            if (path.includes('yumurta')) targetSlug = 'yumurta';
            else if (path.includes('tereyağ') || path.includes('margarin')) targetSlug = 'tereyagi-margarin';
            else if (path.includes('süt') && !path.includes('ürünleri')) targetSlug = 'sut'; // Pure 'Süt'
        }
        else if (path.includes('yoğurt')) targetSlug = 'yogurt';
        else if (path.includes('ayran') || path.includes('kefir')) targetSlug = 'ayran-kefir';

        // Meat / Deli
        else if (path.includes('şarküteri') || path.includes('et') || path.includes('tavuk')) {
            if (path.includes('sucuk') || path.includes('salam') || path.includes('sosis') || path.includes('pastırma')) targetSlug = 'sarkuteri';
            else if (path.includes('tavuk') || path.includes('piliç')) targetSlug = 'tavuk';
            else if (path.includes('kıyma') || path.includes('kuşbaşı') || path.includes('dana') || path.includes('kuzu')) targetSlug = 'kirmizi-et';
        }

        // Pantry / Basic
        else if (path.includes('yağ')) {
            if (path.includes('zeytinyağ')) targetSlug = 'zeytinyagi';
            else if (path.includes('ayçiçek')) targetSlug = 'aycicek-yagi';
        }
        else if (path.includes('çay')) targetSlug = 'cay';
        else if (path.includes('şeker')) targetSlug = 'seker';
        else if (path.includes('bakliyat') || path.includes('pirinç') || path.includes('mercimek') || path.includes('bulgur')) targetSlug = 'bakliyat';
        else if (path.includes('makarna')) targetSlug = 'makarna';
        else if (path.includes('salça')) targetSlug = 'salca';
        else if (path.includes('un') && !path.includes('mamül')) targetSlug = 'un';

        // Snacks
        else if (path.includes('atıştırmalık') || path.includes('cips') || path.includes('çikolata') || path.includes('bisküvi')) targetSlug = 'atistirmalik';

        // --- 3. FALLBACK: Name-Based Prediction (For legacy data or vague paths) ---
        if (!targetSlug) {
            // Optional: If path is just "Gıda" or empty, maybe look at name?
            // But for now, we want to be STRICT.
            stats.unmapped.add(p.category);
        }

        // --- 4. EXECUTE UPDATE ---
        if (targetSlug && slugToId.has(targetSlug)) {
            const newCatId = slugToId.get(targetSlug);
            if (p.categoryId !== newCatId) {
                batchUpdates.push(
                    prisma.product.update({
                        where: { id: p.id },
                        data: { categoryId: newCatId }
                    })
                );
                stats.updated++;
            }
            stats.mapped++;
        }
    }

    // Execute Batch (Sequentially to avoid connection pool exhaustion)
    console.log(`Executing ${batchUpdates.length} updates...`);
    for (let i = 0; i < batchUpdates.length; i += 50) {
        const chunk = batchUpdates.slice(i, i + 50);
        await prisma.$transaction(chunk);
        process.stdout.write('.');
    }
    console.log('\nDone.');

    console.log(`Total Products: ${products.length}`);
    console.log(`Mapped: ${stats.mapped}`);
    console.log(`Updated DB: ${stats.updated}`);
    console.log('Unmapped Categories (Top 20 Samples):');
    Array.from(stats.unmapped).slice(0, 20).forEach(c => console.log(`- ${c}`));
}

mapCategories()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
