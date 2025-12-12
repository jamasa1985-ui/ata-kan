import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

type Params = Promise<{ entryId: string }>;

// GET: Fetch a single entry
export async function GET(req: NextRequest, { params }: { params: Params }) {
    try {
        const { entryId } = await params;
        if (!entryId) {
            return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
        }

        const docRef = adminDb.collection('entries').doc(entryId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        const data = doc.data() || {};

        let productName = data.productShortName;
        // If productName is missing, fetch from products collection
        if (!productName && data.productId) {
            const productDoc = await adminDb.collection('products').doc(data.productId).get();
            if (productDoc.exists) {
                const productData = productDoc.data();
                productName = productData?.shortName || productData?.name;
            }
        }

        const entry = {
            id: doc.id,
            ...data,
            // Map fields to match Entry type
            productId: data.productId,
            productName: productName || '商品名不明',
            shopShortName: data.shopShortName || data.storeName || '店舗名なし',
            // Ensure dates are strings or handle them consistent with other APIs if needed
        };

        // Fetch purchaseMembers subcollection
        const membersSnapshot = await docRef.collection('purchaseMembers').get();
        const purchaseMembers = membersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        (entry as any).purchaseMembers = purchaseMembers;

        return NextResponse.json(entry);

    } catch (error) {
        console.error('Error fetching entry:', error);
        return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 });
    }
}

// PUT: Update a single entry
export async function PUT(req: NextRequest, { params }: { params: Params }) {
    try {
        const { entryId } = await params;
        const body = await req.json();

        if (!entryId) {
            return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
        }

        // Validate basic fields if necessary, but keep flexible for now
        // Removing 'id' from body if present to avoid overwrite issues (though Firestore usually ignores it if not effectively used)
        const { id, ...updateData } = body;

        // Add updatedAt timestamp
        const finalUpdateData = {
            ...updateData,
            updatedAt: new Date().toISOString(), // Or use admin.firestore.FieldValue.serverTimestamp() if preferred, but string is easier for now
        };

        const { purchaseMembers, ...firestoreData } = finalUpdateData;

        await adminDb.collection('entries').doc(entryId).update(firestoreData);

        // Update purchaseMembers subcollection
        if (purchaseMembers && Array.isArray(purchaseMembers)) {
            const membersRef = adminDb.collection('entries').doc(entryId).collection('purchaseMembers');

            // Get existing members to determine edits/deletes
            const existingSnapshot = await membersRef.get();
            const batch = adminDb.batch();
            const incomingIds = new Set(purchaseMembers.map((m: any) => m.id));

            // Delete members not in incoming list
            existingSnapshot.docs.forEach(doc => {
                if (!incomingIds.has(doc.id)) {
                    batch.delete(doc.ref);
                }
            });

            // Set/Update incoming members
            purchaseMembers.forEach((member: any) => {
                if (member.id) {
                    const memberData = {
                        ...member,
                        status: member.status !== undefined ? member.status : 0
                    };
                    batch.set(membersRef.doc(member.id), memberData, { merge: true });
                }
            });

            await batch.commit();
        }

        return NextResponse.json({ success: true, message: 'Entry updated' });

    } catch (error) {
        console.error('Error updating entry:', error);
        return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
    }
}

// DELETE: Delete a single entry
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
    try {
        const { entryId } = await params;
        if (!entryId) {
            return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
        }

        await adminDb.collection('entries').doc(entryId).delete();

        return NextResponse.json({ success: true, message: 'Entry deleted' });

    } catch (error) {
        console.error('Error deleting entry:', error);
        return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
    }
}
