import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const { scrollAndExtractReviews, extractReviewData } = await import('../review-extractor.js');

/**
 * Tests for Review Extraction Utility
 */
describe('Review Extractor', () => {
	describe('extractReviewData', () => {
		it('should extract review data from page', async () => {
			const mockPage = {
				evaluate: jest.fn().mockResolvedValue([
					{
						author: 'John Doe',
						rating: 5,
						text: 'Great place!',
						date: '2 weeks ago',
						response: null,
					},
				]),
			};

			const reviews = await extractReviewData(mockPage);
			expect(reviews).toHaveLength(1);
			expect(reviews[0].author).toBe('John Doe');
			expect(reviews[0].rating).toBe(5);
		});

		it('should handle reviews with responses', async () => {
			const mockPage = {
				evaluate: jest.fn().mockResolvedValue([
					{
						author: 'Jane Smith',
						rating: 4,
						text: 'Good service',
						date: '1 month ago',
						response: {
							owner: 'Business Owner',
							text: 'Thank you for your feedback!',
							date: '1 month ago',
						},
					},
				]),
			};

			const reviews = await extractReviewData(mockPage);
			expect(reviews[0].response).toBeDefined();
			expect(reviews[0].response.owner).toBe('Business Owner');
		});

		it('should return empty array when no reviews found', async () => {
			const mockPage = {
				evaluate: jest.fn().mockResolvedValue([]),
			};

			const reviews = await extractReviewData(mockPage);
			expect(reviews).toEqual([]);
		});
	});

	describe('scrollAndExtractReviews', () => {
		it('should scroll and extract all reviews', async () => {
			let scrollCount = 0;
			const mockPage = {
				evaluate: jest.fn((fn) => {
					if (fn.toString().includes('scrollBy')) {
						scrollCount++;
						return Promise.resolve();
					}
					// Return reviews
					return Promise.resolve([
						{ author: 'Reviewer 1', rating: 5, text: 'Review 1', date: '1 week ago' },
						{ author: 'Reviewer 2', rating: 4, text: 'Review 2', date: '2 weeks ago' },
					]);
				}),
				waitForTimeout: jest.fn().mockResolvedValue(undefined),
				$$eval: jest.fn().mockResolvedValue([]),
			};

			const reviews = await scrollAndExtractReviews(mockPage, { maxReviews: 10 });
			expect(reviews.length).toBeGreaterThan(0);
		});

		it('should stop scrolling when maxReviews is reached', async () => {
			const mockPage = {
				evaluate: jest.fn((fn) => {
					const fnStr = fn.toString();
					if (fnStr.includes('scrollBy')) {
						return Promise.resolve();
					}
					return Promise.resolve([
						{ author: 'Reviewer', rating: 5, text: 'Review', date: '1 week ago' },
					]);
				}),
				waitForTimeout: jest.fn().mockResolvedValue(undefined),
				$$eval: jest.fn().mockResolvedValue([]),
			};

			const reviews = await scrollAndExtractReviews(mockPage, { maxReviews: 5 });
			expect(reviews.length).toBeLessThanOrEqual(5);
		});

		it('should expand "More" buttons in reviews', async () => {
			const mockClick = jest.fn().mockResolvedValue(undefined);
			const mockPage = {
				evaluate: jest.fn().mockResolvedValue([]),
				waitForTimeout: jest.fn().mockResolvedValue(undefined),
				$$: jest.fn().mockResolvedValue([
					{ click: mockClick },
				]),
			};

			await scrollAndExtractReviews(mockPage, { maxReviews: 10 });
			expect(mockClick).toHaveBeenCalled();
		});
	});
});

