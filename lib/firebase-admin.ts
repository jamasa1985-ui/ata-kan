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
        // 環境変数もファイルもない場合
        console.error('Firebase Admin credentials missing. Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
    }
}

const app = getApps()[0];

if (!app) {
    // ビルド時にNext.jsがこのファイルをimportした際、
    // 認証情報がないとここで停止させることで、原因不明の "default app does not exist" を防ぐ
    throw new Error('Firebase Admin initialization failed: Missing credentials. Ensure FIREBASE_SERVICE_ACCOUNT_KEY is set in Vercel environment variables.');
}

// Firestoreインスタンスのエクスポート
export const adminDb = getFirestore(app);
