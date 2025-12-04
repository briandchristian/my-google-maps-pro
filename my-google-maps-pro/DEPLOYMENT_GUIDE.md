# Deployment & API Communication Guide

## Prerequisites

1. **Apify Account**: Sign up at https://apify.com
2. **API Token**: Get it from https://console.apify.com/account/integrations

## Step 1: Deploy the Actor to Apify

### Login to Apify CLI

```bash
# Option 1: Interactive login
apify login

# Option 2: Login with token
apify login -t YOUR_API_TOKEN
```

### Deploy the Actor

```bash
# Push the Actor to Apify platform
apify push

# This will:
# - Build the Docker image
# - Upload the Actor to Apify
# - Make it available in your account
```

After deployment, note your Actor ID: `YOUR_USERNAME/my-google-maps-pro`

## Step 2: Communicate with the Actor via API

### Install API Client (if testing locally)

```bash
npm install apify-client
```

### Option A: Use the Test Script

1. Set your API token:
```bash
# Windows PowerShell
$env:APIFY_TOKEN="your_api_token_here"

# Windows CMD
set APIFY_TOKEN=your_api_token_here

# Linux/Mac
export APIFY_TOKEN=your_api_token_here
```

2. Update `test-actor-api.js` with your username:
```javascript
const ACTOR_ID = 'YOUR_USERNAME/my-google-maps-pro';
```

3. Run the test:
```bash
node test-actor-api.js
```

### Option B: Use cURL

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "searches": [
      {
        "query": "restaurants",
        "location": "New York, NY"
      }
    ],
    "maxPlaces": 10,
    "includeReviews": true,
    "maxReviews": 20
  }' \
  https://api.apify.com/v2/acts/YOUR_USERNAME~my-google-maps-pro/run-sync-get-dataset-items
```

### Option C: Use JavaScript/Node.js

```javascript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
    token: 'YOUR_API_TOKEN',
});

// Run the Actor
const run = await client.actor('YOUR_USERNAME/my-google-maps-pro').call({
    searches: [
        {
            query: "coffee shops",
            location: "San Francisco, CA"
        }
    ],
    maxPlaces: 10,
    includeReviews: true,
    maxReviews: 20
});

// Get results
const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items);
```

### Option D: Use Python

```python
from apify_client import ApifyClient

client = ApifyClient('YOUR_API_TOKEN')

# Run the Actor
run = client.actor('YOUR_USERNAME/my-google-maps-pro').call(run_input={
    'searches': [
        {
            'query': 'restaurants',
            'location': 'New York, NY'
        }
    ],
    'maxPlaces': 10,
    'includeReviews': True,
    'maxReviews': 20
})

# Get results
items = client.dataset(run['defaultDatasetId']).list_items().items
print(items)
```

## Step 3: Monitor Runs

### Via Console
Visit: https://console.apify.com/actors/runs

### Via API
```javascript
// Get run details
const runInfo = await client.run('RUN_ID').get();
console.log(runInfo);

// Wait for run to finish
const run = await client.run('RUN_ID').waitForFinish();
console.log(run.status);
```

## API Endpoints

- **Run Actor**: `POST https://api.apify.com/v2/acts/YOUR_USERNAME~my-google-maps-pro/runs`
- **Run Sync**: `POST https://api.apify.com/v2/acts/YOUR_USERNAME~my-google-maps-pro/run-sync`
- **Get Dataset**: `GET https://api.apify.com/v2/datasets/DATASET_ID/items`
- **Get Run Info**: `GET https://api.apify.com/v2/actor-runs/RUN_ID`

## Input Parameters

See `.actor/input_schema.json` for complete input specification.

### Minimal Input
```json
{
  "searches": [
    {
      "query": "restaurants",
      "location": "New York, NY"
    }
  ]
}
```

### Full Input Example
```json
{
  "searches": [
    {
      "query": "coffee shops",
      "location": "San Francisco, CA"
    }
  ],
  "maxPlaces": 50,
  "includeReviews": true,
  "maxReviews": 20,
  "downloadPhotos": false,
  "extractContactInfo": false,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  },
  "captchaConfiguration": {
    "antiCaptchaApiKey": "your-api-key",
    "maxRetries": 3
  },
  "maxConcurrency": 5,
  "navigationTimeoutSecs": 120,
  "requestHandlerTimeoutSecs": 300
}
```

## Troubleshooting

### Actor Not Found
- Make sure you've run `apify push` to deploy the Actor
- Check that the Actor ID format is correct: `username/actor-name`
- Verify your API token has access to the Actor

### Authentication Failed
- Check that your API token is valid
- Ensure the token is set correctly in environment variables
- Try regenerating the token in Apify Console

### Timeout Errors
- Increase `waitSecs` parameter when calling the Actor
- Check Actor logs in Apify Console for errors
- Consider increasing `navigationTimeoutSecs` and `requestHandlerTimeoutSecs`

### CAPTCHA Issues
- Provide a valid `antiCaptchaApiKey` in the input
- Ensure you have credits in your Anti-Captcha account
- Check CAPTCHA solving logs in the Actor run

## Resources

- [Apify API Documentation](https://docs.apify.com/api/v2)
- [Apify Client JS](https://docs.apify.com/api/client/js)
- [Apify Client Python](https://docs.apify.com/api/client/python)
- [Actor Documentation](https://docs.apify.com/platform/actors)


