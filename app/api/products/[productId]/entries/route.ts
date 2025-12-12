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
        const snapshot = await entriesRef.where('productId', '==', productId).get();

        const entries = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();

            // Fetch purchaseMembers subcollection
            const membersSnapshot = await doc.ref.collection('purchaseMembers').get();
            const purchaseMembers = membersSnapshot.docs.map(mDoc => ({
                id: mDoc.id,
                ...mDoc.data()
            }));

            return {
                id: doc.id,
                ...data, // Spread original data
                // Explicitly map fields to match Entry type
                productId: data.productId,
                productName: data.productShortName,
                shopShortName: data.shopShortName || data.storeName || '店舗名なし', // Fallback with explicit text
                status: data.status,
                purchaseMembers, // Attach fetched members
            };
        }));

        return NextResponse.json(entries);
    } catch (error) {
        console.error('応募データの取得に失敗しました:', error);
        return NextResponse.json(
            { error: '応募データの取得に失敗しました' },
            { status: 500 }
        );
    }
}
