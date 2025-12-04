/**
 * Test the newly deployed Actor
 */

import { ApifyClient } from 'apify-client';

// Get your API token from: https://console.apify.com/account/integrations
// Set it as an environment variable: APIFY_TOKEN
const client = new ApifyClient({
    token: process.env.APIFY_TOKEN || 'YOUR_APIFY_API_TOKEN_HERE'
});

// New Actor ID from deployment
const ACTOR_ID = '7WgQSFtwzqNmKkvDL';

console.log(`🚀 Testing newly deployed Actor: ${ACTOR_ID}\n`);

const testInput = {
    searches: [
        {
            query: "pizza",
            location: "New York, NY"
        }
    ],
    maxPlaces: 2,
    includeReviews: false,
    maxReviews: 0,
    downloadPhotos: false,
    extractContactInfo: false,
    proxyConfiguration: {
        useApifyProxy: false
    },
    maxConcurrency: 2
};

console.log('📝 Input:', JSON.stringify(testInput, null, 2));
console.log('\n⏳ Starting Actor run...\n');

try {
    const run = await client.actor(ACTOR_ID).call(testInput, {
        waitSecs: 300,
    });

    console.log('✅ Actor run completed!\n');
    console.log(`🔗 Run URL: https://console.apify.com/actors/runs/${run.id}`);
    console.log(`📊 Status: ${run.status}`);
    console.log(`⏱️  Duration: ${Math.round(run.stats.runTimeSecs)}s`);
    
    // Get results
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log(`\n📍 Scraped ${items.length} places\n`);
    
    if (items.length > 0) {
        console.log('🎉 SUCCESS! The Actor is working correctly!\n');
        console.log('📋 Sample results:');
        items.forEach((item, i) => {
            console.log(`\n${i + 1}. ${item.title}`);
            console.log(`   Address: ${item.address || 'N/A'}`);
            console.log(`   Rating: ${item.rating || 'N/A'}`);
            console.log(`   Phone: ${item.phone || 'N/A'}`);
        });
    } else {
        console.log('⚠️  No places scraped. Check the run logs.');
    }
    
} catch (error) {
    console.error('❌ Error:', error.message);
}


