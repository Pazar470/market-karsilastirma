
import { Product } from '@prisma/client';

export interface MarketAdapter {
    /**
     * Unique identifier for the market (e.g. 'a101', 'sok')
     */
    marketId: string;

    /**
     * Converts a raw market category string into a system Master Category slug.
     * @param marketCategoryString The category name coming from the market (e.g. "Süt & Kahvaltılık")
     * @param productName Optional: The product name to help with disambiguation (e.g. "Ayçiçek Yağı" -> "sivi-yag")
     */
    mapCategory(marketCategoryString: string, productName?: string): string | null;

    /**
     * Optional: Validates if a product is 'Active' based on market-specific logic.
     * Some markets might have 'isSelling' flags, others might use 'stock' > 0.
     */
    isActive(product: any): boolean;
}
