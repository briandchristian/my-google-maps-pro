/**
 * Photo Download Utility
 * 
 * Downloads photos from Google Maps place pages.
 * Extracts photo URLs and saves them to Apify key-value store.
 * 
 * Features:
 * - Extract photo URLs from place pages
 * - Download and store photos
 * - Support for multiple photo formats
 */

import { Actor } from 'apify';

/**
 * Extracts photo URLs from a Google Maps place page
 * 
 * @param {Object} page - Playwright page object
 * @returns {Promise<Array>} Array of photo URL objects
 */
export async function extractPhotoUrls(page) {
	return page.evaluate(() => {
		const photos = [];
		const photoElements = document.querySelectorAll('img[src*="googleusercontent"], img[data-src*="googleusercontent"]');

		photoElements.forEach((img) => {
			const src = img.getAttribute('src') || img.getAttribute('data-src');
			if (src && src.includes('googleusercontent')) {
				// Try to get high-resolution version
				const highResSrc = src.replace(/=w\d+-h\d+/, '=w2048-h2048');
				photos.push({
					url: highResSrc,
					thumbnail: src,
					alt: img.getAttribute('alt') || '',
				});
			}
		});

		return [...new Map(photos.map((p) => [p.url, p])).values()]; // Deduplicate
	});
}

/**
 * Downloads photos from URLs and stores them in key-value store
 * 
 * @param {Array} photoUrls - Array of photo URL objects
 * @param {string} placeId - Unique identifier for the place
 * @returns {Promise<Array>} Array of stored photo keys
 */
export async function downloadPhotos(photoUrls, placeId) {
	const storedPhotos = [];

	for (let i = 0; i < photoUrls.length; i++) {
		const photo = photoUrls[i];
		try {
			const response = await fetch(photo.url);
			if (response.ok) {
				const buffer = await response.arrayBuffer();
				const key = `photo-${placeId}-${i}`;
				await Actor.setValue(key, Buffer.from(buffer), {
					contentType: 'image/jpeg',
				});
				storedPhotos.push({
					key,
					url: photo.url,
					thumbnail: photo.thumbnail,
					alt: photo.alt,
				});
			}
		} catch (error) {
			console.error(`Failed to download photo ${i}:`, error);
		}
	}

	return storedPhotos;
}

