## Google Maps Pro Scraper

Advanced Google Maps scraper built with Playwright and Apify SDK. This Actor scrapes Google Maps place data with the following features:

- ✅ **Proxy Rotation** - Uses Apify residential proxies for scaling and avoiding blocks
- ✅ **CAPTCHA Solving** - Automatic CAPTCHA detection and solving integration
- ✅ **Review Extraction** - Scrolls through and extracts all reviews with ratings and responses
- ✅ **Photo Downloads** - Downloads and stores place photos
- ✅ **Contact Extraction** - Extracts emails and social media links from business websites

## ⚠️ Important Requirements

### Apify Proxies Required
**Google Maps blocks datacenter IPs.** This actor requires **Apify residential proxies** to function properly:

- ❌ **Will NOT work** on free tier without proxies (timeouts, blocks)
- ✅ **Requires** paid Apify plan with residential proxy access
- 💰 **Cost**: ~$0.50-$1 per 1,000 places scraped (proxy usage)

**Without proxies you will see:**
- `net::ERR_TIMED_OUT` errors
- CAPTCHA challenges
- Zero results

### Memory Requirements
- **Minimum**: 2GB RAM (4GB recommended)
- **Free tier (1GB)**: Will experience memory overload and timeouts
- **Concurrency**: 1-2 for 2GB, 3-5 for 4GB+

## Features

### Proxy Rotation
- Automatic proxy rotation using Apify residential proxies
- Configurable proxy groups and country-specific proxies
- Essential for scaling and avoiding IP blocks

### CAPTCHA Solving
- Automatic reCAPTCHA v2/v3 detection
- Integration with Apify Anti-Captcha Actor
- Retry logic for failed CAPTCHA solving

### Review Extraction
- Automatic scrolling through all reviews
- Expands "More" buttons to get full review text
- Extracts ratings, authors, dates, and owner responses

### Photo Downloads
- Extracts photo URLs from place pages
- Downloads and stores photos in key-value store
- Supports high-resolution photo extraction

### Contact Information
- Extracts email addresses from business websites
- Finds social media links (Facebook, Instagram, Twitter, LinkedIn, etc.)
- Extracts phone numbers

## Getting Started

### Prerequisites

- Node.js 16+ installed
- Apify CLI installed: `npm install -g apify-cli`
- Apify account (for proxy access and deployment)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure your input in `storage/key_value_stores/default/INPUT.json`:

```json
{
	"searches": [
		{
			"query": "restaurants",
			"location": "New York, NY"
		}
	],
	"maxPlaces": 10,
	"includeReviews": true,
	"maxReviews": 20,
	"downloadPhotos": false,
	"extractContactInfo": false,
	"proxyConfiguration": {
		"useApifyProxy": true,
		"apifyProxyGroups": ["RESIDENTIAL"]
	},
	"captchaConfiguration": {
		"antiCaptchaApiKey": "your-api-key-here",
		"maxRetries": 3
	}
}
```

### Running Locally

**Option 1: Using Apify CLI (Recommended)**
```bash
apify run
```

**Option 2: Using npm start**
```bash
npm start
```

The scraper will:
1. Read input from `storage/key_value_stores/default/INPUT.json`
2. Scrape Google Maps based on your search queries
3. Save results to `storage/datasets/default/`

### Input Configuration

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `searches` | Array | List of search queries with location | **Required** |
| `maxPlaces` | Number | Maximum places to scrape per search | 100 |
| `includeReviews` | Boolean | Extract reviews for each place | true |
| `maxReviews` | Number | Maximum reviews per place | 50 |
| `downloadPhotos` | Boolean | Download and store photos | false |
| `extractContactInfo` | Boolean | Extract emails/social from websites | false |
| `proxyConfiguration` | Object | Proxy settings (use Apify proxy editor) | See below |
| `proxyConfiguration.useApifyProxy` | Boolean | Use Apify residential proxies | true |
| `proxyConfiguration.apifyProxyGroups` | Array | Proxy groups (e.g., ["RESIDENTIAL"]) | ["RESIDENTIAL"] |
| `proxyConfiguration.apifyProxyCountry` | String | ISO country code (e.g., "US") | Optional |
| `captchaConfiguration.antiCaptchaApiKey` | String | Anti-Captcha API key | Optional |
| `captchaConfiguration.maxRetries` | Number | Maximum CAPTCHA retry attempts | 3 |
| `maxConcurrency` | Number | Maximum concurrent pages (1-10) | 5 |
| `navigationTimeoutSecs` | Number | Page navigation timeout in seconds | 120 |
| `requestHandlerTimeoutSecs` | Number | Request handler timeout in seconds | 300 |

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Output

The scraper outputs data to the default dataset with the following structure. The dataset schema provides **5 different views** in the Apify Console for easy data exploration:

### Dataset Views

1. **Overview** - Basic place information (name, address, phone, rating, website)
2. **Detailed View** - Complete information including GPS coordinates and timestamps
3. **With Reviews** - Places with their full review data
4. **Contact Information** - Places with extracted contact details from websites
5. **Export (All Fields)** - All available data for complete export

### Output Structure

```json
{
	"title": "Place Name",
	"address": "123 Main St, City, State",
	"phone": "+1 555-1234",
	"website": "https://example.com",
	"rating": "4.5",
	"gps": {
		"lat": 40.7128,
		"lng": -74.0060
	},
	"url": "https://www.google.com/maps/place/...",
	"scrapedAt": "2024-01-01T00:00:00.000Z",
	"reviews": [
		{
			"author": "John Doe",
			"rating": 5,
			"text": "Great place!",
			"date": "2 weeks ago",
			"response": {
				"owner": "Business Owner",
				"text": "Thank you!",
				"date": "2 weeks ago"
			}
		}
	],
	"photos": [
		{
			"key": "photo-place-id-0",
			"url": "https://...",
			"thumbnail": "https://...",
			"alt": "Place photo"
		}
	],
	"contactInfo": {
		"emails": ["info@example.com"],
		"socialMedia": {
			"facebook": "https://facebook.com/...",
			"instagram": "https://instagram.com/..."
		},
		"phoneNumbers": ["+1 555-1234"]
	}
}
```

## Deploy to Apify

### Prerequisites

1. Log in to Apify (you'll need your [Apify API Token](https://console.apify.com/account/integrations)):
```bash
apify login
```

### Deploy

Deploy your Actor to the Apify Platform:
```bash
apify push
```

Your Actor will be available at [Actors -> My Actors](https://console.apify.com/actors?tab=my).

### Communicate with Deployed Actor

After deployment, you can interact with your Actor via the Apify API:

#### Check Actor Status
```bash
# Set your credentials
$env:APIFY_TOKEN="your_api_token"
$env:APIFY_USERNAME="your_username"

# Check if Actor is deployed
node check-actor-status.js
```

#### Test the Actor
```bash
# Run a test scrape
node test-actor-api.js
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete deployment and API communication instructions.

### Connect Git Repository (Optional)

1. Go to [Actor creation page](https://console.apify.com/actors/new)
2. Click on **Link Git Repository** button
3. Connect your GitHub/GitLab repository

## Resources

- [Apify SDK for JavaScript documentation](https://docs.apify.com/sdk/js)
- [Crawlee + Apify Platform guide](https://crawlee.dev/docs/guides/apify-platform)
- [PlaywrightCrawler documentation](https://crawlee.dev/api/playwright-crawler/class/PlaywrightCrawler)
- [Apify Platform documentation](https://docs.apify.com/platform)
- [Join our developer community on Discord](https://discord.com/invite/jyEM2PRvMU)
