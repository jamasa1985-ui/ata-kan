'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ShopForm, { ShopFormData } from '../_components/ShopForm';

type Params = Promise<{ id: string }>;

export default function EditShopPage({ params }: { params: Params }) {
    const { id } = use(params);
    const router = useRouter();
    const [initialData, setInitialData] = useState<ShopFormData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/shops/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setInitialData({
                        name: data.name,
                        shortName: data.shortName || '',
                        displayFlag: data.displayFlag ?? true,
                        order: data.order || 999,
                        address: data.address || '',
                        purchaseStartDate: data.purchaseStartDate || '',
                        purchaseStartTime: data.purchaseStartTime || '',
                        purchaseEndDate: data.purchaseEndDate || '',
                        purchaseEndTime: data.purchaseEndTime || '',
                        applyStartDate: data.applyStartDate || '',
                        applyStartTime: data.applyStartTime || '',
                        applyEndDate: data.applyEndDate || '',
                        applyEndTime: data.applyEndTime || '',
                        resultDate: data.resultDate || '',
                        resultTime: data.resultTime || '',
                    });
                } else {
                    alert('データの取得に失敗しました');
                    router.push('/master/shops');
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, router]);

    const handleUpdate = async (data: ShopFormData) => {
        const response = await fetch(`/api/shops/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('更新に失敗しました');
        alert('店舗を更新しました');
        router.push('/master/shops');
        router.refresh();
    };

    const handleDelete = async () => {
        const response = await fetch(`/api/shops/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('削除に失敗しました');
        alert('店舗を削除しました');
        router.push('/master/shops');
        router.refresh();
    };

    if (loading) return <div>Loading...</div>;
    if (!initialData) return <div>No Data</div>;

    return <ShopForm initialData={initialData} isEdit={true} shopId={id} onSubmit={handleUpdate} onDelete={handleDelete} />;
}
