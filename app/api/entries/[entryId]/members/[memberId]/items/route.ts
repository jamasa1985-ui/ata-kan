import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

type PurchaseItem = {
    code: string;
    shortName: string;
    quantity: number;
    amount: number;
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ entryId: string; memberId: string }> }
) {
    try {
        const { entryId, memberId } = await params;

        const itemsRef = adminDb
            .collection('entries')
            .doc(entryId)
            .collection('purchaseMembers')
            .doc(memberId)
            .collection('purchaseItems');

        const snapshot = await itemsRef.get();
        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({ items });

    } catch (error) {
        console.error('Error fetching purchase items:', error);
        return NextResponse.json({ error: 'Failed to fetch purchase items' }, { status: 500 });
    }
}



export async function PUT(
    request: Request,
    { params }: { params: Promise<{ entryId: string; memberId: string }> }
) {
    try {
        const { entryId, memberId } = await params;
        const body = await request.json();
        const { items } = body as { items: PurchaseItem[] };

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid items data' }, { status: 400 });
        }

        const memberRef = adminDb
            .collection('entries')
            .doc(entryId)
            .collection('purchaseMembers')
            .doc(memberId);

        const itemsRef = memberRef.collection('purchaseItems');

        // Delete existing items and create new ones (replace operation)
        const batch = adminDb.batch();

        // Get existing items to delete
        const existingItems = await itemsRef.get();
        existingItems.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Add new items
        items.forEach((item) => {
            if (item.quantity > 0) { // Only save items with quantity > 0
                const newItemRef = itemsRef.doc();
                batch.set(newItemRef, {
                    code: item.code,
                    shortName: item.shortName,
                    quantity: item.quantity,
                    amount: item.amount,
                });
            }
        });

        await batch.commit();

        return NextResponse.json({ success: true, message: 'Purchase items updated' });

    } catch (error) {
        console.error('Error updating purchase items:', error);
        return NextResponse.json({ error: 'Failed to update purchase items' }, { status: 500 });
    }
}
