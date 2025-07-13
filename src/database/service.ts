import { databaseOperations } from './supabase';
import { Category, Subcategory, Item } from './types';
import { ProductData, CategoryInfo, SubcategoryInfo } from '../core/types';

/**
 * Database service that handles all database operations for the scraper
 */
export class DatabaseService {
    private operations = databaseOperations;

    /**
     * Test database connection
     */
    async testConnection(): Promise<boolean> {
        try {
            return await this.operations.testConnection();
        } catch (error) {
            console.error('Database connection test failed:', error);
            return false;
        }
    }

    /**
     * Create or update a category when scraping starts
     */
    async createCategory(url: string, name: string, urlIndex: number): Promise<string> {
        try {
            // Use upsert to create or update category in one operation
            const category = await this.operations.upsertCategory({
                name,
                url,
                url_index: urlIndex,
                total_subcategories: 0,
                total_items: 0,
                scraping_started_at: new Date().toISOString(),
                scraping_success: false
            });

            console.log(`📝 Database: Upserted category "${name}" with ID: ${category.id}`);
            return category.id;
        } catch (error) {
            console.error(`❌ Database: Failed to upsert category "${name}":`, error);
            throw error;
        }
    }

    /**
     * Update category when scraping completes
     */
    async updateCategoryCompletion(categoryId: string, success: boolean, error?: string): Promise<void> {
        try {
            await this.operations.updateCategory(categoryId, {
                scraping_completed_at: new Date().toISOString(),
                scraping_success: success,
                error_message: error
            });

            const status = success ? 'successfully' : 'with errors';
            console.log(`📝 Database: Updated category completion ${status}`);
        } catch (dbError) {
            console.error('❌ Database: Failed to update category completion:', dbError);
            throw dbError;
        }
    }

    /**
     * Create or update a subcategory when scraping starts
     */
    async createSubcategory(categoryId: string, name: string, url: string): Promise<string> {
        try {
            // First, delete old items if this subcategory already exists
            const existingSubcategory = await this.operations.getSubcategoryByCategoryAndUrl(categoryId, url);
            if (existingSubcategory) {
                await this.operations.deleteItemsBySubcategory(existingSubcategory.id);
                console.log(`📝 Database: Cleared old items from existing subcategory "${name}"`);
            }

            // Use upsert to create or update subcategory in one operation
            const subcategory = await this.operations.upsertSubcategory({
                category_id: categoryId,
                name,
                url,
                total_items: 0,
                scraping_started_at: new Date().toISOString(),
                scraping_success: false
            });

            console.log(`📝 Database: Upserted subcategory "${name}" with ID: ${subcategory.id}`);
            return subcategory.id;
        } catch (error) {
            console.error(`❌ Database: Failed to upsert subcategory "${name}":`, error);
            throw error;
        }
    }

    /**
     * Update subcategory when scraping completes
     */
    async updateSubcategoryCompletion(subcategoryId: string, success: boolean, error?: string): Promise<void> {
        try {
            await this.operations.updateSubcategory(subcategoryId, {
                scraping_completed_at: new Date().toISOString(),
                scraping_success: success,
                error_message: error
            });

            const status = success ? 'successfully' : 'with errors';
            console.log(`📝 Database: Updated subcategory completion ${status}`);
        } catch (dbError) {
            console.error('❌ Database: Failed to update subcategory completion:', dbError);
            throw dbError;
        }
    }

    /**
     * Save products for a subcategory using upsert
     */
    async saveProducts(categoryId: string, subcategoryId: string, products: ProductData[]): Promise<void> {
        try {
            if (products.length === 0) {
                console.log('📝 Database: No products to save');
                return;
            }

            // Transform ProductData to Item format
            const items: Omit<Item, 'id' | 'created_at' | 'updated_at'>[] = products.map(product => ({
                subcategory_id: subcategoryId,
                category_id: categoryId,
                name: product.name,
                brand: product.brand || '', // Ensure brand is never null/undefined for upsert
                price: product.price ? this.parsePrice(product.price) : null,
                original_price: product.discount && product.price ? this.parseOriginalPrice(product.price, product.discount) : null,
                image_url: product.image,
                product_url: product.link,
                description: product.description,
                in_stock: true, // Assume in stock if scraped
                scraped_at: new Date().toISOString()
            }));

            await this.operations.upsertItems(items);
            console.log(`📝 Database: Upserted ${products.length} products`);
        } catch (error) {
            console.error('❌ Database: Failed to upsert products:', error);
            throw error;
        }
    }

    /**
     * Get category statistics
     */
    async getCategoryStats(categoryId: string) {
        try {
            return await this.operations.getCategoryStats(categoryId);
        } catch (error) {
            console.error('❌ Database: Failed to get category stats:', error);
            throw error;
        }
    }

    /**
     * Parse price string to number
     */
    private parsePrice(priceString: string): number | null {
        try {
            // Remove "kr" and any spaces, replace comma with dot
            const cleaned = priceString.replace(/kr|,/gi, '').replace(',', '.').trim();
            const price = parseFloat(cleaned);
            return isNaN(price) ? null : price;
        } catch {
            return null;
        }
    }

    /**
     * Calculate original price from current price and discount
     */
    private parseOriginalPrice(currentPrice: string, discount: string): number | null {
        try {
            const price = this.parsePrice(currentPrice);
            if (!price) return null;

            // Try to parse discount percentage
            const discountMatch = discount.match(/(\d+)%/);
            if (discountMatch) {
                const discountPercent = parseInt(discountMatch[1]);
                return price / (1 - discountPercent / 100);
            }

            // Try to parse discount amount
            const discountAmount = this.parsePrice(discount);
            if (discountAmount) {
                return price + discountAmount;
            }

            return null;
        } catch {
            return null;
        }
    }
}

/**
 * Export singleton instance
 */
export const databaseService = new DatabaseService();
