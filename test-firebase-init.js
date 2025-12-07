const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

console.log('Starting Firebase Admin Test...');

try {
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    console.log('Looking for key at:', serviceAccountPath);

    if (!fs.existsSync(serviceAccountPath)) {
        console.error('ERROR: serviceAccountKey.json not found!');
        process.exit(1);
    }

    const content = fs.readFileSync(serviceAccountPath, 'utf8');
    console.log('File found. Size:', content.length, 'bytes');

    if (content.trim().length === 0) {
        console.error('ERROR: File is empty!');
        process.exit(1);
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(content);
        console.log('JSON Parse: Success');
        console.log('Project ID:', serviceAccount.project_id);
    } catch (parseError) {
        console.error('ERROR: Failed to parse JSON:', parseError.message);
        process.exit(1);
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin Initialized: Success');
    } else {
        console.log('Firebase Admin already initialized (unexpected in standalone script)');
    }

    console.log('Test Complete: OK');

} catch (e) {
    console.error('Unexpected Error:', e);
}
