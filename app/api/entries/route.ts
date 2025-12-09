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
            productCode: body.productId, // Map productId -> productCode
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const { purchaseMembers, ...entryData } = newEntry;

        // Transaction for Sequence ID generation and Atomic Write
        const newEntryId = await adminDb.runTransaction(async (t) => {
            // Get sequence doc (assume single doc or take first)
            const seqSnapshot = await t.get(entriesSeqRef.limit(1));
            if (seqSnapshot.empty) {
                throw new Error('Entries sequence not initialized');
            }
            const seqDoc = seqSnapshot.docs[0];
            const currentSeq = seqDoc.data().seq;
            if (typeof currentSeq !== 'number') {
                throw new Error('Invalid sequence format');
            }

            const nextSeq = currentSeq + 1;
            const docId = currentSeq.toString();

            const newDocRef = entriesRef.doc(docId);

            // 1. Update Sequence
            t.update(seqDoc.ref, { seq: nextSeq });

            // 2. Create Entry
            t.set(newDocRef, entryData);

            // 3. Create Status=0 Members (as Subcollection)
            if (purchaseMembers && Array.isArray(purchaseMembers)) {
                purchaseMembers.forEach((member: any) => {
                    // Use member.id as doc ID if available
                    const memberId = member.id || adminDb.collection('_').doc().id; // generate ID if missing
                    const memberDocRef = newDocRef.collection('purchaseMembers').doc(memberId);

                    const memberData = {
                        ...member,
                        status: member.status !== undefined ? member.status : 0
                    };
                    t.set(memberDocRef, memberData);
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
