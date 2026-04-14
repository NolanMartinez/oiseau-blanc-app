import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('');
console.log('Clés VAPID générées — copiez dans server/.env :');
console.log('─────────────────────────────────────────────');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('─────────────────────────────────────────────');
console.log('');
