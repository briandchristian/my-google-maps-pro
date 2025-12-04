/**
 * CAPTCHA Solving Integration
 * 
 * Provides CAPTCHA solving capabilities for Google Maps scraping.
 * Integrates with Apify's Anti-Captcha Recaptcha Actor or similar services
 * to automatically solve CAPTCHAs encountered during scraping.
 * 
 * Features:
 * - Automatic CAPTCHA detection
 * - Integration with Apify Anti-Captcha Actor
 * - Retry logic for failed CAPTCHA solving
 * - Support for reCAPTCHA v2 and v3
 */

import { Actor } from 'apify';

/**
 * Detects if a CAPTCHA is present on the current page
 * 
 * @param {Object} page - Playwright page object
 * @returns {Promise<boolean>} True if CAPTCHA is detected, false otherwise
 */
export async function detectCaptcha(page) {
	// Check for reCAPTCHA v2
	const recaptchaV2 = await page.$('.g-recaptcha, iframe[src*="recaptcha"]');
	if (recaptchaV2) {
		return true;
	}

	// Check for reCAPTCHA v3 (injected script)
	const hasRecaptchaV3 = await page.evaluate(() => {
		return (
			!!window.grecaptcha ||
			!!document.querySelector('script[src*="recaptcha"]') ||
			!!document.querySelector('[data-sitekey]')
		);
	});

	return hasRecaptchaV3;
}

/**
 * Solves a CAPTCHA on the current page using Apify Anti-Captcha Actor
 * 
 * @param {Object} page - Playwright page object
 * @param {Object} options - CAPTCHA solving options
 * @param {string} options.antiCaptchaApiKey - Anti-Captcha API key
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {string} [options.antiCaptchaActorId='apify/anti-captcha-recaptcha'] - Actor ID for CAPTCHA solving
 * @returns {Promise<Object>} Object containing the solution token
 * @throws {Error} If API key is missing or solving fails after max retries
 */
export async function solveCaptcha(page, options = {}) {
	const {
		antiCaptchaApiKey,
		maxRetries = 3,
		antiCaptchaActorId = 'apify/anti-captcha-recaptcha',
	} = options;

	if (!antiCaptchaApiKey) {
		throw new Error('Anti-Captcha API key is required');
	}

	const pageUrl = page.url();

	// Get site key from page
	const siteKey = await page.evaluate(() => {
		const v2Element = document.querySelector('[data-sitekey]');
		if (v2Element) {
			return v2Element.getAttribute('data-sitekey');
		}

		// Try to get from grecaptcha if available
		if (window.grecaptcha && window.grecaptcha.ready) {
			return new Promise((resolve) => {
				window.grecaptcha.ready(() => {
					const siteKey = window.grecaptcha.getResponse?.() || null;
					resolve(siteKey);
				});
			});
		}

		return null;
	});

	let lastError;
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			// Call Anti-Captcha Actor
			const run = await Actor.call(antiCaptchaActorId, {
				startUrls: [{ url: pageUrl }],
				antiCaptchaApiKey,
				...(siteKey && { siteKey }),
			});

			// Wait for actor to complete and get result
			const dataset = await Actor.openDataset(run.defaultDatasetId);
			const { items } = await dataset.getData();

			if (items && items.length > 0 && items[0].solution) {
				const token = items[0].solution.gRecaptchaResponse || items[0].solution.token;

				// Inject the solution token into the page
				if (token) {
					await page.evaluate((t) => {
						// For reCAPTCHA v2
						const textarea = document.querySelector('textarea[name="g-recaptcha-response"]');
						if (textarea) {
							textarea.value = t;
							textarea.dispatchEvent(new Event('input', { bubbles: true }));
						}

						// For reCAPTCHA v3, set the token in window
						if (window.grecaptcha && window.grecaptcha.ready) {
							window.grecaptcha.ready(() => {
								window.__recaptchaToken = t;
							});
						}
					}, token);

					return { token, success: true };
				}
			}

			throw new Error('No solution token found in actor response');
		} catch (error) {
			lastError = error;
			if (attempt < maxRetries - 1) {
				// Wait before retry
				await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
			}
		}
	}

	throw new Error(
		`Failed to solve CAPTCHA after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
	);
}

