/**
 * Check if the Actor is deployed and accessible on Apify
 * 
 * Usage:
 * 1. Set APIFY_TOKEN environment variable
 * 2. Set APIFY_USERNAME environment variable (or update below)
 * 3. Run: node check-actor-status.js
 */

import { ApifyClient } from 'apify-client';

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_USERNAME = process.env.APIFY_USERNAME || 'YOUR_USERNAME';
const ACTOR_NAME = 'my-google-maps-pro';

async function checkActorStatus() {
	console.log('🔍 Checking Actor deployment status...\n');

	if (!APIFY_TOKEN || APIFY_TOKEN === 'YOUR_API_TOKEN_HERE') {
		console.error('❌ Error: APIFY_TOKEN not set!');
		console.log('\n💡 To fix this:');
		console.log('   1. Get your API token from: https://console.apify.com/account/integrations');
		console.log('   2. Set it as environment variable:');
		console.log('      PowerShell: $env:APIFY_TOKEN="your_token"');
		console.log('      CMD: set APIFY_TOKEN=your_token');
		console.log('      Linux/Mac: export APIFY_TOKEN=your_token\n');
		process.exit(1);
	}

	if (APIFY_USERNAME === 'YOUR_USERNAME') {
		console.error('❌ Error: APIFY_USERNAME not set!');
		console.log('\n💡 To fix this:');
		console.log('   Set your Apify username as environment variable:');
		console.log('   PowerShell: $env:APIFY_USERNAME="your_username"');
		console.log('   CMD: set APIFY_USERNAME=your_username');
		console.log('   Linux/Mac: export APIFY_USERNAME=your_username\n');
		process.exit(1);
	}

	const client = new ApifyClient({ token: APIFY_TOKEN });
	const actorId = `${APIFY_USERNAME}/${ACTOR_NAME}`;

	try {
		// Try to get Actor information
		console.log(`📡 Checking Actor: ${actorId}\n`);
		
		const actor = await client.actor(actorId).get();

		if (actor) {
			console.log('✅ Actor is deployed and accessible!\n');
			console.log('📊 Actor Information:');
			console.log(`   Name: ${actor.name}`);
			console.log(`   Title: ${actor.title || 'N/A'}`);
			console.log(`   Version: ${actor.taggedBuilds?.latest || 'N/A'}`);
			console.log(`   Created: ${new Date(actor.createdAt).toLocaleString()}`);
			console.log(`   Modified: ${new Date(actor.modifiedAt).toLocaleString()}`);
			console.log(`   Public: ${actor.isPublic ? 'Yes' : 'No'}`);
			console.log(`\n🔗 Console URL: https://console.apify.com/actors/${actor.id}`);
			
			// Get recent runs
			console.log('\n📈 Recent Runs:');
			const runs = await client.actor(actorId).runs().list({ limit: 5 });
			
			if (runs.items.length === 0) {
				console.log('   No runs yet');
			} else {
				runs.items.forEach((run, index) => {
					const status = run.status === 'SUCCEEDED' ? '✅' : 
					              run.status === 'FAILED' ? '❌' : 
					              run.status === 'RUNNING' ? '⏳' : '⏸️';
					console.log(`   ${status} ${run.status} - ${new Date(run.startedAt).toLocaleString()}`);
				});
			}

			console.log('\n✅ You can now communicate with this Actor!');
			console.log('   Run: node test-actor-api.js');
			
			return true;
		}

	} catch (error) {
		if (error.message.includes('not found') || error.statusCode === 404) {
			console.log('❌ Actor not found on Apify platform\n');
			console.log('💡 The Actor needs to be deployed first:');
			console.log('   1. Login to Apify:');
			console.log('      apify login\n');
			console.log('   2. Deploy the Actor:');
			console.log('      apify push\n');
			console.log('   3. Then run this script again\n');
			return false;
		} else if (error.message.includes('Unauthorized') || error.statusCode === 401) {
			console.error('❌ Authentication failed\n');
			console.log('💡 Check that:');
			console.log('   1. Your API token is correct');
			console.log('   2. The token has not expired');
			console.log('   3. Get a new token from: https://console.apify.com/account/integrations\n');
			return false;
		} else {
			console.error('❌ Error checking Actor:', error.message);
			console.error('   Status Code:', error.statusCode);
			throw error;
		}
	}
}

// Run the check
checkActorStatus()
	.then((isDeployed) => {
		process.exit(isDeployed ? 0 : 1);
	})
	.catch((error) => {
		console.error('\n❌ Unexpected error:', error);
		process.exit(1);
	});


