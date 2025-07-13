import fs from 'fs/promises';
import { ProductData } from './types.js';

/**
 * Exports product data to JSON file
 */
export async function exportToJSON(
    data: { category: string; products: ProductData[] }[],
    filename: string = 'scraped-products'
): Promise<string> {
    try {
        // Ensure data directory exists
        await fs.mkdir('data', { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = `data/${filename}_${timestamp}.json`;

        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(filePath, jsonData);

        console.log(`💾 Data exported to: ${filePath}`);
        return filePath;
    } catch (error) {
        console.error('❌ Failed to export JSON:', error);
        throw error;
    }
}

/**
 * Exports product data to CSV file (flattened)
 */
export async function exportToCSV(
    data: { category: string; products: ProductData[] }[],
    filename: string = 'scraped-products'
): Promise<string> {
    try {
        // Ensure data directory exists
        await fs.mkdir('data', { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = `data/${filename}_${timestamp}.csv`;

        // Flatten data for CSV
        const flatData: (ProductData & { category: string })[] = [];
        data.forEach(categoryData => {
            categoryData.products.forEach(product => {
                flatData.push({
                    category: categoryData.category,
                    ...product
                });
            });
        });

        if (flatData.length === 0) {
            throw new Error('No data to export');
        }

        // Create CSV content
        const headers = ['category', 'name', 'description', 'price', 'pricePerKilo', 'brand', 'link', 'image'];
        const csvContent = [
            headers.join(','),
            ...flatData.map(row =>
                headers.map(header => {
                    const value = row[header as keyof typeof row] || '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n');

        await fs.writeFile(filePath, csvContent);

        console.log(`💾 Data exported to: ${filePath}`);
        return filePath;
    } catch (error) {
        console.error('❌ Failed to export CSV:', error);
        throw error;
    }
}
