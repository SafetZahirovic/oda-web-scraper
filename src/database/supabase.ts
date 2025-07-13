import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Category, Subcategory, Item, DatabaseOperations, TABLE_NAMES } from './types';

/**
 * Supabase configuration
 */
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url-here';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key-here';

/**
 * Supabase client instance
 */
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client
 */
export function getSupabaseClient(): SupabaseClient {
    if (!supabaseClient) {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

/**
 * Supabase database operations implementation
 */
export class SupabaseOperations implements DatabaseOperations {
    private client: SupabaseClient;

    constructor() {
        this.client = getSupabaseClient();
    }

    /**
     * Categories operations
     */
    async upsertCategory(categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
        const { data, error } = await this.client
            .from(TABLE_NAMES.CATEGORIES)
            .upsert(
                { ...categoryData, updated_at: new Date().toISOString() },
                { onConflict: 'url' }
            )
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to upsert category: ${error.message}`);
        }

        return data;
    }

    async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
        const { data, error } = await this.client
            .from(TABLE_NAMES.CATEGORIES)
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update category: ${error.message}`);
        }

        return data;
    }

    async getCategory(id: string): Promise<Category | null> {
        const { data, error } = await this.client
            .from(TABLE_NAMES.CATEGORIES)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to get category: ${error.message}`);
        }

        return data;
    }

    async getCategoryByUrl(url: string): Promise<Category | null> {
        const { data, error } = await this.client
            .from(TABLE_NAMES.CATEGORIES)
            .select('*')
            .eq('url', url)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to get category by URL: ${error.message}`);
        }

        return data;
    }

    /**
     * Subcategories operations
     */
    async upsertSubcategory(subcategoryData: Omit<Subcategory, 'id' | 'created_at' | 'updated_at'>): Promise<Subcategory> {
        const { data, error } = await this.client
            .from(TABLE_NAMES.SUBCATEGORIES)
            .upsert(
                { ...subcategoryData, updated_at: new Date().toISOString() },
                { onConflict: 'category_id,url' }
            )
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to upsert subcategory: ${error.message}`);
        }

        return data;
    }

    async updateSubcategory(id: string, updates: Partial<Subcategory>): Promise<Subcategory> {
        const { data, error } = await this.client
            .from(TABLE_NAMES.SUBCATEGORIES)
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update subcategory: ${error.message}`);
        }

        return data;
    }

    async getSubcategory(id: string): Promise<Subcategory | null> {
        const { data, error } = await this.client
            .from(TABLE_NAMES.SUBCATEGORIES)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to get subcategory: ${error.message}`);
        }

        return data;
    }

    async getSubcategoryByCategoryAndUrl(categoryId: string, url: string): Promise<Subcategory | null> {
        const { data, error } = await this.client
            .from(TABLE_NAMES.SUBCATEGORIES)
            .select('*')
            .eq('category_id', categoryId)
            .eq('url', url)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to get subcategory by category and URL: ${error.message}`);
        }

        return data;
    }

    /**
     * Items operations
     */
    async upsertItems(itemsData: Omit<Item, 'id' | 'created_at' | 'updated_at'>[]): Promise<Item[]> {
        if (itemsData.length === 0) {
            return [];
        }

        // Add updated_at to all items and handle nullable brand field
        const itemsWithTimestamp = itemsData.map(item => ({
            ...item,
            brand: item.brand || '', // Convert null/undefined to empty string for upsert
            updated_at: new Date().toISOString()
        }));

        // Try upsert first, fallback to regular insert if constraint doesn't exist
        let { data, error } = await this.client
            .from(TABLE_NAMES.ITEMS)
            .upsert(
                itemsWithTimestamp,
                { onConflict: 'subcategory_id,name,brand' }
            )
            .select();

        // If upsert fails due to missing constraint, fallback to regular insert
        if (error && error.message.includes('no unique or exclusion constraint matching')) {
            console.warn('⚠️ Unique constraint missing, falling back to regular insert. Please run the database migration.');
            console.warn('⚠️ See URGENT_MIGRATION.md for instructions.');

            // Clear existing items for this subcategory to avoid duplicates
            if (itemsWithTimestamp.length > 0) {
                await this.deleteItemsBySubcategory(itemsWithTimestamp[0].subcategory_id);
            }

            // Use regular insert as fallback
            const result = await this.client
                .from(TABLE_NAMES.ITEMS)
                .insert(itemsWithTimestamp)
                .select();

            data = result.data;
            error = result.error;
        }

        if (error) {
            throw new Error(`Failed to upsert/insert items: ${error.message}`);
        }

        return data || [];
    }

    async getItemsBySubcategory(subcategoryId: string): Promise<Item[]> {
        const { data, error } = await this.client
            .from(TABLE_NAMES.ITEMS)
            .select('*')
            .eq('subcategory_id', subcategoryId);

        if (error) {
            throw new Error(`Failed to get items: ${error.message}`);
        }

        return data || [];
    }

    async deleteItemsBySubcategory(subcategoryId: string): Promise<void> {
        const { error } = await this.client
            .from(TABLE_NAMES.ITEMS)
            .delete()
            .eq('subcategory_id', subcategoryId);

        if (error) {
            throw new Error(`Failed to delete items: ${error.message}`);
        }
    }

    /**
     * Stats operations
     */
    async getCategoryStats(categoryId: string): Promise<{
        totalSubcategories: number;
        totalItems: number;
        completedSubcategories: number;
    }> {
        // Get subcategories count
        const { count: totalSubcategories, error: subcategoriesError } = await this.client
            .from(TABLE_NAMES.SUBCATEGORIES)
            .select('*', { count: 'exact', head: true })
            .eq('category_id', categoryId);

        if (subcategoriesError) {
            throw new Error(`Failed to get subcategories count: ${subcategoriesError.message}`);
        }

        // Get completed subcategories count
        const { count: completedSubcategories, error: completedError } = await this.client
            .from(TABLE_NAMES.SUBCATEGORIES)
            .select('*', { count: 'exact', head: true })
            .eq('category_id', categoryId)
            .eq('scraping_success', true)
            .not('scraping_completed_at', 'is', null);

        if (completedError) {
            throw new Error(`Failed to get completed subcategories count: ${completedError.message}`);
        }

        // Get total items count
        const { count: totalItems, error: itemsError } = await this.client
            .from(TABLE_NAMES.ITEMS)
            .select('*', { count: 'exact', head: true })
            .eq('category_id', categoryId);

        if (itemsError) {
            throw new Error(`Failed to get items count: ${itemsError.message}`);
        }

        return {
            totalSubcategories: totalSubcategories || 0,
            totalItems: totalItems || 0,
            completedSubcategories: completedSubcategories || 0
        };
    }

    /**
     * Test database connection
     */
    async testConnection(): Promise<boolean> {
        try {
            const { error } = await this.client
                .from(TABLE_NAMES.CATEGORIES)
                .select('id')
                .limit(1);

            return !error;
        } catch {
            return false;
        }
    }
}

/**
 * Create and export singleton instance
 */
export const databaseOperations = new SupabaseOperations();
