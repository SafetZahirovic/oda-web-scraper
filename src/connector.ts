import { ProductData } from './core/types';
import { EventEmitter } from "node:events"
import { databaseService } from './database/service';

/**
 * Global event emitter for database connector
 */
const globalEventEmitter = new EventEmitter();

/**
 * Event names for the database connector
 */
export const CONNECTOR_EVENTS = {
    CATEGORY_SCRAPING_STARTED: 'category_scraping_started',      // When a main category (URL) starts
    SUBCATEGORY_SCRAPING_STARTED: 'subcategory_scraping_started', // When a subcategory starts being scraped
    SUBCATEGORY_SCRAPING_FINISHED: 'subcategory_scraping_finished', // When a single subcategory is done
    CATEGORY_SCRAPING_FINISHED: 'category_scraping_finished',    // When all subcategories for one URL are done
    ALL_SCRAPING_FINISHED: 'all_scraping_finished'               // When everything is done
} as const;

/**
 * Event data types
 */
export type CategoryScrapingStartedEvent = {
    url: string;
    urlIndex: number;
    categoryName: string;
    categoryId?: string;
    timestamp: Date;
};

export type SubcategoryScrapingStartedEvent = {
    url: string;
    urlIndex: number;
    categoryId: string;
    subcategoryName: string;
    subcategoryUrl: string;
    subcategoryId?: string;
    timestamp: Date;
};

export type SubcategoryScrapingFinishedEvent = {
    url: string;
    urlIndex: number;
    categoryId: string;
    subcategoryId: string;
    subcategoryName: string;
    products: ProductData[];
    success: boolean;
    error?: string;
    timestamp: Date;
};

export type CategoryScrapingFinishedEvent = {
    url: string;
    urlIndex: number;
    categoryId: string;
    totalProducts: number;
    totalSubcategories: number;
    success: boolean;
    error?: string;
    timestamp: Date;
};

export type AllScrapingFinishedEvent = {
    totalUrls: number;
    successfulUrls: number;
    totalProducts: number;
    timestamp: Date;
};

export type ItemScrapingFinishedEvent = {
    url: string;
    urlIndex: number;
    category: string;
    products: ProductData[];
    timestamp: Date;
};

export type ConnectorEvents = {
    handleCategoryScrapingStarted?: (event: CategoryScrapingStartedEvent) => Promise<void>;
    handleSubcategoryScrapingStarted?: (event: SubcategoryScrapingStartedEvent) => Promise<void>;
    handleSubcategoryScrapingFinished?: (event: SubcategoryScrapingFinishedEvent) => Promise<void>;
    handleCategoryScrapingFinished?: (event: CategoryScrapingFinishedEvent) => Promise<void>;
    handleAllScrapingFinished?: (event: AllScrapingFinishedEvent) => Promise<void>;
}

/**
 * Database Connector Interface
 */
export type DatabaseConnector = {
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    emitCategoryScrapingStarted: (url: string, urlIndex: number, categoryName: string, categoryId?: string) => void;
    emitSubcategoryScrapingStarted: (url: string, urlIndex: number, categoryId: string, subcategoryName: string, subcategoryUrl: string, subcategoryId?: string) => void;
    emitSubcategoryScrapingFinished: (url: string, urlIndex: number, categoryId: string, subcategoryId: string, subcategoryName: string, products: ProductData[], success: boolean, error?: string) => void;
    emitCategoryScrapingFinished: (url: string, urlIndex: number, categoryId: string, totalProducts: number, totalSubcategories: number, success: boolean, error?: string) => void;
    emitAllScrapingFinished: (totalUrls: number, successfulUrls: number, totalProducts: number) => void;
    isDbConnected: () => boolean;
}

/**
 * Global emit functions that can be used from anywhere (including workers)
 */
