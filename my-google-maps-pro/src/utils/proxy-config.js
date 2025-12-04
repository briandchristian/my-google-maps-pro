/**
 * Proxy Configuration Utility
 * 
 * Provides proxy configuration for Apify PlaywrightCrawler using Apify's built-in
 * residential proxy rotation. This is crucial for scaling Google Maps scraping
 * and avoiding rate limits and IP blocks.
 * 
 * Features:
 * - Automatic proxy rotation using Apify residential proxies
 * - Configurable proxy groups and countries
 * - Fallback handling for proxy failures
 */

import { Actor } from 'apify';

/**
 * Valid ISO 3166-1 alpha-2 country codes for proxy selection
 */
const VALID_COUNTRY_CODES = new Set([
	'US', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP', 'IT', 'ES', 'NL',
	'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'IE',
	'PT', 'GR', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV',
	'EE', 'LU', 'MT', 'CY', 'IS', 'LI', 'MC', 'AD', 'SM', 'VA',
	'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY',
	'UY', 'GY', 'SR', 'GF', 'FK', 'ZA', 'EG', 'NG', 'KE', 'GH',
	'TN', 'DZ', 'MA', 'SN', 'CI', 'CM', 'AO', 'MZ', 'ZW', 'BW',
	'NA', 'ZM', 'MW', 'UG', 'TZ', 'ET', 'SD', 'SO', 'DJ', 'ER',
	'SS', 'CF', 'TD', 'NE', 'ML', 'BF', 'MR', 'GM', 'GN', 'GW',
	'SL', 'LR', 'TG', 'BJ', 'IN', 'CN', 'JP', 'KR', 'TH', 'VN',
	'PH', 'ID', 'MY', 'SG', 'BD', 'PK', 'LK', 'MM', 'KH', 'LA',
	'MN', 'NP', 'BT', 'MV', 'BN', 'TL', 'FJ', 'PG', 'SB', 'VU',
	'NC', 'PF', 'WS', 'TO', 'TV', 'KI', 'NR', 'PW', 'FM', 'MH',
	'AU', 'NZ', 'RU', 'UA', 'BY', 'MD', 'GE', 'AM', 'AZ', 'KZ',
	'UZ', 'TM', 'TJ', 'KG', 'AF', 'IR', 'IQ', 'SA', 'AE', 'OM',
	'YE', 'JO', 'LB', 'SY', 'IL', 'PS', 'TR', 'CY', 'GR', 'AL',
	'MK', 'RS', 'ME', 'BA', 'XK', 'HR', 'SI', 'HU', 'SK', 'CZ',
	'PL', 'LT', 'LV', 'EE', 'FI', 'SE', 'NO', 'DK', 'IS', 'IE',
	'GB', 'FR', 'ES', 'PT', 'IT', 'CH', 'AT', 'BE', 'NL', 'LU',
	'DE', 'DK', 'SE', 'NO', 'FI', 'IS', 'IE', 'GB', 'FR', 'ES',
	'PT', 'IT', 'GR', 'CY', 'MT', 'PL', 'CZ', 'SK', 'HU', 'RO',
	'BG', 'HR', 'SI', 'LT', 'LV', 'EE', 'LU', 'BE', 'NL', 'AT',
	'CH', 'LI', 'MC', 'AD', 'SM', 'VA', 'US', 'CA', 'MX', 'BR',
	'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'GY',
	'SR', 'GF', 'FK', 'ZA', 'EG', 'NG', 'KE', 'GH', 'TN', 'DZ',
	'MA', 'SN', 'CI', 'CM', 'AO', 'MZ', 'ZW', 'BW', 'NA', 'ZM',
	'MW', 'UG', 'TZ', 'ET', 'SD', 'SO', 'DJ', 'ER', 'SS', 'CF',
	'TD', 'NE', 'ML', 'BF', 'MR', 'GM', 'GN', 'GW', 'SL', 'LR',
	'TG', 'BJ', 'IN', 'CN', 'JP', 'KR', 'TH', 'VN', 'PH', 'ID',
	'MY', 'SG', 'BD', 'PK', 'LK', 'MM', 'KH', 'LA', 'MN', 'NP',
	'BT', 'MV', 'BN', 'TL', 'FJ', 'PG', 'SB', 'VU', 'NC', 'PF',
	'WS', 'TO', 'TV', 'KI', 'NR', 'PW', 'FM', 'MH', 'AU', 'NZ',
	'RU', 'UA', 'BY', 'MD', 'GE', 'AM', 'AZ', 'KZ', 'UZ', 'TM',
	'TJ', 'KG', 'AF', 'IR', 'IQ', 'SA', 'AE', 'OM', 'YE', 'JO',
	'LB', 'SY', 'IL', 'PS', 'TR',
]);

/**
 * Creates a ProxyConfiguration instance for Apify PlaywrightCrawler
 * 
 * @param {Object} options - Proxy configuration options
 * @param {boolean} [options.useApifyProxy=true] - Whether to use Apify proxy
 * @param {string[]} [options.apifyProxyGroups=['RESIDENTIAL']] - Proxy groups to use
 * @param {string} [options.apifyProxyCountry] - ISO country code for country-specific proxies
 * @returns {Promise<ProxyConfiguration>} Configured proxy instance
 * @throws {Error} If invalid country code is provided
 */
export async function createProxyConfiguration(options = {}) {
	const {
		useApifyProxy = true,
		apifyProxyGroups = ['RESIDENTIAL'],
		apifyProxyCountry,
	} = options;

	// Validate country code if provided
	if (apifyProxyCountry && !VALID_COUNTRY_CODES.has(apifyProxyCountry.toUpperCase())) {
		throw new Error(
			`Invalid country code: ${apifyProxyCountry}. Must be a valid ISO 3166-1 alpha-2 code.`
		);
	}

	// If Apify proxy is disabled, return undefined (no proxy)
	if (!useApifyProxy) {
		return undefined;
	}

	const proxyConfig = {
		groups: apifyProxyGroups,
		...(apifyProxyCountry && {
			countryCode: apifyProxyCountry.toUpperCase(),
		}),
	};

	return Actor.createProxyConfiguration(proxyConfig);
}

