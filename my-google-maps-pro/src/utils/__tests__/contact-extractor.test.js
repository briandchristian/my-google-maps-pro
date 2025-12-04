import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const { extractEmails, extractSocialMediaLinks, extractContactInfo } = await import('../contact-extractor.js');

describe('Contact Extractor', () => {
	describe('extractEmails', () => {
		it('should extract email addresses from text', () => {
			const text = 'Contact us at info@example.com or support@example.com';
			const emails = extractEmails(text);
			expect(emails).toContain('info@example.com');
			expect(emails).toContain('support@example.com');
		});

		it('should deduplicate email addresses', () => {
			const text = 'Email: test@example.com and also test@example.com';
			const emails = extractEmails(text);
			expect(emails).toHaveLength(1);
			expect(emails[0]).toBe('test@example.com');
		});

		it('should return empty array when no emails found', () => {
			const emails = extractEmails('No email here');
			expect(emails).toEqual([]);
		});

		it('should handle null or undefined text', () => {
			expect(extractEmails(null)).toEqual([]);
			expect(extractEmails(undefined)).toEqual([]);
		});
	});

	describe('extractSocialMediaLinks', () => {
		it('should extract Facebook link', async () => {
			const mockPage = {
				evaluate: jest.fn().mockResolvedValue({
					facebook: 'https://facebook.com/example',
				}),
			};

			const links = await extractSocialMediaLinks(mockPage);
			expect(links.facebook).toBe('https://facebook.com/example');
		});

		it('should extract multiple social media links', async () => {
			const mockPage = {
				evaluate: jest.fn().mockResolvedValue({
					facebook: 'https://facebook.com/example',
					instagram: 'https://instagram.com/example',
					twitter: 'https://twitter.com/example',
				}),
			};

			const links = await extractSocialMediaLinks(mockPage);
			expect(links.facebook).toBeDefined();
			expect(links.instagram).toBeDefined();
			expect(links.twitter).toBeDefined();
		});

		it('should return empty object when no social links found', async () => {
			const mockPage = {
				evaluate: jest.fn().mockResolvedValue({}),
			};

			const links = await extractSocialMediaLinks(mockPage);
			expect(Object.keys(links)).toHaveLength(0);
		});
	});

	describe('extractContactInfo', () => {
		it('should extract all contact information', async () => {
			const mockPage = {
				textContent: jest.fn().mockResolvedValue('Contact: info@example.com or call 555-1234'),
				evaluate: jest.fn((fn) => {
					if (fn.toString().includes('phoneRegex')) {
						return Promise.resolve(['555-1234']);
					}
					return Promise.resolve({
						facebook: 'https://facebook.com/example',
					});
				}),
			};

			const contactInfo = await extractContactInfo(mockPage);
			expect(contactInfo.emails).toContain('info@example.com');
			expect(contactInfo.phoneNumbers).toContain('555-1234');
			expect(contactInfo.socialMedia.facebook).toBeDefined();
		});

		it('should handle pages with no contact information', async () => {
			const mockPage = {
				textContent: jest.fn().mockResolvedValue('No contact info here'),
				evaluate: jest.fn((fn) => {
					const fnStr = fn.toString();
					if (fnStr.includes('phoneRegex')) {
						return Promise.resolve([]);
					}
					return Promise.resolve({});
				}),
			};

			const contactInfo = await extractContactInfo(mockPage);
			expect(contactInfo.emails).toEqual([]);
			expect(contactInfo.phoneNumbers).toEqual([]);
			expect(Object.keys(contactInfo.socialMedia)).toHaveLength(0);
		});
	});
});

