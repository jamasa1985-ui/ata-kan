'use client';

import { useRouter } from 'next/navigation';
import ProductForm, { ProductFormData } from '../_components/ProductForm';

export default function CreateProductPage() {
    const router = useRouter();

    const handleCreate = async (data: ProductFormData) => {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '登録に失敗しました');
        }

        alert('商品を登録しました');
        router.push('/master/products');
        router.refresh();
    };

    return <ProductForm onSubmit={handleCreate} />;
}
