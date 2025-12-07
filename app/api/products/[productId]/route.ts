import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

type RouteContext = {
    params: Promise<{ productId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
    try {
        const { productId } = await context.params;

        const docRef = adminDb.collection('products').doc(productId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json(
                { error: '商品が見つかりません' },
                { status: 404 }
            );
        }

        const data = doc.data();
        let releaseDate: Date | null = null;
        if (data?.releaseDate) {
            if (typeof data.releaseDate.toDate === 'function') {
                releaseDate = data.releaseDate.toDate();
            } else if (typeof data.releaseDate === 'string') {
                releaseDate = new Date(data.releaseDate);
            }
        }

        const product = {
            id: doc.id,
            name: data?.name || '',
            displayFlag: data?.displayFlag,
            releaseDate: releaseDate,
        };

        return NextResponse.json(product);
    } catch (error) {
        console.error('商品情報の取得に失敗しました:', error);
        return NextResponse.json(
            { error: '商品情報の取得に失敗しました' },
            { status: 500 }
        );
    }
}
