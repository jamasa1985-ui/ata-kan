'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import MemberForm, { MemberFormData } from '../_components/MemberForm';

type Params = Promise<{ id: string }>;

export default function EditMemberPage({ params }: { params: Params }) {
    const { id } = use(params);
    const router = useRouter();
    const [initialData, setInitialData] = useState<MemberFormData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/members/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setInitialData({
                        name: data.name,
                        shortName: data.shortName || '',
                        displayFlag: data.displayFlag ?? true,
                        order: data.order || 999,
                        primaryFlg: data.primaryFlg ?? false,
                    });
                } else {
                    alert('データの取得に失敗しました');
                    router.push('/master/members');
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, router]);

    const handleUpdate = async (data: MemberFormData) => {
        const response = await fetch(`/api/members/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('更新に失敗しました');
        alert('メンバー情報を更新しました');
        router.push('/master/members');
        router.refresh();
    };

    const handleDelete = async () => {
        const response = await fetch(`/api/members/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('削除に失敗しました');
        alert('メンバーを削除しました');
        router.push('/master/members');
        router.refresh();
    };

    if (loading) return <div>Loading...</div>;
    if (!initialData) return <div>No Data</div>;

    return <MemberForm initialData={initialData} isEdit={true} memberId={id} onSubmit={handleUpdate} onDelete={handleDelete} />;
}
