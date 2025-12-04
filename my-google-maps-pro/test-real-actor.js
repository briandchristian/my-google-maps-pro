/**
 * Test communication with the deployed HelloWorldImersiversity Actor
 */

import { ApifyClient } from 'apify-client';

// Get your API token from: https://console.apify.com/account/integrations
// Set it as an environment variable: APIFY_TOKEN
const client = new ApifyClient({
    token: process.env.APIFY_TOKEN || 'YOUR_APIFY_API_TOKEN_HERE'
});

const ACTOR_ID = 'clever_fashion/HelloWorldImersiversity';

console.log(`🚀 Testing Actor: ${ACTOR_ID}\n`);

const testInput = {
    searches: [
        {
            query: "coffee shops",
            location: "San Francisco, CA"
        }
    ],
    maxPlaces: 3,
    includeReviews: false,
    maxReviews: 0,
    downloadPhotos: false,
    extractContactInfo: false,
    proxyConfiguration: {
        useApifyProxy: false
    },
    maxConcurrency: 3
};

console.log('📝 Input:', JSON.stringify(testInput, null, 2));
console.log('\n⏳ Starting Actor run...\n');

try {
    const run = await client.actor(ACTOR_ID).call(testInput, {
        waitSecs: 180, // Wait up to 3 minutes
    });

    console.log('✅ Actor run completed!\n');
    console.log(`🔗 Run URL: https://console.apify.com/actors/runs/${run.id}`);
    console.log(`📊 Status: ${run.status}`);
    console.log(`⏱️  Duration: ${Math.round(run.stats.runTimeSecs)}s`);
    console.log(`💰 Compute units: ${run.stats.computeUnits}\n`);

    // Get results
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log(`📍 Scraped ${items.length} places\n`);
    
    if (items.length > 0) {
        console.log('📋 Results:');
        items.forEach((item, i) => {
            console.log(`\n${i + 1}. ${item.title}`);
            console.log(`   Address: ${item.address}`);
            console.log(`   Rating: ${item.rating}`);
            console.log(`   URL: ${item.url}`);
        });
    }
    
    console.log('\n✅ Successfully communicated with the Actor!');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    if (error.type === 'run-failed') {
        console.error('The Actor run failed. Check the logs at the URL above.');
    }
}


