// app/api/products/past/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const productsRef = adminDb.collection('products');
        const snapshot = await productsRef.get();

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
                // 発売日がない商品は除外
                if (!product.releaseDate) return false;

                // 発売から14日経過した商品のみ (displayFlagに関係なく)
                const fourteenDaysAgo = new Date();
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

                return product.releaseDate < fourteenDaysAgo;
            })
            .sort((a, b) => {
                // 発売日の新しい順でソート
                if (!a.releaseDate && !b.releaseDate) return 0;
                if (!a.releaseDate) return 1;
                if (!b.releaseDate) return -1;
                return b.releaseDate.getTime() - a.releaseDate.getTime();
            });

        return NextResponse.json(products);
    } catch (error) {
        console.error('過去商品データの取得に失敗しました:', error);
        return NextResponse.json(
            {
                error: '過去商品データの取得に失敗しました',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
