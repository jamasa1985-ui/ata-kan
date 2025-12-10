import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ entryId: string }> }
) {
    try {
        const { entryId } = await params;
        const body = await request.json();
        const { members } = body;

        if (!members || !Array.isArray(members)) {
            return NextResponse.json({ error: 'Invalid members data' }, { status: 400 });
        }

        const entryRef = adminDb.collection('entries').doc(entryId);
        const membersRef = entryRef.collection('purchaseMembers');

        // Batch write for efficiency
        const batch = adminDb.batch();


        members.forEach((member: any) => {
            if (member.id) {
                const memberDocRef = membersRef.doc(member.id);
                // Update only status
                batch.set(memberDocRef, { ...member }, { merge: true });
            }
        });

        // Determine new Entry Status
        // New Logic (User requested):
        // 1. Use the LOWEST (youngest) status code
        // 2. Exception: If mixed with 'Not Applied' (0), set to 'Applying' (10)
        // 3. Exclude status 9 (対象外 - Excluded) from calculation

        let newStatus = 0;

        // Filter out excluded members (status 9) and get valid statuses
        const validStatuses = members
            .map((m: any) => Number(m.status || 0))
            .filter((s: number) => s !== 9);

        if (validStatuses.length > 0) {
            const minStatus = Math.min(...validStatuses);
            const hasNotApplied = validStatuses.some((s: number) => s === 0);
            const hasOtherStatus = validStatuses.some((s: number) => s > 0);

            // Exception: If mixed with 'Not Applied' (0) and other statuses
            if (hasNotApplied && hasOtherStatus) {
                newStatus = 10; // Applying
            } else {
                newStatus = minStatus;
            }
        }

        // Auto-set purchaseDate when a member becomes "Purchased" (40)
        const hasPurchasedMember = members.some((m: any) => Number(m.status || 0) === 40);
        const entryDoc = await entryRef.get();
        const currentPurchaseDate = entryDoc.data()?.purchaseDate;

        // Update Entry Status and purchaseDate
        if (hasPurchasedMember && !currentPurchaseDate) {
            batch.update(entryRef, {
                status: newStatus,
                purchaseDate: new Date().toISOString()
            });
        } else {
            batch.update(entryRef, { status: newStatus });
        }

        await batch.commit();

        return NextResponse.json({ success: true, message: 'Members and Entry status updated', newStatus });

    } catch (error) {
        console.error('Error updating members:', error);
        return NextResponse.json({ error: 'Failed to update members' }, { status: 500 });
    }
}
