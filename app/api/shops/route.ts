import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';

export async function GET() {
    try {
        const shopsRef = adminDb.collection('shops');
        // Fetch all shops
        const snapshot = await shopsRef.get();

        const shops = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || '',
                order: data.order || 999,
                ...data
            };
        });

        // Sort by order, then name
        shops.sort((a: any, b: any) => a.order - b.order || a.name.localeCompare(b.name));

        return NextResponse.json(shops);
    } catch (error) {
        console.error('Error fetching shops:', error);
        return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.name) {
            return NextResponse.json({ error: '店舗名は必須です' }, { status: 400 });
        }

        const data = {
            ...body,
            order: body.order ? Number(body.order) : 999,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const shopsRef = adminDb.collection('shops');

        const newId = await adminDb.runTransaction(async (t) => {
            const { getNextSequence } = await import('@/lib/sequence');
            const docId = await getNextSequence(t, 'shop');
            const newDocRef = shopsRef.doc(docId);
            t.set(newDocRef, data);
            return docId;
        });

        return NextResponse.json({ id: newId, message: '店舗を登録しました' }, { status: 201 });
    } catch (error) {
        console.error('店舗の登録に失敗しました:', error);
        return NextResponse.json({ error: '店舗の登録に失敗しました' }, { status: 500 });
    }
}
