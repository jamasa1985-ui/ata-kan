import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const optionsRef = adminDb.collection('options');
        // Fetch specific options we need
        // OP002: Status, OP003: Apply Method
        const docIds = ['OP002', 'OP003'];
        const results: Record<string, any[]> = {};

        // Parallel fetch
        await Promise.all(docIds.map(async (id) => {
            const doc = await optionsRef.doc(id).get();
            if (doc.exists) {
                const data = doc.data();
                results[id] = data?.itemoption || [];
            }
        }));

        return NextResponse.json(results);
    } catch (error) {
        console.error('オプション情報の取得に失敗しました:', error);
        return NextResponse.json(
            { error: 'オプション情報の取得に失敗しました' },
            { status: 500 }
        );
    }
}
