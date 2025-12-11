import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

type RouteContext = {
    params: Promise<{ memberId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
    try {
        const { memberId } = await context.params;
        const docRef = adminDb.collection('members').doc(memberId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 });
        }

        return NextResponse.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Error fetching member:', error);
        return NextResponse.json({ error: 'メンバー情報の取得に失敗しました' }, { status: 500 });
    }
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        const { memberId } = await context.params;
        const body = await request.json();

        if (!body.name) {
            return NextResponse.json({ error: 'メンバー名は必須です' }, { status: 400 });
        }

        const docRef = adminDb.collection('members').doc(memberId);

        const updateData = {
            ...body,
            order: body.order ? Number(body.order) : 999,
            updatedAt: new Date().toISOString(),
        };
        delete updateData.id;

        await docRef.set(updateData, { merge: true });

        return NextResponse.json({ message: 'メンバー情報を更新しました' });
    } catch (error) {
        console.error('Error updating member:', error);
        return NextResponse.json({ error: 'メンバー情報の更新に失敗しました' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    try {
        const { memberId } = await context.params;
        await adminDb.collection('members').doc(memberId).delete();
        return NextResponse.json({ message: 'メンバーを削除しました' });
    } catch (error) {
        console.error('Error deleting member:', error);
        return NextResponse.json({ error: 'メンバーの削除に失敗しました' }, { status: 500 });
    }
}
