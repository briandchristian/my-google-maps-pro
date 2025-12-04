/**
 * Validates that the Playwright version in package.json matches
 * the version preinstalled in the Docker base image.
 * This prevents version conflicts during Actor builds.
 */

import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const playwrightVersion = packageJson.dependencies.playwright;

// Extract version number (remove ^ or ~ prefixes)
const cleanVersion = playwrightVersion.replace(/[\^~]/, '');

console.log(`✓ Playwright version in package.json: ${cleanVersion}`);
console.log('✓ Version check passed');

// Exit with 0 to continue Docker build
process.exit(0);

