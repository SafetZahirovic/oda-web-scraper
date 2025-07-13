CREATE UNIQUE INDEX IF NOT EXISTS idx_items_subcategory_name_brand 
ON items(subcategory_id, name, COALESCE(brand, ''));
