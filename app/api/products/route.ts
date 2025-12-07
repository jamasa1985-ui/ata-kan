// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const productsRef = adminDb.collection('products');
        const snapshot = await productsRef.get();

        const now = new Date();
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(now.getDate() - 14);

        const products = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                let releaseDate: Date | null = null;

                if (data.releaseDate) {
                    // Firestore Timestamp
                    if (typeof data.releaseDate.toDate === 'function') {
                        releaseDate = data.releaseDate.toDate();
                    }
                    // String (ISO format etc)
                    else if (typeof data.releaseDate === 'string') {
                        releaseDate = new Date(data.releaseDate);
                    }
                }

                return {
                    id: doc.id,
                    name: data.name || '',
                    displayFlag: data.displayFlag,
                    releaseDate: releaseDate,
                };
            })
            .filter((product) => {
                if (!product.displayFlag) return false;
                if (!product.releaseDate) return false;

                // 発売から14日以降（未来の日付も含む）
                return product.releaseDate >= fourteenDaysAgo;
            });

        return NextResponse.json(products);
    } catch (error) {
        console.error('商品データの取得に失敗しました:', error);
        return NextResponse.json(
            {
                error: '商品データの取得に失敗しました',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
