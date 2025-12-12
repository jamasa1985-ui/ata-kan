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
                shortName: data.shortName || '',
                order: data.order || 999,
                displayFlag: data.displayFlag !== undefined ? data.displayFlag : 1,
                address: data.住所 || data.address || '',
                // Pass through new fields
                purchaseStartDate: data.purchaseStartDate,
                purchaseStartTime: data.purchaseStartTime,
                purchaseEndDate: data.purchaseEndDate,
                purchaseEndTime: data.purchaseEndTime,
                applyStartDate: data.applyStartDate,
                applyStartTime: data.applyStartTime,
                applyEndDate: data.applyEndDate,
                applyEndTime: data.applyEndTime,
                resultDate: data.resultDate,
                resultTime: data.resultTime,
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
            displayFlag: body.displayFlag !== undefined ? Number(body.displayFlag) : 1,
            住所: body.address || '', // Map address back to 住所 for Firestore
            // Ensure numbers
            purchaseStartDate: body.purchaseStartDate ? Number(body.purchaseStartDate) : null,
            purchaseEndDate: body.purchaseEndDate ? Number(body.purchaseEndDate) : null,
            applyStartDate: body.applyStartDate ? Number(body.applyStartDate) : null,
            applyEndDate: body.applyEndDate ? Number(body.applyEndDate) : null,
            resultDate: body.resultDate ? Number(body.resultDate) : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // Remove 'address' from data to avoid duplication if we want consistent schema, 
        // but '...body' includes it. It's fine to have both or clean it. 
        // Let's rely on Firestore ignoring undefined if we didn't include it, but ...body includes it.
        // I'll leave it as is, or delete it? Firestore is schemaless. 
        // Better to be clean.
        delete data.address;

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
