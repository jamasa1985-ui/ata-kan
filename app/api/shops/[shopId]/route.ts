import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

type RouteContext = {
    params: Promise<{ shopId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
    try {
        const { shopId } = await context.params;
        const docRef = adminDb.collection('shops').doc(shopId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 });
        }

        return NextResponse.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Error fetching shop:', error);
        return NextResponse.json({ error: '店舗情報の取得に失敗しました' }, { status: 500 });
    }
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        const { shopId } = await context.params;
        const body = await request.json();

        if (!body.name) {
            return NextResponse.json({ error: '店舗名は必須です' }, { status: 400 });
        }

        const docRef = adminDb.collection('shops').doc(shopId);

        const updateData = {
            ...body,
            updatedAt: new Date().toISOString(), // 既存に合わせてISO文字列
        };
        delete updateData.id; // IDは更新しない

        await docRef.set(updateData, { merge: true });

        return NextResponse.json({ message: '店舗情報を更新しました' });
    } catch (error) {
        console.error('Error updating shop:', error);
        return NextResponse.json({ error: '店舗情報の更新に失敗しました' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    try {
        const { shopId } = await context.params;
        await adminDb.collection('shops').doc(shopId).delete();
        return NextResponse.json({ message: '店舗を削除しました' });
    } catch (error) {
        console.error('Error deleting shop:', error);
        return NextResponse.json({ error: '店舗の削除に失敗しました' }, { status: 500 });
    }
}
