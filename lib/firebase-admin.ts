import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

// Firebase Admin SDKの初期化
if (getApps().length === 0) {
    // プロジェクトルートからの絶対パスを解決
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

    // requireではなくfsで読み込むことでバンドルエラーを回避
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount),
    });
}

// Firestoreインスタンスのエクスポート
export const adminDb = getFirestore(getApps()[0]);