export const emitCategoryScrapingStarted = (url: string, urlIndex: number, categoryName: string, categoryId?: string): void => {
    const event: CategoryScrapingStartedEvent = {
        url,
        urlIndex,
        categoryName,
        categoryId,
        timestamp: new Date()
    };

    console.log(`🚀 Database Connector: Starting category "${categoryName}" for URL ${urlIndex + 1}`);
    globalEventEmitter.emit(CONNECTOR_EVENTS.CATEGORY_SCRAPING_STARTED, event);
};

export const emitSubcategoryScrapingStarted = (url: string, urlIndex: number, categoryId: string, subcategoryName: string, subcategoryUrl: string, subcategoryId?: string): void => {
    const event: SubcategoryScrapingStartedEvent = {
        url,
        urlIndex,
        categoryId,
        subcategoryName,
        subcategoryUrl,
        subcategoryId,
        timestamp: new Date()
    };

    globalEventEmitter.emit(CONNECTOR_EVENTS.SUBCATEGORY_SCRAPING_STARTED, event);
    console.log(`🚀 Database Connector: Starting subcategory "${subcategoryName}" for category ${categoryId}`);
};

export const emitSubcategoryScrapingFinished = (url: string, urlIndex: number, categoryId: string, subcategoryId: string, subcategoryName: string, products: ProductData[], success: boolean, error?: string): void => {
    const event: SubcategoryScrapingFinishedEvent = {
        url,
        urlIndex,
        categoryId,
        subcategoryId,
        subcategoryName,
        products,
        success,
        error,
        timestamp: new Date()
    };

    globalEventEmitter.emit(CONNECTOR_EVENTS.SUBCATEGORY_SCRAPING_FINISHED, event);
    console.log(`📦 Database Connector: Finished subcategory "${subcategoryName}" with ${products.length} products`);
};

export const emitItemScrapingFinished = (url: string, urlIndex: number, category: string, products: ProductData[]): void => {
    const event: ItemScrapingFinishedEvent = {
        url,
        urlIndex,
        category,
        products,
        timestamp: new Date()
    };

    // Note: This is kept for backwards compatibility but should use subcategory events instead
    console.log(`📦 Database Connector: Legacy item scraping finished for ${category} with ${products.length} products`);
};

export const emitCategoryScrapingFinished = (url: string, urlIndex: number, categoryId: string, totalProducts: number, totalSubcategories: number, success: boolean, error?: string): void => {
    const event: CategoryScrapingFinishedEvent = {
        url,
        urlIndex,
        categoryId,
        totalProducts,
        totalSubcategories,
        success,
        error,
        timestamp: new Date()
    };

    globalEventEmitter.emit(CONNECTOR_EVENTS.CATEGORY_SCRAPING_FINISHED, event);
};

export const emitAllScrapingFinished = (totalUrls: number, successfulUrls: number, totalProducts: number): void => {
    const event: AllScrapingFinishedEvent = {
        totalUrls,
        successfulUrls,
        totalProducts,
        timestamp: new Date()
    };

    globalEventEmitter.emit(CONNECTOR_EVENTS.ALL_SCRAPING_FINISHED, event);
};


/**
 * Factory function to create a database connector
 */
