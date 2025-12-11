'use client';

import { useRouter } from 'next/navigation';
import ShopForm, { ShopFormData } from '../_components/ShopForm';

export default function CreateShopPage() {
    const router = useRouter();

    const handleCreate = async (data: ShopFormData) => {
        const response = await fetch('/api/shops', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('登録に失敗しました');
        }

        alert('店舗を登録しました');
        router.push('/master/shops');
        router.refresh();
    };

    return <ShopForm onSubmit={handleCreate} />;
}
