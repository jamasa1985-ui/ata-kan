import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

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
            productRelations: data?.productRelations || [],
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

export async function PUT(request: Request, context: RouteContext) {
    try {
        const { productId } = await context.params;
        const body = await request.json();

        // 必須項目のバリデーション
        if (!body.name) {
            return NextResponse.json(
                { error: '商品名は必須です' },
                { status: 400 }
            );
        }

        const docRef = adminDb.collection('products').doc(productId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
        }

        const updateData: any = {
            ...body,
            updatedAt: new Date(), // Dateオブジェクトを渡してTimestampとして保存
        };

        // 日付項目の変換
        if (updateData.releaseDate) {
            updateData.releaseDate = new Date(updateData.releaseDate);
        }

        // 不要なフィールド（IDなど）を除外
        delete updateData.id;

        await docRef.update(updateData);

        return NextResponse.json({ message: '商品を更新しました' });
    } catch (error) {
        console.error('商品の更新に失敗しました:', error);
        return NextResponse.json(
            { error: '商品の更新に失敗しました' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    try {
        const { productId } = await context.params;
        const docRef = adminDb.collection('products').doc(productId);

        // 関連チェックが必要かもしれないが、一旦単純削除
        await docRef.delete();

        return NextResponse.json({ message: '商品を削除しました' });
    } catch (error) {
        console.error('商品の削除に失敗しました:', error);
        return NextResponse.json(
            { error: '商品の削除に失敗しました' },
            { status: 500 }
        );
    }
}
