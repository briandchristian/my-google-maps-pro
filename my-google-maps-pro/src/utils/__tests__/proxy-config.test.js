import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Actor before importing the module
const mockCreateProxyConfiguration = jest.fn(async (config) => ({
	...config,
	initialized: true,
}));

jest.unstable_mockModule('apify', () => ({
	Actor: {
		createProxyConfiguration: mockCreateProxyConfiguration,
	},
}));

/**
 * Tests for Proxy Configuration Utility
 * 
 * These tests verify that proxy configuration is correctly set up
 * for Apify residential proxy rotation.
 */
// Import after mocking
const { createProxyConfiguration } = await import('../proxy-config.js');

describe('Proxy Configuration', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('createProxyConfiguration', () => {
		it('should create proxy configuration with Apify proxy enabled by default', async () => {
			const config = await createProxyConfiguration({});
			expect(mockCreateProxyConfiguration).toHaveBeenCalledWith({
				groups: ['RESIDENTIAL'],
			});
			expect(config).toBeDefined();
		});

		it('should use residential proxy group when specified', async () => {
			const config = await createProxyConfiguration({
				useApifyProxy: true,
				apifyProxyGroups: ['RESIDENTIAL'],
			});
			expect(mockCreateProxyConfiguration).toHaveBeenCalledWith({
				groups: ['RESIDENTIAL'],
			});
			expect(config).toBeDefined();
		});

		it('should allow country-specific proxy selection', async () => {
			const config = await createProxyConfiguration({
				useApifyProxy: true,
				apifyProxyGroups: ['RESIDENTIAL'],
				apifyProxyCountry: 'US',
			});
			expect(mockCreateProxyConfiguration).toHaveBeenCalledWith({
				groups: ['RESIDENTIAL'],
				countryCode: 'US',
			});
			expect(config).toBeDefined();
		});

		it('should handle proxy configuration without Apify proxy (for local testing)', async () => {
			const config = await createProxyConfiguration({
				useApifyProxy: false,
			});
			expect(mockCreateProxyConfiguration).not.toHaveBeenCalled();
			expect(config).toBeUndefined();
		});

		it('should throw error for invalid country codes', async () => {
			await expect(
				createProxyConfiguration({
					useApifyProxy: true,
					apifyProxyCountry: 'INVALID',
				})
			).rejects.toThrow('Invalid country code');
		});

		it('should accept valid ISO country codes', async () => {
			const validCodes = ['US', 'GB', 'DE', 'FR', 'CA'];
			for (const code of validCodes) {
				await createProxyConfiguration({
					useApifyProxy: true,
					apifyProxyCountry: code,
				});
				expect(mockCreateProxyConfiguration).toHaveBeenCalledWith(
					expect.objectContaining({
						countryCode: code,
					})
				);
			}
		});
	});
});

