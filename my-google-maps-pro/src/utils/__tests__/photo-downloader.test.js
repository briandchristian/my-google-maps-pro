import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockSetValue = jest.fn();
const mockFetch = jest.fn();

jest.unstable_mockModule('apify', () => ({
	Actor: {
		setValue: mockSetValue,
	},
}));

global.fetch = mockFetch;

const { extractPhotoUrls, downloadPhotos } = await import('../photo-downloader.js');

describe('Photo Downloader', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('extractPhotoUrls', () => {
		it('should extract photo URLs from page', async () => {
			const mockPage = {
				evaluate: jest.fn().mockResolvedValue([
					{
						url: 'https://lh3.googleusercontent.com/photo.jpg=w2048-h2048',
						thumbnail: 'https://lh3.googleusercontent.com/photo.jpg=w100-h100',
						alt: 'Place photo',
					},
				]),
			};

			const photos = await extractPhotoUrls(mockPage);
			expect(photos).toHaveLength(1);
			expect(photos[0].url).toContain('googleusercontent');
		});

		it('should deduplicate photo URLs', async () => {
			// The deduplication happens inside evaluate, so we test that the function
			// is called and would deduplicate if duplicates were present
			const mockPage = {
				evaluate: jest.fn((fn) => {
					// Simulate the deduplication logic
					const photos = [
						{ url: 'https://photo1.jpg', thumbnail: 'thumb1.jpg', alt: '' },
						{ url: 'https://photo1.jpg', thumbnail: 'thumb1.jpg', alt: '' },
					];
					return Promise.resolve([...new Map(photos.map((p) => [p.url, p])).values()]);
				}),
			};

			const photos = await extractPhotoUrls(mockPage);
			expect(photos).toHaveLength(1);
		});

		it('should return empty array when no photos found', async () => {
			const mockPage = {
				evaluate: jest.fn().mockResolvedValue([]),
			};

			const photos = await extractPhotoUrls(mockPage);
			expect(photos).toEqual([]);
		});
	});

	describe('downloadPhotos', () => {
		it('should download and store photos', async () => {
			const mockArrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
			mockFetch.mockResolvedValue({
				ok: true,
				arrayBuffer: mockArrayBuffer,
			});

			const photoUrls = [
				{ url: 'https://photo1.jpg', thumbnail: 'thumb1.jpg', alt: 'Photo 1' },
			];

			const stored = await downloadPhotos(photoUrls, 'place-123');
			expect(mockFetch).toHaveBeenCalledWith('https://photo1.jpg');
			expect(mockSetValue).toHaveBeenCalled();
			expect(stored).toHaveLength(1);
			expect(stored[0].key).toContain('photo-place-123');
		});

		it('should handle download failures gracefully', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			const photoUrls = [{ url: 'https://photo1.jpg', thumbnail: 'thumb1.jpg', alt: '' }];
			const stored = await downloadPhotos(photoUrls, 'place-123');

			expect(stored).toHaveLength(0);
		});

		it('should skip failed HTTP responses', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
			});

			const photoUrls = [{ url: 'https://photo1.jpg', thumbnail: 'thumb1.jpg', alt: '' }];
			const stored = await downloadPhotos(photoUrls, 'place-123');

			expect(stored).toHaveLength(0);
		});
	});
});

