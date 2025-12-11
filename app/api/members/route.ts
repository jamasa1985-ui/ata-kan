import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const membersRef = adminDb.collection('members');
        const snapshot = await membersRef.get(); // Removed orderBy until we are sure field exists

        const members = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json(members);
    } catch (error) {
        console.error('Error fetching members:', error);
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.name) {
            return NextResponse.json({ error: 'メンバー名は必須です' }, { status: 400 });
        }

        const data = {
            ...body,
            order: body.order ? Number(body.order) : 999,
            primaryFlg: !!body.primaryFlg,
            displayFlag: body.displayFlag ?? true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const membersRef = adminDb.collection('members');

        const newId = await adminDb.runTransaction(async (t) => {
            const { getNextSequence } = await import('@/lib/sequence');
            const docId = await getNextSequence(t, 'member');
            const newDocRef = membersRef.doc(docId);
            t.set(newDocRef, data);
            return docId;
        });

        return NextResponse.json({ id: newId, message: 'メンバーを登録しました' }, { status: 201 });
    } catch (error) {
        console.error('メンバーの登録に失敗しました:', error);
        return NextResponse.json({ error: 'メンバーの登録に失敗しました' }, { status: 500 });
    }
}
