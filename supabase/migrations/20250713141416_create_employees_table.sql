-- Supabase SQL Schema for Oda Web Scraper
-- Run this script in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table (main category URLs like "frukt-og-gront")
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    url_index INTEGER NOT NULL,
    total_subcategories INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    scraping_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scraping_completed_at TIMESTAMP WITH TIME ZONE,
    scraping_success BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subcategories table (buttons within categories like "Frukt", "Bær", "Salat og Kål")
CREATE TABLE subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    total_items INTEGER DEFAULT 0,
    scraping_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scraping_completed_at TIMESTAMP WITH TIME ZONE,
    scraping_success BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items table (individual products within subcategories)
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subcategory_id UUID NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT,
    price DECIMAL(10,2),
    original_price DECIMAL(10,2),
    image_url TEXT,
    product_url TEXT,
    description TEXT,
    in_stock BOOLEAN DEFAULT true,
    scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX idx_items_subcategory_id ON items(subcategory_id);
CREATE INDEX idx_items_category_id ON items(category_id);
CREATE INDEX idx_categories_url_index ON categories(url_index);
CREATE INDEX idx_categories_scraping_success ON categories(scraping_success);
CREATE INDEX idx_subcategories_scraping_success ON subcategories(scraping_success);

-- Unique constraints
CREATE UNIQUE INDEX idx_subcategories_category_url ON subcategories(category_id, url);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON subcategories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update category stats when subcategories change
CREATE OR REPLACE FUNCTION update_category_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_subcategories and total_items for the category
    UPDATE categories 
    SET 
        total_subcategories = (
            SELECT COUNT(*) 
            FROM subcategories 
            WHERE category_id = COALESCE(NEW.category_id, OLD.category_id)
        ),
        total_items = (
            SELECT COUNT(*) 
            FROM items 
            WHERE category_id = COALESCE(NEW.category_id, OLD.category_id)
        )
    WHERE id = COALESCE(NEW.category_id, OLD.category_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers to update category stats
CREATE TRIGGER update_category_stats_on_subcategory_change
    AFTER INSERT OR UPDATE OR DELETE ON subcategories
    FOR EACH ROW EXECUTE FUNCTION update_category_stats();

-- Function to update subcategory stats when items change
CREATE OR REPLACE FUNCTION update_subcategory_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_items for the subcategory
    UPDATE subcategories 
    SET total_items = (
        SELECT COUNT(*) 
        FROM items 
        WHERE subcategory_id = COALESCE(NEW.subcategory_id, OLD.subcategory_id)
    )
    WHERE id = COALESCE(NEW.subcategory_id, OLD.subcategory_id);
    
    -- Also update category stats
    UPDATE categories 
    SET total_items = (
        SELECT COUNT(*) 
        FROM items 
        WHERE category_id = COALESCE(NEW.category_id, OLD.category_id)
    )
    WHERE id = COALESCE(NEW.category_id, OLD.category_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger to update subcategory and category stats when items change
CREATE TRIGGER update_subcategory_stats_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON items
    FOR EACH ROW EXECUTE FUNCTION update_subcategory_stats();

-- Sample queries for testing:

-- Get all categories with their stats
-- SELECT 
--     c.*,
--     (SELECT COUNT(*) FROM subcategories WHERE category_id = c.id) as actual_subcategories,
--     (SELECT COUNT(*) FROM items WHERE category_id = c.id) as actual_items
-- FROM categories c
-- ORDER BY c.url_index;

-- Get subcategories for a specific category
-- SELECT s.*, c.name as category_name
-- FROM subcategories s
-- JOIN categories c ON s.category_id = c.id
-- WHERE c.name = 'frukt-og-gront'
-- ORDER BY s.name;

-- Get items for a specific subcategory
-- SELECT i.*, s.name as subcategory_name, c.name as category_name
-- FROM items i
-- JOIN subcategories s ON i.subcategory_id = s.id
-- JOIN categories c ON i.category_id = c.id
-- WHERE s.name = 'Frukt'
-- ORDER BY i.name;
