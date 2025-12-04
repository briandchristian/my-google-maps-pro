/**
 * Google Maps Pro Scraper
 * 
 * Advanced Google Maps scraper with the following features:
 * - Proxy rotation using Apify residential proxies
 * - CAPTCHA solving integration
 * - Review scrolling & extraction
 * - Photo downloads
 * - Email/social media extraction from linked websites
 */

import { Actor } from 'apify';
import { PlaywrightCrawler, Dataset } from 'crawlee';
import { createProxyConfiguration } from './utils/proxy-config.js';
import { detectCaptcha, solveCaptcha } from './utils/captcha-solver.js';
import { scrollAndExtractReviews } from './utils/review-extractor.js';
import { extractPhotoUrls, downloadPhotos } from './utils/photo-downloader.js';
import { extractContactInfo } from './utils/contact-extractor.js';

await Actor.init();

const input = await Actor.getInput();

// Create proxy configuration
const proxyConfiguration = await createProxyConfiguration(
	input.proxyConfiguration || {}
);

const crawler = new PlaywrightCrawler({
	maxConcurrency: input.maxConcurrency || 5,
	requestHandlerTimeoutSecs: input.requestHandlerTimeoutSecs || 300,
	navigationTimeoutSecs: input.navigationTimeoutSecs || 120,
	proxyConfiguration,
	preNavigationHooks: [
		async ({ page }) => {
			// Randomize viewport to avoid detection
			await page.setViewportSize({
				width: 1920 + Math.floor(Math.random() * 100),
				height: 1080,
			});
		},
	],
	async requestHandler({ page, request, crawler }) {
		// Handle search page
		if (request.userData.label === 'SEARCH') {
			await page.goto('https://www.google.com/maps');

			// Check for CAPTCHA
			if (await detectCaptcha(page)) {
				if (input.captchaConfiguration?.antiCaptchaApiKey) {
					await solveCaptcha(page, input.captchaConfiguration);
				} else {
					throw new Error('CAPTCHA detected but no API key provided');
				}
			}

			// Type search query
			await page.type('input#searchboxinput', request.userData.query);
			await page.keyboard.press('Enter');
			await page.waitForTimeout(5000 + Math.random() * 3000);

			// Scroll results panel until enough places
			let places = [];
			while (places.length < (input?.maxPlaces || 100)) {
				const newPlaces = await page.$$eval(
					'a[href^="https://www.google.com/maps/place"]',
					(els) =>
						els.map((el) => ({
							title: el.querySelector('span')?.innerText,
							url: el.getAttribute('href'),
						}))
				);
				places = [...new Set([...places, ...newPlaces])];
				await page.evaluate(() => window.scrollBy(0, 2000));
				await page.waitForTimeout(2000);
			}

			// Enqueue detail pages
			for (const place of places.slice(0, input?.maxPlaces || 100)) {
				await crawler.addRequests([
					{
						url: place.url,
						userData: { label: 'DETAIL', placeTitle: place.title },
					},
				]);
			}
		} else if (request.userData.label === 'DETAIL') {
			// Handle detail page
	// Check for CAPTCHA
	if (await detectCaptcha(page)) {
		if (input.captchaConfiguration?.antiCaptchaApiKey) {
			await solveCaptcha(page, input.captchaConfiguration);
		}
	}

	// Extract basic place data
	const basicData = await page.evaluate(() => {
		const gpsMatch = window.location.href.match(/!8m2!3d([-\d.]+)!4d([-\d.]+)/);
		return {
			title: document.querySelector('h1')?.innerText,
			address: document.querySelector('[data-item-id="address"]')?.innerText,
			phone: document.querySelector('[data-item-id="phone"]')?.innerText,
			website: document.querySelector('a[data-item-id="authority"]')?.href,
			rating: document
				.querySelector('[role="img"][aria-label*="star"]')
				?.getAttribute('aria-label')
				?.match(/(\d+\.?\d*)/)?.[1],
			gps: gpsMatch
				? { lat: parseFloat(gpsMatch[1]), lng: parseFloat(gpsMatch[2]) }
				: null,
		};
	});

	const placeData = {
		...basicData,
		url: request.loadedUrl,
		scrapedAt: new Date().toISOString(),
	};

	// Extract reviews if enabled
	if (input.includeReviews) {
		try {
			const reviews = await scrollAndExtractReviews(page, {
				maxReviews: input.maxReviews || 50,
			});
			placeData.reviews = reviews;
		} catch (error) {
			console.error('Error extracting reviews:', error);
			placeData.reviews = [];
		}
	}

	// Download photos if enabled
	if (input.downloadPhotos) {
		try {
			const photoUrls = await extractPhotoUrls(page);
			const placeId = request.loadedUrl.match(/place\/([^/]+)/)?.[1] || 'unknown';
			const downloadedPhotos = await downloadPhotos(photoUrls, placeId);
			placeData.photos = downloadedPhotos;
		} catch (error) {
			console.error('Error downloading photos:', error);
			placeData.photos = [];
		}
	}

	// Extract contact info from website if enabled
	if (input.extractContactInfo && placeData.website) {
		try {
			// Navigate to website in new context to extract contact info
			const websitePage = await page.context().newPage();
			await websitePage.goto(placeData.website, { timeout: 10000 });
			const contactInfo = await extractContactInfo(websitePage);
			placeData.contactInfo = contactInfo;
			await websitePage.close();
		} catch (error) {
			console.error('Error extracting contact info:', error);
			placeData.contactInfo = null;
		}
	}

			await Dataset.pushData(placeData);
		}
	},
});

// Start crawling
await crawler.run(
	input?.searches?.map((s) => ({
		url: 'https://www.google.com/maps',
		userData: {
			label: 'SEARCH',
			query: s.query + (s.location ? ` ${s.location}` : ''),
		},
	})) || []
);

await Actor.exit();
