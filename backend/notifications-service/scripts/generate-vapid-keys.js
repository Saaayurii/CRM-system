#!/usr/bin/env node
/**
 * Generate VAPID key pair for Web Push.
 * Run once, then add the output to your .env file.
 *
 * Usage:
 *   node backend/notifications-service/scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();

console.log('\n✅  VAPID keys generated — add to your .env:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:admin@yourdomain.com`);
console.log('\n⚠️   Keep VAPID_PRIVATE_KEY secret — never commit it.\n');
console.log('For the frontend also add:');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}\n`);
