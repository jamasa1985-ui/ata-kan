
import { adminDb } from '../lib/firebase-admin';

async function test() {
    try {
        console.log('--- PRODUCTS ---');
        const productsSnapshot = await adminDb.collection('products').limit(5).get();
        productsSnapshot.forEach(doc => {
            console.log(`Product ID: ${doc.id}, Name: ${doc.data().name}`);
        });

        console.log('\n--- ENTRIES ---');
        const entriesSnapshot = await adminDb.collection('entries').limit(5).get();
        entriesSnapshot.forEach(doc => {
            console.log(`Entry ID: ${doc.id}, ProductId: ${doc.data().productId}`);
        });

    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
