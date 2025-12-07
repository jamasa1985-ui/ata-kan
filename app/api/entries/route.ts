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

        // Prepare data
        // Explicitly map productId to productCode as per existing schema
        const newEntry = {
            ...body,
            productCode: body.productId, // Map productId -> productCode
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Remove ephemeral fields if necessary, or just save all
        // Ideally we should sanitize but sticking to flexible schema for now

        const docRef = await entriesRef.add(newEntry);

        return NextResponse.json({
            success: true,
            message: 'Entry created',
            id: docRef.id
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating entry:', error);
        return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
    }
}
