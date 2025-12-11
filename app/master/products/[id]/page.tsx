'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm, { ProductFormData } from '../_components/ProductForm';

// Next.js 15+ compatible params handling
type Params = Promise<{ id: string }>;

export default function EditProductPage({ params }: { params: Params }) {
    // Unwrap params using React.use()
    const { id } = use(params);
    const router = useRouter();
    const [initialData, setInitialData] = useState<ProductFormData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/products/${id}`);
                if (res.ok) {
                    const data = await res.json();

                    // 日付変換 (YYYY-MM-DD)
                    let releaseDate = '';
                    if (data.releaseDate) {
                        const d = new Date(data.releaseDate);
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        releaseDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                    }

                    setInitialData({
                        name: data.name,
                        shortName: data.shortName || '',
                        displayFlag: data.displayFlag ?? true,
                        releaseDate: releaseDate,
                        productRelations: data.productRelations || [],
                    });
                } else {
                    alert('データの取得に失敗しました');
                    router.push('/master/products');
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, router]);

    const handleUpdate = async (data: ProductFormData) => {
        const response = await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('更新に失敗しました');
        }

        alert('商品を更新しました');
        router.push('/master/products');
        router.refresh();
    };

    const handleDelete = async () => {
        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('削除に失敗しました');
        }

        alert('商品を削除しました');
        router.push('/master/products');
        router.refresh();
    };

    if (loading) return <div style={{ padding: 20 }}>読み込み中...</div>;
    if (!initialData) return <div style={{ padding: 20 }}>データがありません</div>;

    return (
        <ProductForm
            initialData={initialData}
            isEdit={true}
            productId={id}
            onSubmit={handleUpdate}
            onDelete={handleDelete}
        />
    );
}
