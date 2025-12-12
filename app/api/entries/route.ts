import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';

// POST: Create a new entry
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Basic validation
        if (!body.productId) {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
        }

        const entriesRef = adminDb.collection('entries');
        const entriesSeqRef = adminDb.collection('entriesSeq');

        // Prepare data
        // Explicitly map productId to productCode as per existing schema
        const newEntry = {
            ...body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const { purchaseMembers, ...entryData } = newEntry;

        // Transaction for Sequence ID generation and Atomic Write
        const newEntryId = await adminDb.runTransaction(async (t) => {
            const { getNextSequence } = await import('@/lib/sequence');
            const docId = await getNextSequence(t, 'entry');

            const newDocRef = entriesRef.doc(docId);

            // 2. Create Entry
            t.set(newDocRef, entryData);

            // 3. Create Status=0 Members (as Subcollection)
            if (purchaseMembers && Array.isArray(purchaseMembers)) {
                purchaseMembers.forEach((member: any) => {
                    // Use member.id as doc ID if available
                    const memberId = member.id || adminDb.collection('_').doc().id; // generate ID if missing
                    const memberDocRef = newDocRef.collection('purchaseMembers').doc(memberId);

                    // Extract items from member object
                    const { items, ...memberDataWithoutItems } = member;

                    const memberData = {
                        ...memberDataWithoutItems,
                        status: member.status !== undefined ? member.status : 0
                    };
                    t.set(memberDocRef, memberData);

                    // 4. Create Purchase Items (Subcollection) if exists
                    if (items && Array.isArray(items) && items.length > 0) {
                        const itemsCollectionRef = memberDocRef.collection('purchaseItems');
                        items.forEach((item: any) => {
                            if (item.quantity > 0) {
                                const itemDocRef = itemsCollectionRef.doc(); // Auto-ID
                                t.set(itemDocRef, {
                                    code: item.code,
                                    shortName: item.shortName,
                                    quantity: item.quantity,
                                    amount: item.amount
                                });
                            }
                        });
                    }
                });
            }

            return docId;
        });

        return NextResponse.json({
            success: true,
            message: 'Entry created',
            id: newEntryId
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating entry:', error);
        return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
    }
}
