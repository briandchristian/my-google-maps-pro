/**
 * Review Scrolling & Extraction Utility
 * 
 * Provides functionality to scroll through and extract reviews from Google Maps place pages.
 * Handles infinite scrolling, review pagination, and extracts comprehensive review data.
 * 
 * Features:
 * - Automatic review scrolling until all reviews are loaded
 * - Extraction of review text, ratings, authors, dates
 * - Support for "More" button expansion
 * - Pagination handling
 */

/**
 * Extracts review data from the current page
 * 
 * @param {Object} page - Playwright page object
 * @returns {Promise<Array>} Array of review objects
 */
export async function extractReviewData(page) {
	return page.evaluate(() => {
		const reviews = [];
		const reviewElements = document.querySelectorAll('[data-review-id]');

		reviewElements.forEach((element) => {
			try {
				const authorElement = element.querySelector('[class*="d4r55"]');
				const ratingElement = element.querySelector('[role="img"][aria-label*="star"]');
				const textElement = element.querySelector('[class*="MyEned"]');
				const dateElement = element.querySelector('[class*="rsqaWe"]');
				const responseElement = element.querySelector('[class*="CDe7pd"]');

				let rating = null;
				if (ratingElement) {
					const ariaLabel = ratingElement.getAttribute('aria-label');
					const match = ariaLabel?.match(/(\d+)/);
					if (match) {
						rating = parseInt(match[1], 10);
					}
				}

				const review = {
					author: authorElement?.textContent?.trim() || null,
					rating,
					text: textElement?.textContent?.trim() || null,
					date: dateElement?.textContent?.trim() || null,
					response: null,
				};

				if (responseElement) {
					const responseOwner = responseElement.querySelector('[class*="d4r55"]');
					const responseText = responseElement.querySelector('[class*="wiI7pd"]');
					const responseDate = responseElement.querySelector('[class*="rsqaWe"]');

					review.response = {
						owner: responseOwner?.textContent?.trim() || null,
						text: responseText?.textContent?.trim() || null,
						date: responseDate?.textContent?.trim() || null,
					};
				}

				if (review.author || review.text) {
					reviews.push(review);
				}
			} catch (error) {
				console.error('Error extracting review:', error);
			}
		});

		return reviews;
	});
}

/**
 * Scrolls through reviews and extracts all review data
 * 
 * @param {Object} page - Playwright page object
 * @param {Object} options - Extraction options
 * @param {number} [options.maxReviews=100] - Maximum number of reviews to extract
 * @param {number} [options.scrollDelay=1000] - Delay between scrolls in milliseconds
 * @returns {Promise<Array>} Array of all extracted reviews
 */
export async function scrollAndExtractReviews(page, options = {}) {
	const { maxReviews = 100, scrollDelay = 1000 } = options;
	const allReviews = [];
	let previousReviewCount = 0;
	let noNewReviewsCount = 0;
	const maxNoNewReviews = 3;

	// Expand "More" buttons to get full review text
	try {
		const moreButtons = await page.$$('button:has-text("More")');
		for (const button of moreButtons) {
			try {
				await button.click();
				await page.waitForTimeout(500);
			} catch (error) {
				// Button might not be clickable, continue
			}
		}
	} catch (error) {
		// No "More" buttons found, continue
	}

	while (allReviews.length < maxReviews && noNewReviewsCount < maxNoNewReviews) {
		// Extract current reviews
		const currentReviews = await extractReviewData(page);

		// Add new reviews (deduplicate by author + text)
		const existingReviewKeys = new Set(
			allReviews.map((r) => `${r.author || ''}-${r.text?.substring(0, 50) || ''}`)
		);

		const newReviews = currentReviews.filter(
			(r) => !existingReviewKeys.has(`${r.author || ''}-${r.text?.substring(0, 50) || ''}`)
		);

		allReviews.push(...newReviews);

		// Check if we got new reviews
		if (currentReviews.length === previousReviewCount) {
			noNewReviewsCount++;
		} else {
			noNewReviewsCount = 0;
		}

		previousReviewCount = currentReviews.length;

		// Scroll down in the reviews panel
		await page.evaluate(() => {
			const reviewsPanel = document.querySelector('[role="main"]');
			if (reviewsPanel) {
				reviewsPanel.scrollBy(0, 1000);
			} else {
				window.scrollBy(0, 1000);
			}
		});

		await page.waitForTimeout(scrollDelay);

		// Check if we've reached the end (no more scrollable content)
		const canScroll = await page.evaluate(() => {
			const reviewsPanel = document.querySelector('[role="main"]');
			if (reviewsPanel) {
				return (
					reviewsPanel.scrollHeight >
					reviewsPanel.scrollTop + reviewsPanel.clientHeight + 100
				);
			}
			return window.innerHeight + window.scrollY < document.body.scrollHeight - 100;
		});

		if (!canScroll && noNewReviewsCount >= maxNoNewReviews) {
			break;
		}
	}

	return allReviews.slice(0, maxReviews);
}

