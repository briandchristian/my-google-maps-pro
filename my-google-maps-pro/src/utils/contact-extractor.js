/**
 * Email & Social Media Extraction Utility
 * 
 * Extracts email addresses and social media links from linked websites.
 * Visits business websites and scrapes contact information.
 * 
 * Features:
 * - Email extraction using regex patterns
 * - Social media link detection (Facebook, Twitter, Instagram, LinkedIn, etc.)
 * - Phone number extraction
 * - Contact form detection
 */

/**
 * Extracts email addresses from text content
 * 
 * @param {string} text - Text content to search
 * @returns {Array<string>} Array of found email addresses
 */
export function extractEmails(text) {
	if (!text) return [];
	const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
	const emails = text.match(emailRegex) || [];
	return [...new Set(emails)]; // Deduplicate
}

/**
 * Extracts social media links from page
 * 
 * @param {Object} page - Playwright page object
 * @returns {Promise<Object>} Object containing social media links
 */
export async function extractSocialMediaLinks(page) {
	return page.evaluate(() => {
		const socialLinks = {
			facebook: null,
			twitter: null,
			instagram: null,
			linkedin: null,
			youtube: null,
			tiktok: null,
			pinterest: null,
		};

		const links = document.querySelectorAll('a[href]');
		links.forEach((link) => {
			const href = link.getAttribute('href')?.toLowerCase() || '';
			const text = link.textContent?.toLowerCase() || '';

			if (href.includes('facebook.com') || text.includes('facebook')) {
				socialLinks.facebook = link.getAttribute('href');
			} else if (href.includes('twitter.com') || href.includes('x.com') || text.includes('twitter')) {
				socialLinks.twitter = link.getAttribute('href');
			} else if (href.includes('instagram.com') || text.includes('instagram')) {
				socialLinks.instagram = link.getAttribute('href');
			} else if (href.includes('linkedin.com') || text.includes('linkedin')) {
				socialLinks.linkedin = link.getAttribute('href');
			} else if (href.includes('youtube.com') || text.includes('youtube')) {
				socialLinks.youtube = link.getAttribute('href');
			} else if (href.includes('tiktok.com') || text.includes('tiktok')) {
				socialLinks.tiktok = link.getAttribute('href');
			} else if (href.includes('pinterest.com') || text.includes('pinterest')) {
				socialLinks.pinterest = link.getAttribute('href');
			}
		});

		// Remove null values
		return Object.fromEntries(
			Object.entries(socialLinks).filter(([_, value]) => value !== null)
		);
	});
}

/**
 * Extracts contact information from a website
 * 
 * @param {Object} page - Playwright page object
 * @returns {Promise<Object>} Object containing extracted contact information
 */
export async function extractContactInfo(page) {
	const pageContent = await page.textContent('body');
	const emails = extractEmails(pageContent || '');
	const socialLinks = await extractSocialMediaLinks(page);

	// Extract phone numbers
	const phoneNumbers = await page.evaluate(() => {
		const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
		const text = document.body.textContent || '';
		const phones = text.match(phoneRegex) || [];
		return [...new Set(phones)];
	});

	return {
		emails,
		socialMedia: socialLinks,
		phoneNumbers,
	};
}

