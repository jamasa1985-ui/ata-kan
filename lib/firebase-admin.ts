import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

// Firebase Admin SDKの初期化
if (getApps().length === 0) {
    // Environment variable takes precedence (for Vercel/Production)
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    let serviceAccount;
    if (serviceAccountJson) {
        try {
            serviceAccount = JSON.parse(serviceAccountJson);
        } catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
            throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
        }
    } else {
        // Fallback to local file (for local development)
        const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

        // Check if file exists to avoid crash if regular build runs without it and without env var
        if (fs.existsSync(serviceAccountPath)) {
            serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        } else {
            console.warn('No serviceAccountKey.json found and no FIREBASE_SERVICE_ACCOUNT_KEY env var set.');
            // This might crash later if credentials are strictly required, but avoids ENOENT immediately
        }
    }

    if (serviceAccount) {
        initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        // If we reach here without credentials, we might want to initialize default or just let it fail later
        // But for build, sometimes we just need it to not crash if it's just type checking or collecting paths that don't need DB
        // However, if getFirestore is called, it needs app.
        // Let's try to initialize without args if generic google cloud env, or throw specific error
        if (process.env.NODE_ENV === 'production') {
            console.error('Firebase Admin credentials missing.');
        }
    }
}

// Firestoreインスタンスのエクスポート
export const adminDb = getFirestore(getApps()[0]);
