// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const all = searchParams.get('all') === 'true';

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

                // all=trueの場合は日付フィルタをスキップ
                if (all) return true;

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

// 商品登録 (POST)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 必須項目のバリデーション
        if (!body.name) {
            return NextResponse.json(
                { error: '商品名は必須です' },
                { status: 400 }
            );
        }

        const data: any = {
            ...body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (data.releaseDate) {
            data.releaseDate = new Date(data.releaseDate);
        }

        const productsRef = adminDb.collection('products');

        const newId = await adminDb.runTransaction(async (t) => {
            const { getNextSequence } = await import('@/lib/sequence');
            const docId = await getNextSequence(t, 'product');
            const newDocRef = productsRef.doc(docId);
            t.set(newDocRef, data);
            return docId;
        });

        return NextResponse.json({ id: newId, message: '商品を登録しました' }, { status: 201 });

    } catch (error) {
        console.error('商品の登録に失敗しました:', error);
        return NextResponse.json(
            {
                error: '商品の登録に失敗しました',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
