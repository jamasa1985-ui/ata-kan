'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../../_components/Header';

export type ProductRelation = {
    code: string;
    name: string;
    shortName: string;
    price: number;
    quantity: number;
    amount?: number; // Calculated or stored
};

export type ProductFormData = {
    name: string;
    shortName: string;
    displayFlag: boolean;
    releaseDate: string; // YYYY-MM-DD
    productRelations: ProductRelation[];
};

type Props = {
    initialData?: ProductFormData;
    isEdit?: boolean;
    productId?: string;
    onSubmit: (data: ProductFormData) => Promise<void>;
    onDelete?: () => Promise<void>;
};

export default function ProductForm({ initialData, isEdit, productId, onSubmit, onDelete }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<ProductFormData>(initialData || {
        name: '',
        shortName: '',
        displayFlag: true,
        releaseDate: '',
        productRelations: [],
    });

    // フォーム送信ハンドラ
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm(isEdit ? '更新してもよろしいですか？' : '登録してもよろしいですか？')) return;

        setLoading(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error(error);
            alert('エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        if (!confirm('本当に削除しますか？この操作は取り消せません。')) return;

        setLoading(true);
        try {
            await onDelete();
        } catch (error) {
            console.error(error);
            alert('削除エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    // Relation操作
    const addRelation = () => {
        setFormData(prev => ({
            ...prev,
            productRelations: [
                ...prev.productRelations,
                { code: '', name: '', shortName: '', price: 0, quantity: 1 }
            ]
        }));
    };

    const updateRelation = (index: number, field: keyof ProductRelation, value: any) => {
        const newRelations = [...formData.productRelations];
        newRelations[index] = { ...newRelations[index], [field]: value };
        // 金額自動計算
        newRelations[index].amount = newRelations[index].price * newRelations[index].quantity;
        setFormData(prev => ({ ...prev, productRelations: newRelations }));
    };

    const removeRelation = (index: number) => {
        if (!confirm('この関連商品を削除しますか？')) return;
        const newRelations = [...formData.productRelations];
        newRelations.splice(index, 1);
        setFormData(prev => ({ ...prev, productRelations: newRelations }));
    };

    return (
        <form onSubmit={handleSubmit} style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '40px', paddingTop: '80px', fontFamily: 'system-ui, sans-serif', color: '#000' }}>
            <Header
                title={isEdit ? '商品編集' : '商品登録'}
                backLinkText="一覧に戻る"
                backLinkHref="/master/products"
                maxWidth="600px"
                rightContent={isEdit && (
                    <div style={{ fontSize: '12px', color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                        ID: <span style={{ fontFamily: 'monospace' }}>{productId}</span>
                    </div>
                )}
            />

            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                    {/* 基本情報 */}
                    <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '8px', marginBottom: '16px', fontSize: '16px', fontWeight: 'bold', color: '#1e90ff' }}>基本情報</h3>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>商品名 <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '16px', color: '#000' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>略称</label>
                            <input
                                type="text"
                                value={formData.shortName}
                                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', color: '#000' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>発売日</label>
                            <input
                                type="date"
                                value={formData.releaseDate}
                                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', color: '#000' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
                        <input
                            type="checkbox"
                            checked={formData.displayFlag}
                            onChange={(e) => setFormData({ ...formData, displayFlag: e.target.checked })}
                            style={{ transform: 'scale(1.2)', marginRight: '8px' }}
                        />
                        <label style={{ fontWeight: 'bold', fontSize: '14px' }}>表示フラグ（有効にする）</label>
                    </div>
                </div>

                {/* 関連商品 (Relations) */}
                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '8px', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e90ff' }}>購入種別（関連商品）</h3>
                        <button type="button" onClick={addRelation} style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>+ 追加</button>
                    </div>

                    {formData.productRelations.length === 0 ? (
                        <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>登録された種別はありません</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {formData.productRelations.map((rel, idx) => (
                                <div key={idx} style={{ border: '1px solid #eee', padding: '16px', borderRadius: '4px', backgroundColor: '#f9f9f9', position: 'relative' }}>
                                    <button
                                        type="button"
                                        onClick={() => removeRelation(idx)}
                                        style={{ position: 'absolute', top: '8px', right: '8px', color: '#999', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                                    >×</button>

                                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>コード</label>
                                            <input type="text" value={rel.code} onChange={(e) => updateRelation(idx, 'code', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', color: '#000' }} placeholder="1" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>名称</label>
                                            <input type="text" value={rel.name} onChange={(e) => updateRelation(idx, 'name', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', color: '#000' }} placeholder="OOパック" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>略称</label>
                                            <input type="text" value={rel.shortName} onChange={(e) => updateRelation(idx, 'shortName', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', color: '#000' }} placeholder="P" />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>単価</label>
                                            <input type="number" value={rel.price} onChange={(e) => updateRelation(idx, 'price', Number(e.target.value))} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', color: '#000' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>数量</label>
                                            <input type="number" value={rel.quantity} onChange={(e) => updateRelation(idx, 'quantity', Number(e.target.value))} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', color: '#000' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>金額</label>
                                            <div style={{ padding: '6px', backgroundColor: '#eee', borderRadius: '4px', color: '#000', textAlign: 'right' }}>
                                                {(rel.price * rel.quantity).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '40px', paddingBottom: '40px' }}>
                    <Link href="/master/products">
                        <button type="button" style={{ padding: '12px 24px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', color: '#333' }}>キャンセル</button>
                    </Link>
                    {isEdit && onDelete && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            style={{ padding: '12px 24px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            削除
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{ padding: '12px 48px', backgroundColor: '#1e90ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {loading ? '処理中...' : (isEdit ? '更新する' : '登録する')}
                    </button>
                </div>
            </div>
        </form>
    );
}
