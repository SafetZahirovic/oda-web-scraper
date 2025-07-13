/**
 * Database schema types for Supabase
 */

export interface Category {
    id: string;
    name: string;
    url: string;
    url_index: number;
    total_subcategories: number;
    total_items: number;
    scraping_started_at: string;
    scraping_completed_at?: string;
    scraping_success: boolean;
    error_message?: string;
    created_at: string;
    updated_at: string;
}

export interface Subcategory {
    id: string;
    category_id: string;
    name: string;
    url: string;
    total_items: number;
    scraping_started_at: string;
    scraping_completed_at?: string;
    scraping_success: boolean;
    error_message?: string;
    created_at: string;
    updated_at: string;
}

export interface Item {
    id: string;
    subcategory_id: string;
    category_id: string;
    name: string;
    brand: string; // Changed from nullable to string for upsert consistency
    price?: number | null;
    original_price?: number | null;
    image_url?: string | null;
    product_url?: string | null;
    description?: string | null;
    in_stock: boolean;
    scraped_at: string;
    created_at: string;
    updated_at: string;
}

/**
 * Database operations interface
 */
export interface DatabaseOperations {
    // Categories - upsert operations
    upsertCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category>;
    updateCategory(id: string, updates: Partial<Category>): Promise<Category>;
    getCategory(id: string): Promise<Category | null>;
    getCategoryByUrl(url: string): Promise<Category | null>;

    // Subcategories - upsert operations
    upsertSubcategory(subcategory: Omit<Subcategory, 'id' | 'created_at' | 'updated_at'>): Promise<Subcategory>;
    updateSubcategory(id: string, updates: Partial<Subcategory>): Promise<Subcategory>;
    getSubcategory(id: string): Promise<Subcategory | null>;
    getSubcategoryByCategoryAndUrl(categoryId: string, url: string): Promise<Subcategory | null>;

    // Items - upsert operations
    upsertItems(items: Omit<Item, 'id' | 'created_at' | 'updated_at'>[]): Promise<Item[]>;
    getItemsBySubcategory(subcategoryId: string): Promise<Item[]>;
    deleteItemsBySubcategory(subcategoryId: string): Promise<void>;

    // Stats
    getCategoryStats(categoryId: string): Promise<{
        totalSubcategories: number;
        totalItems: number;
        completedSubcategories: number;
    }>;
}

/**
 * Supabase table names
 */
export const TABLE_NAMES = {
    CATEGORIES: 'categories',
    SUBCATEGORIES: 'subcategories',
    ITEMS: 'items'
} as const;
