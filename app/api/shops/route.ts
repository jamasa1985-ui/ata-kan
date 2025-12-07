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