export const createDatabaseConnector = (events: ConnectorEvents): DatabaseConnector => {
    let dbConnected = false;

    /**
     * Setup event handlers for database operations
     */
    const setupEventHandlers = ({ handleCategoryScrapingStarted, handleSubcategoryScrapingStarted, handleSubcategoryScrapingFinished, handleCategoryScrapingFinished, handleAllScrapingFinished }: ConnectorEvents): void => {
        if (handleCategoryScrapingStarted) {
            globalEventEmitter.on(CONNECTOR_EVENTS.CATEGORY_SCRAPING_STARTED, handleCategoryScrapingStarted.bind(globalEventEmitter));
        }

        if (handleSubcategoryScrapingStarted) {
            globalEventEmitter.on(CONNECTOR_EVENTS.SUBCATEGORY_SCRAPING_STARTED, handleSubcategoryScrapingStarted.bind(globalEventEmitter));
        }

        if (handleSubcategoryScrapingFinished) {
            globalEventEmitter.on(CONNECTOR_EVENTS.SUBCATEGORY_SCRAPING_FINISHED, handleSubcategoryScrapingFinished.bind(globalEventEmitter));
        }

        if (handleCategoryScrapingFinished) {
            // Handle when a category (main URL) is finished (all items/subcategories done)
            globalEventEmitter.on(CONNECTOR_EVENTS.CATEGORY_SCRAPING_FINISHED, handleCategoryScrapingFinished.bind(globalEventEmitter));
        }

        if (handleAllScrapingFinished) {
            // Handle when all scraping is finished completely
            globalEventEmitter.on(CONNECTOR_EVENTS.ALL_SCRAPING_FINISHED, handleAllScrapingFinished.bind(globalEventEmitter));
        }
    };

    // Setup handlers
    setupEventHandlers(events);

    return {
        /**
         * Connect to the database (actual database connection)
         */
        async connect(): Promise<void> {
            try {
                console.log('🔗 Connecting to database...');

                // Test database connection
                const isConnected = await databaseService.testConnection();
                if (!isConnected) {
                    throw new Error('Database connection test failed');
                }

                dbConnected = true;
                console.log('✅ Database connected successfully');
            } catch (error) {
                console.error('❌ Failed to connect to database:', error);
                throw error;
            }
        },

        /**
         * Disconnect from the database
         */
        async disconnect(): Promise<void> {
            try {
                console.log('🔌 Disconnecting from database...');

                // No explicit disconnection needed for Supabase client
                dbConnected = false;
                console.log('✅ Database disconnected successfully');
            } catch (error) {
                console.error('❌ Failed to disconnect from database:', error);
                throw error;
            }
        },

        /**
         * Handle when a category starts being scraped
         */
        emitCategoryScrapingStarted(url: string, urlIndex: number, categoryName: string, categoryId?: string): void {
            emitCategoryScrapingStarted(url, urlIndex, categoryName, categoryId);
        },

        /**
         * Handle when a subcategory starts being scraped
         */
        emitSubcategoryScrapingStarted(url: string, urlIndex: number, categoryId: string, subcategoryName: string, subcategoryUrl: string, subcategoryId?: string): void {
            emitSubcategoryScrapingStarted(url, urlIndex, categoryId, subcategoryName, subcategoryUrl, subcategoryId);
        },

        /**
         * Handle when a subcategory scraping is finished
         */
        emitSubcategoryScrapingFinished(url: string, urlIndex: number, categoryId: string, subcategoryId: string, subcategoryName: string, products: ProductData[], success: boolean, error?: string): void {
            emitSubcategoryScrapingFinished(url, urlIndex, categoryId, subcategoryId, subcategoryName, products, success, error);
        },

        /**
         * Handle when a category (main URL) scraping is finished (all subcategories done)
         */
        emitCategoryScrapingFinished(url: string, urlIndex: number, categoryId: string, totalProducts: number, totalSubcategories: number, success: boolean, error?: string): void {
            emitCategoryScrapingFinished(url, urlIndex, categoryId, totalProducts, totalSubcategories, success, error);
        },

        /**
         * Handle when all scraping is finished completely
         */
        emitAllScrapingFinished(totalUrls: number, successfulUrls: number, totalProducts: number): void {
            emitAllScrapingFinished(totalUrls, successfulUrls, totalProducts);
        },

        /**
         * Get connection status
         */
        isDbConnected(): boolean {
            return dbConnected;
        }
    };
};

/**
 * Convenience exports for easy access to global emit functions
 */
export const connector = {
    emitCategoryScrapingStarted,
    emitSubcategoryScrapingStarted,
    emitSubcategoryScrapingFinished,
    emitCategoryScrapingFinished,
    emitAllScrapingFinished
};

