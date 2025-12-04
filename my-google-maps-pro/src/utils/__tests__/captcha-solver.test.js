import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Apify Actor
const mockRunActor = jest.fn();
const mockOpenDataset = jest.fn();
const mockGetData = jest.fn();

jest.unstable_mockModule('apify', () => ({
	Actor: {
		call: mockRunActor,
		openDataset: mockOpenDataset,
	},
}));

const { solveCaptcha, detectCaptcha } = await import('../captcha-solver.js');

/**
 * Tests for CAPTCHA Solving Integration
 * 
 * These tests verify CAPTCHA detection and solving functionality.
 */
describe('CAPTCHA Solver', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('detectCaptcha', () => {
		it('should detect reCAPTCHA v2 on page', async () => {
			const mockPage = {
				$: jest.fn().mockResolvedValue({}),
				evaluate: jest.fn().mockResolvedValue(true),
			};

			const hasCaptcha = await detectCaptcha(mockPage);
			expect(hasCaptcha).toBe(true);
		});

		it('should return false when no CAPTCHA is present', async () => {
			const mockPage = {
				$: jest.fn().mockResolvedValue(null),
				evaluate: jest.fn().mockResolvedValue(false),
			};

			const hasCaptcha = await detectCaptcha(mockPage);
			expect(hasCaptcha).toBe(false);
		});

		it('should detect reCAPTCHA v3 on page', async () => {
			const mockPage = {
				$: jest.fn().mockResolvedValue(null),
				evaluate: jest.fn().mockResolvedValue(true),
			};

			const hasCaptcha = await detectCaptcha(mockPage);
			expect(hasCaptcha).toBe(true);
		});
	});

	describe('solveCaptcha', () => {
		it('should solve reCAPTCHA v2 using Anti-Captcha Actor', async () => {
			mockRunActor.mockResolvedValue({
				defaultDatasetId: 'dataset-id',
			});
			mockOpenDataset.mockResolvedValue({
				getData: mockGetData,
			});
			mockGetData.mockResolvedValue({
				items: [
					{
						solution: {
							gRecaptchaResponse: 'test-response-token',
						},
					},
				],
			});

			const mockPage = {
				url: jest.fn().mockReturnValue('https://www.google.com/maps'),
				evaluate: jest.fn().mockResolvedValue(null),
			};

			const result = await solveCaptcha(mockPage, {
				antiCaptchaApiKey: 'test-api-key',
			});

			expect(mockRunActor).toHaveBeenCalled();
			expect(result).toBeDefined();
			expect(result.token).toBe('test-response-token');
		}, 10000);

		it('should throw error when API key is missing', async () => {
			const mockPage = {
				url: jest.fn().mockReturnValue('https://www.google.com/maps'),
			};

			await expect(
				solveCaptcha(mockPage, {})
			).rejects.toThrow('Anti-Captcha API key is required');
		});

		it('should retry on CAPTCHA solving failure', async () => {
			mockRunActor
				.mockRejectedValueOnce(new Error('CAPTCHA solving failed'))
				.mockResolvedValueOnce({
					defaultDatasetId: 'dataset-id',
				});
			mockOpenDataset.mockResolvedValue({
				getData: mockGetData,
			});
			mockGetData.mockResolvedValue({
				items: [
					{
						solution: {
							gRecaptchaResponse: 'test-response-token',
						},
					},
				],
			});

			const mockPage = {
				url: jest.fn().mockReturnValue('https://www.google.com/maps'),
				evaluate: jest.fn().mockResolvedValue(null),
			};

			const result = await solveCaptcha(mockPage, {
				antiCaptchaApiKey: 'test-api-key',
				maxRetries: 2,
			});

			expect(mockRunActor).toHaveBeenCalledTimes(2);
			expect(result.token).toBe('test-response-token');
		}, 10000);

		it('should throw error after max retries exceeded', async () => {
			mockRunActor.mockRejectedValue(new Error('CAPTCHA solving failed'));

			const mockPage = {
				url: jest.fn().mockReturnValue('https://www.google.com/maps'),
				evaluate: jest.fn().mockResolvedValue(null),
			};

			await expect(
				solveCaptcha(mockPage, {
					antiCaptchaApiKey: 'test-api-key',
					maxRetries: 2,
				})
			).rejects.toThrow('Failed to solve CAPTCHA after');
		});
	});
});

