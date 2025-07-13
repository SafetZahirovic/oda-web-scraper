import { describe, it, expect } from 'vitest';
import {
    normalizeUrl,
    filterExcludedLinks,
    createSafeFilename,
    isValidSubcategoryLink
} from '../utils.js';
import { SubcategoryLink } from '../types';

describe('normalizeUrl', () => {
    it('should return absolute URL as-is', () => {
        const url = 'https://example.com/path';
        expect(normalizeUrl(url)).toBe(url);
    });

    it('should prepend base URL to relative URL', () => {
        const relativeUrl = '/path/to/page';
        const expected = 'https://oda.com/path/to/page';
        expect(normalizeUrl(relativeUrl)).toBe(expected);
    });

    it('should use custom base URL', () => {
        const relativeUrl = '/path';
        const baseUrl = 'https://custom.com';
        const expected = 'https://custom.com/path';
        expect(normalizeUrl(relativeUrl, baseUrl)).toBe(expected);
    });
});

describe('filterExcludedLinks', () => {
    const mockLinks: SubcategoryLink[] = [
        { text: 'Fruits', href: '/fruits' },
        { text: 'Vegetables', href: '/vegetables' },
        { text: 'Alle produkter', href: '/all' },
        { text: 'Berries', href: '/berries' }
    ];

    it('should filter out links containing "Alle" by default', () => {
        const result = filterExcludedLinks(mockLinks);
        expect(result).toHaveLength(3);
        expect(result.map(link => link.text)).toEqual(['Fruits', 'Vegetables', 'Berries']);
    });

    it('should filter out links containing custom excluded texts', () => {
        const result = filterExcludedLinks(mockLinks, ['Vegetables', 'Berries']);
        expect(result).toHaveLength(2);
        expect(result.map(link => link.text)).toEqual(['Fruits', 'Alle produkter']);
    });

    it('should return all links when no exclusions match', () => {
        const result = filterExcludedLinks(mockLinks, ['NonExistent']);
        expect(result).toHaveLength(4);
    });

    it('should handle empty links array', () => {
        const result = filterExcludedLinks([]);
        expect(result).toEqual([]);
    });
});

describe('createSafeFilename', () => {
    it('should replace non-alphanumeric characters with underscore', () => {
        expect(createSafeFilename('Hello World!')).toBe('Hello_World_');
        expect(createSafeFilename('Test-123')).toBe('Test_123');
        expect(createSafeFilename('Special@#$%')).toBe('Special____');
    });

    it('should preserve alphanumeric characters', () => {
        expect(createSafeFilename('ABC123')).toBe('ABC123');
    });

    it('should handle empty string', () => {
        expect(createSafeFilename('')).toBe('');
    });
});

describe('isValidSubcategoryLink', () => {
    it('should return true for valid text and href', () => {
        expect(isValidSubcategoryLink('Valid Text', '/valid/href')).toBe(true);
    });

    it('should return false for null text', () => {
        expect(isValidSubcategoryLink(null, '/valid/href')).toBe(false);
    });

    it('should return false for null href', () => {
        expect(isValidSubcategoryLink('Valid Text', null)).toBe(false);
    });

    it('should return false for empty text', () => {
        expect(isValidSubcategoryLink('', '/valid/href')).toBe(false);
        expect(isValidSubcategoryLink('   ', '/valid/href')).toBe(false);
    });

    it('should return false for empty href', () => {
        expect(isValidSubcategoryLink('Valid Text', '')).toBe(false);
        expect(isValidSubcategoryLink('Valid Text', '   ')).toBe(false);
    });

    it('should return false when both are null', () => {
        expect(isValidSubcategoryLink(null, null)).toBe(false);
    });
});
