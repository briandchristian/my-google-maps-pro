/**
 * Quick test script for clever_fashion/my-google-maps-pro Actor
 */

import { ApifyClient } from 'apify-client';

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = 'clever_fashion/my-google-maps-pro';

if (!APIFY_TOKEN) {
    console.log('❌ Please set your API token first:');
    console.log('   $env:APIFY_TOKEN="your_token_here"');
    console.log('\n   Get your token from: https://console.apify.com/account/integrations\n');
    process.exit(1);
}

const client = new ApifyClient({ token: APIFY_TOKEN });

console.log(`🔍 Checking Actor: ${ACTOR_ID}\n`);

try {
    const actor = await client.actor(ACTOR_ID).get();
    console.log('✅ Actor found and accessible!\n');
    console.log(`📊 Name: ${actor.name}`);
    console.log(`📝 Title: ${actor.title}`);
    console.log(`🔗 URL: https://console.apify.com/actors/${actor.id}\n`);
    
    console.log('✅ Ready to communicate with your Actor!');
    console.log('   Run: node test-actor-api.js\n');
} catch (error) {
    if (error.statusCode === 404) {
        console.log('❌ Actor not found. Please check:');
        console.log('   1. The Actor name is correct: my-google-maps-pro');
        console.log('   2. The Actor has been deployed with: apify push');
        console.log(`   3. Visit: https://console.apify.com/actors?tab=my\n`);
    } else {
        console.error('❌ Error:', error.message);
    }
}


