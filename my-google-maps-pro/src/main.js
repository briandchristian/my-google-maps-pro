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

let input = await Actor.getInput();

console.log('🔍 Input received:', JSON.stringify(input, null, 2));

// Provide demo defaults if no input provided (useful for console testing)
if (!input || !input.searches || input.searches.length === 0) {
	console.log('⚠️  No input provided. Using demo configuration...');
	console.log('⚠️  WARNING: Google Maps scraping requires Apify proxies (paid plan)');
	console.log('⚠️  Free tier may experience timeouts or blocks from Google');
	
	input = {
		searches: [
			{
				query: 'coffee shops',
				location: 'San Francisco, CA',
			},
		],
		maxPlaces: 5, // Keep it small for quick demo
		includeReviews: false, // Disable to save time
		maxReviews: 0,
		downloadPhotos: false,
		extractContactInfo: false,
		proxyConfiguration: {
			useApifyProxy: true, // Required for Google Maps
			apifyProxyGroups: ['RESIDENTIAL'], // Residential proxies recommended
		},
		maxConcurrency: 1, // Safe for 1GB memory
		navigationTimeoutSecs: 120,
		requestHandlerTimeoutSecs: 300,
	};
	console.log('✅ Demo: Searching for coffee shops in San Francisco (5 places)');
}

// Validate proxy configuration
if (!input.proxyConfiguration?.useApifyProxy) {
	console.log('⚠️  WARNING: No proxy configured!');
	console.log('⚠️  Google Maps blocks datacenter IPs. You may experience:');
	console.log('   - net::ERR_TIMED_OUT errors');
	console.log('   - CAPTCHA challenges');
	console.log('   - Zero results');
	console.log('💡 Recommendation: Enable Apify residential proxies in input configuration');
}

console.log(`📊 Configuration: ${input.searches.length} searches, max ${input.maxPlaces} places each, concurrency: ${input.maxConcurrency || 1}`);

// Create proxy configuration
const proxyConfiguration = await createProxyConfiguration(
	input.proxyConfiguration || {}
);

