import { ApifyClient } from 'apify-client';

// Get your API token from: https://console.apify.com/account/integrations
// Set it as an environment variable: APIFY_TOKEN
const client = new ApifyClient({
    token: process.env.APIFY_TOKEN || 'YOUR_APIFY_API_TOKEN_HERE'
});

console.log('🔍 Fetching your Actors...\n');

try {
    const actorsList = await client.actors().list();
    
    console.log(`✅ Found ${actorsList.total} Actor(s) in your account:\n`);
    
    actorsList.items.forEach((actor, index) => {
        console.log(`${index + 1}. ${actor.name}`);
        console.log(`   ID: ${actor.id}`);
        console.log(`   Username/Name: ${actor.username}/${actor.name}`);
        console.log(`   Title: ${actor.title || 'N/A'}`);
        console.log(`   URL: https://console.apify.com/actors/${actor.id}`);
        console.log('');
    });
    
    // Look for Google Maps related ones
    const gmapsActors = actorsList.items.filter(a => 
        a.name.toLowerCase().includes('google') || 
        a.name.toLowerCase().includes('maps') ||
        a.title?.toLowerCase().includes('google') ||
        a.title?.toLowerCase().includes('maps')
    );
    
    if (gmapsActors.length > 0) {
        console.log('📍 Google Maps related Actors:');
        gmapsActors.forEach(actor => {
            console.log(`   - ${actor.username}/${actor.name}`);
        });
    }
    
} catch (error) {
    console.error('❌ Error:', error.message);
}


