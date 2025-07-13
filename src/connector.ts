import { ProductData } from './core/types';
import { EventEmitter } from "node:events"

/**
 * Global event emitter for database connector
 */
const globalEventEmitter = new EventEmitter();

/**
 * Event names for the database connector
 */
export const CONNECTOR_EVENTS = {
    CATEGORY_SCRAPING_STARTED: 'category_scraping_started',    // When a category starts being scraped
    ITEM_SCRAPING_FINISHED: 'item_scraping_finished',          // When a single category is done
    CATEGORY_SCRAPING_FINISHED: 'category_scraping_finished',  // When all categories for one URL are done
    ALL_SCRAPING_FINISHED: 'all_scraping_finished'             // When everything is done
} as const;

/**
 * Event data types
 */
export type CategoryScrapingStartedEvent = {
    url: string;
    urlIndex: number;
    category: string;
    timestamp: Date;
};

export type ItemScrapingFinishedEvent = {
    url: string;
    urlIndex: number;
    category: string;
    products: ProductData[];
    timestamp: Date;
};

export type CategoryScrapingFinishedEvent = {
    url: string;
    urlIndex: number;
    totalProducts: number;
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

export type ConnectorEvents = {
    handleCategoryScrapingFinished?: (event: CategoryScrapingFinishedEvent) => Promise<void>;
    handleItemScrapingFinished?: (event: ItemScrapingFinishedEvent) => Promise<void>;
    handleAllScrapingFinished: (event: AllScrapingFinishedEvent) => Promise<void>;
}

/**
 * Database Connector Interface
 */
export type DatabaseConnector = {
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    emitCategoryScrapingStarted: (url: string, urlIndex: number, category: string) => void;
    emitCategoryScrapingFinished: (url: string, urlIndex: number, products: ProductData[], success: boolean, error?: string) => void;
    emitItemScrapingFinished: (url: string, urlIndex: number, category: string, products: ProductData[]) => void;
    emitAllScrapingFinished: (totalUrls: number, successfulUrls: number, totalProducts: number) => void;
    isDbConnected: () => boolean;
}

/**
 * Global emit functions that can be used from anywhere (including workers)
 */
export const emitCategoryScrapingStarted = (url: string, urlIndex: number, category: string): void => {
    const event: CategoryScrapingStartedEvent = {
        url,
        urlIndex,
        category,
        timestamp: new Date()
    };

    globalEventEmitter.emit(CONNECTOR_EVENTS.CATEGORY_SCRAPING_STARTED, event);
    console.log(`🚀 Database Connector: Starting category "${category}" for URL ${urlIndex + 1}`);
};

export const emitItemScrapingFinished = (url: string, urlIndex: number, category: string, products: ProductData[]): void => {
    const event: ItemScrapingFinishedEvent = {
        url,
        urlIndex,
        category,
        products,
        timestamp: new Date()
    };

    globalEventEmitter.emit(CONNECTOR_EVENTS.ITEM_SCRAPING_FINISHED, event);
};

export const emitCategoryScrapingFinished = (url: string, urlIndex: number, products: ProductData[], success: boolean, error?: string): void => {
    const event: CategoryScrapingFinishedEvent = {
        url,
        urlIndex,
        totalProducts: products?.length || 0,
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
    let isConnected = false;

    /**
     * Setup event handlers for database operations
     */
    const setupEventHandlers = ({ handleCategoryScrapingFinished, handleItemScrapingFinished, handleAllScrapingFinished }: ConnectorEvents): void => {
        if (handleCategoryScrapingFinished) {
            // Handle when a category (main URL) is finished (all items/subcategories done)
            globalEventEmitter.on(CONNECTOR_EVENTS.CATEGORY_SCRAPING_FINISHED, handleCategoryScrapingFinished.bind(globalEventEmitter));
        }

        if (handleItemScrapingFinished) {
            // Handle when individual items/subcategories are scraped (for real-time processing)
            globalEventEmitter.on(CONNECTOR_EVENTS.ITEM_SCRAPING_FINISHED, handleItemScrapingFinished.bind(globalEventEmitter));
        }

        globalEventEmitter.on(CONNECTOR_EVENTS.ALL_SCRAPING_FINISHED, handleAllScrapingFinished.bind(globalEventEmitter));
    };

    // Setup handlers
    setupEventHandlers(events);

    return {
        /**
         * Connect to the database (placeholder for actual database connection)
         */
        async connect(): Promise<void> {
            try {
                console.log('🔗 Connecting to database...');

                // TODO: Implement actual database connection logic here
                // Example: await database.connect()

                isConnected = true;
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

                // TODO: Implement actual database disconnection logic here
                // Example: await database.disconnect()

                isConnected = false;
                console.log('✅ Database disconnected successfully');
            } catch (error) {
                console.error('❌ Failed to disconnect from database:', error);
                throw error;
            }
        },

        /**
         * Handle when a category starts being scraped
         */
        emitCategoryScrapingStarted(url: string, urlIndex: number, category: string): void {
            emitCategoryScrapingStarted(url, urlIndex, category);
        },

        /**
         * Handle when a category (main URL) scraping is finished (all items/subcategories done)
         */
        emitCategoryScrapingFinished(url: string, urlIndex: number, products: ProductData[], success: boolean, error?: string): void {
            emitCategoryScrapingFinished(url, urlIndex, products, success, error);
        },

        /**
         * Handle when an individual item/subcategory is scraped (for real-time processing)
         */
        emitItemScrapingFinished(url: string, urlIndex: number, category: string, products: ProductData[]): void {
            emitItemScrapingFinished(url, urlIndex, category, products);
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
            return isConnected;
        }
    };
};

/**
 * Convenience exports for easy access to global emit functions
 */
export const connector = {
    emitCategoryScrapingStarted,
    emitItemScrapingFinished,
    emitCategoryScrapingFinished,
    emitAllScrapingFinished
};

