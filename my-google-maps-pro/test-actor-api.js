/**
 * Test script to communicate with the deployed Apify Actor
 * 
 * Usage:
 * 1. Set your APIFY_TOKEN environment variable
 * 2. Update the ACTOR_ID with your username/actor-name
 * 3. Run: node test-actor-api.js
 */

import { ApifyClient } from 'apify-client';

// Configuration
const APIFY_TOKEN = process.env.APIFY_TOKEN || 'YOUR_API_TOKEN_HERE';
const ACTOR_ID = 'YOUR_USERNAME/my-google-maps-pro'; // Update with your username

// Test input
const testInput = {
	searches: [
		{
			query: "coffee shops",
			location: "San Francisco, CA"
		}
	],
	maxPlaces: 5,
	includeReviews: true,
	maxReviews: 10,
	downloadPhotos: false,
	extractContactInfo: false,
	proxyConfiguration: {
		useApifyProxy: true,
		apifyProxyGroups: ["RESIDENTIAL"]
	},
	maxConcurrency: 3,
	navigationTimeoutSecs: 120,
	requestHandlerTimeoutSecs: 300
};

async function testActor() {
	console.log('🚀 Testing Apify Actor...\n');
	
	// Initialize the Apify client
	const client = new ApifyClient({
		token: APIFY_TOKEN,
	});

	try {
		// Start the Actor
		console.log(`📡 Starting Actor: ${ACTOR_ID}`);
		console.log(`📝 Input:`, JSON.stringify(testInput, null, 2));
		console.log('\n⏳ Waiting for Actor to complete...\n');

		const run = await client.actor(ACTOR_ID).call(testInput, {
			waitSecs: 300, // Wait up to 5 minutes
		});

		console.log(`✅ Actor run completed!`);
		console.log(`🔗 Run URL: https://console.apify.com/actors/runs/${run.id}`);
		console.log(`📊 Status: ${run.status}`);
		console.log(`⏱️  Duration: ${Math.round(run.stats.runTimeSecs)}s`);
		console.log(`💰 Compute units: ${run.stats.computeUnits}\n`);

		// Get the results from the dataset
		console.log('📥 Fetching results...\n');
		const { items } = await client.dataset(run.defaultDatasetId).listItems();

		console.log(`📊 Total places scraped: ${items.length}\n`);
		
		// Display first result
		if (items.length > 0) {
			console.log('📍 First result:');
			console.log(JSON.stringify(items[0], null, 2));
		}

		// Summary statistics
		const withReviews = items.filter(item => item.reviews && item.reviews.length > 0).length;
		const avgRating = items
			.filter(item => item.rating)
			.reduce((sum, item) => sum + parseFloat(item.rating), 0) / items.length;

		console.log('\n📈 Summary:');
		console.log(`  - Total places: ${items.length}`);
		console.log(`  - Places with reviews: ${withReviews}`);
		console.log(`  - Average rating: ${avgRating.toFixed(2)}`);

		return items;

	} catch (error) {
		console.error('❌ Error testing Actor:', error.message);
		
		if (error.message.includes('not found')) {
			console.error('\n💡 Make sure:');
			console.error('  1. The Actor is deployed (run: apify push)');
			console.error('  2. The ACTOR_ID is correct (format: username/actor-name)');
			console.error('  3. Your API token has access to this Actor');
		}
		
		throw error;
	}
}

// Run the test
testActor()
	.then(() => {
		console.log('\n✅ Test completed successfully!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Test failed:', error);
		process.exit(1);
	});


