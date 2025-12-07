// app/api/products/[productId]/entries/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

type RouteContext = {
    params: Promise<{ productId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
    try {
        const { productId } = await context.params;

        const entriesRef = adminDb.collection('entries');
        // Firestore field is 'productCode', not 'productId'
        const snapshot = await entriesRef.where('productCode', '==', productId).get();

        const entries = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data, // Spread original data
                // Explicitly map fields to match Entry type
                productId: data.productCode,
                productName: data.productShortName,
                shopShortName: data.shopShortName || data.storeName || '店舗名なし', // Fallback with explicit text
                status: data.status,
            };
        });

        return NextResponse.json(entries);
    } catch (error) {
        console.error('応募データの取得に失敗しました:', error);
        return NextResponse.json(
            { error: '応募データの取得に失敗しました' },
            { status: 500 }
        );
    }
}