const crawler = new PlaywrightCrawler({
	// Limit concurrency for memory constraints (1GB = max 2 browsers)
	maxConcurrency: Math.min(input.maxConcurrency || 2, 2),
	requestHandlerTimeoutSecs: input.requestHandlerTimeoutSecs || 300,
	navigationTimeoutSecs: input.navigationTimeoutSecs || 120,
	proxyConfiguration,
	launchContext: {
		// Optimize Chrome for low memory environments
		launchOptions: {
			args: [
				'--disable-dev-shm-usage', // Overcome limited resource problems
				'--disable-gpu', // Disable GPU hardware acceleration
				'--no-sandbox', // Required for Docker
				'--disable-setuid-sandbox',
			],
		},
	},
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
			let scrollAttempts = 0;
			const maxScrollAttempts = 20;
			
			while (places.length < (input?.maxPlaces || 100) && scrollAttempts < maxScrollAttempts) {
				const newPlaces = await page.$$eval(
					'a[href*="maps/place"]',
					(els) =>
						els.map((el) => {
							// Try multiple selectors for title
							const title = 
								el.querySelector('div.fontHeadlineSmall')?.innerText ||
								el.querySelector('div.qBF1Pd')?.innerText ||
								el.querySelector('span.OSrXXb')?.innerText ||
								el.querySelector('div[role="heading"]')?.innerText ||
								el.textContent?.trim()?.split('\n')[0] ||
								'Unknown Place';
							
							return {
								title: title.trim(),
								url: el.getAttribute('href'),
							};
						}).filter(place => place.url && place.url.includes('/maps/place/'))
				);
				
				// Merge new places with existing, avoiding duplicates by URL
				const existingUrls = new Set(places.map(p => p.url));
				const uniqueNewPlaces = newPlaces.filter(p => !existingUrls.has(p.url));
				places = [...places, ...uniqueNewPlaces];
				
				console.log(`Found ${places.length} places so far...`);
				
				// Scroll the results panel
				await page.evaluate(() => {
					const resultsPanel = document.querySelector('div[role="feed"]') || 
										document.querySelector('div[aria-label*="Results"]');
					if (resultsPanel) {
						resultsPanel.scrollBy(0, 1000);
					}
				});
				await page.waitForTimeout(1500);
				scrollAttempts++;
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
			console.log(`Scraping: ${request.userData.placeTitle || request.url}`);
			
			// Check for CAPTCHA
			if (await detectCaptcha(page)) {
				if (input.captchaConfiguration?.antiCaptchaApiKey) {
					await solveCaptcha(page, input.captchaConfiguration);
				}
			}

			// Wait for place info to load - try to wait for specific elements
			try {
				await page.waitForSelector('h1', { timeout: 10000 });
			} catch (e) {
				console.log('Warning: Title element not found immediately, continuing...');
			}
			await page.waitForTimeout(2000);

			// Extract basic place data using updated selectors
			const basicData = await page.evaluate(() => {
				const gpsMatch = window.location.href.match(/!8m2!3d([-\d.]+)!4d([-\d.]+)/);
				
				// Helper function to get text content safely
				const getText = (selectors) => {
					for (const selector of selectors) {
						const element = document.querySelector(selector);
						if (element?.textContent?.trim()) {
							return element.textContent.trim();
						}
					}
					return null;
				};

				// Helper to get attribute safely
				const getAttr = (selectors, attr) => {
					for (const selector of selectors) {
						const element = document.querySelector(selector);
						const value = element?.getAttribute(attr);
						if (value) return value;
					}
					return null;
				};

				// Extract title - try multiple selectors
				const title = getText([
					'h1.DUwDvf.lfPIob', // Current main selector
					'h1[class*="fontHeadlineLarge"]',
					'h1',
					'div[role="main"] h1',
					'[data-section-id="oh"] h2' // Fallback
				]);

				// Extract address - try multiple approaches
				const address = getText([
					'button[data-item-id="address"] div.fontBodyMedium',
					'button[data-item-id="address"] div',
					'[data-tooltip="Copy address"]',
					'button[aria-label*="Address"] div',
					'div.rogA2c div.Io6YTe' // Old selector as fallback
				]);

				// Extract phone - try multiple approaches
				const phone = getText([
					'button[data-item-id*="phone"] div.fontBodyMedium',
					'button[data-item-id*="phone"] div',
					'button[aria-label*="Phone"] div',
					'a[href^="tel:"]',
					'button[data-tooltip="Copy phone number"]'
				]);

				// Extract website
				const website = getAttr([
					'a[data-item-id="authority"]',
					'a[aria-label*="Website"]',
					'a[data-tooltip*="website"]',
					'button[data-item-id*="authority"] + a'
				], 'href');

				// Extract rating - try multiple approaches
				let rating = null;
				const ratingElement = document.querySelector('div.F7nice span[role="img"]') || 
									  document.querySelector('span[role="img"][aria-label*="star"]') ||
									  document.querySelector('div.fontDisplayLarge');
				
				if (ratingElement) {
					const ariaLabel = ratingElement.getAttribute('aria-label');
					const textContent = ratingElement.textContent;
					const match = (ariaLabel || textContent || '').match(/(\d+\.?\d*)/);
					rating = match ? match[1] : null;
				}

				// Get review count
				const reviewCount = getText([
					'div.F7nice span[aria-label*="reviews"]',
					'button[aria-label*="reviews"] span',
					'span[aria-label*="reviews"]'
				]);

				return {
					title,
					address,
					phone,
					website,
					rating,
					reviewCount,
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

			// Log what we extracted
			console.log(`✅ Extracted: ${basicData.title || 'Unknown'} - ${basicData.address || 'No address'} - Rating: ${basicData.rating || 'N/A'}`);

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
