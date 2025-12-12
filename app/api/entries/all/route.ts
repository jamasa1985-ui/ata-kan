// app/api/entries/all/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
    try {
        // Fetch all entries
        const entriesRef = adminDb.collection('entries');
        const entriesSnapshot = await entriesRef.get();

        // Fetch all products to get product names
        const productsRef = adminDb.collection('products');
        const productsSnapshot = await productsRef.get();

        const productsMap: Record<string, any> = {};
        productsSnapshot.docs.forEach(doc => {
            productsMap[doc.id] = {
                id: doc.id,
                name: doc.data().name || '',
            };
        });

        const entries = await Promise.all(
            entriesSnapshot.docs.map(async (doc) => {
                const data = doc.data();

                // Fetch purchaseMembers subcollection
                const membersSnapshot = await doc.ref.collection('purchaseMembers').get();
                const purchaseMembers = membersSnapshot.docs.map(memberDoc => ({
                    id: memberDoc.id,
                    ...memberDoc.data()
                }));

                // Convert Firestore Timestamps to ISO strings
                const convertTimestamp = (field: any) => {
                    if (field && typeof field.toDate === 'function') {
                        return field.toDate().toISOString();
                    }
                    return field;
                };

                return {
                    id: doc.id,
                    productId: data.productId,
                    productName: productsMap[data.productId]?.name || '不明な商品',
                    shopShortName: data.shopShortName || '',
                    status: data.status,
                    applyMethod: data.applyMethod,
                    applyStart: convertTimestamp(data.applyStart),
                    applyEnd: convertTimestamp(data.applyEnd),
                    resultDate: convertTimestamp(data.resultDate),
                    purchaseStart: convertTimestamp(data.purchaseStart),
                    purchaseEnd: convertTimestamp(data.purchaseEnd),
                    purchaseDate: convertTimestamp(data.purchaseDate),
                    url: data.url || '',
                    memo: data.memo || '',
                    purchaseMembers: purchaseMembers,
                };
            })
        );

        return NextResponse.json(entries);
    } catch (error) {
        console.error('全抽選情報の取得に失敗しました:', error);
        return NextResponse.json(
            {
                error: '全抽選情報の取得に失敗しました',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
