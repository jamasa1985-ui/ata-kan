'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '../../../_components/Header';

// ... imports
import { Shop } from '../../../data';

export type ShopFormData = Omit<Shop, 'id'>;

type Props = {
    initialData?: ShopFormData;
    isEdit?: boolean;
    shopId?: string;
    onSubmit: (data: ShopFormData) => Promise<void>;
    onDelete?: () => Promise<void>;
};

export default function ShopForm({ initialData, isEdit, shopId, onSubmit, onDelete }: Props) {
    const [loading, setLoading] = useState(false);
    // Explicitly cast or construct initial state
    const [formData, setFormData] = useState<ShopFormData>(initialData || {
        name: '',
        shortName: '',
        displayFlag: 1, // Default to 1 (Show)
        order: 999,
        address: '',
        purchaseStartDate: 0,
        purchaseStartTime: '',
        purchaseEndDate: 0,
        purchaseEndTime: '',
        applyStartDate: 0,
        applyStartTime: '',
        applyEndDate: 0,
        applyEndTime: '',
        resultDate: 0,
        resultTime: '',
    });

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

    return (
        <form onSubmit={handleSubmit} style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '40px', paddingTop: '80px', fontFamily: 'system-ui, sans-serif', color: '#000' }}>
            <Header
                title={isEdit ? '店舗編集' : '店舗登録'}
                backLinkText="一覧に戻る"
                backLinkHref="/master/shops"
                maxWidth="600px"
                rightContent={isEdit && (
                    <div style={{ fontSize: '12px', color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                        ID: <span style={{ fontFamily: 'monospace' }}>{shopId}</span>
                    </div>
                )}
            />

            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                    <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '8px', marginBottom: '16px', fontSize: '16px', fontWeight: 'bold', color: '#1e90ff' }}>基本情報</h3>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>店舗名 <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '16px', color: '#000' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>略称</label>
                            <input type="text" value={formData.shortName} onChange={(e) => setFormData({ ...formData, shortName: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', color: '#000' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>表示順</label>
                            <input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', color: '#000' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', paddingTop: '24px' }}>
                            <input
                                type="checkbox"
                                checked={formData.displayFlag === 1}
                                onChange={(e) => setFormData({ ...formData, displayFlag: e.target.checked ? 1 : 0 })}
                                style={{ transform: 'scale(1.2)', marginRight: '8px' }}
                            />
                            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>表示フラグ</label>
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>住所</label>
                        <input type="text" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', color: '#000' }} />
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                    <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '8px', marginBottom: '16px', fontSize: '16px', fontWeight: 'bold', color: '#1e90ff' }}>期間・時間設定（日数指定）</h3>

                    {/* 購入期間 */}
                    <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e90ff' }}>購入期間</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>開始日 (相対日数)</label>
                                    <input type="number" value={formData.purchaseStartDate ?? ''} onChange={(e) => setFormData({ ...formData, purchaseStartDate: Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>開始時間</label>
                                    <input type="time" value={formData.purchaseStartTime || ''} onChange={(e) => setFormData({ ...formData, purchaseStartTime: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>終了日 (相対日数)</label>
                                    <input type="number" value={formData.purchaseEndDate ?? ''} onChange={(e) => setFormData({ ...formData, purchaseEndDate: Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>終了時間</label>
                                    <input type="time" value={formData.purchaseEndTime || ''} onChange={(e) => setFormData({ ...formData, purchaseEndTime: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 応募期間 */}
                    <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#28a745' }}>応募期間</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>開始日 (相対日数)</label>
                                    <input type="number" value={formData.applyStartDate ?? ''} onChange={(e) => setFormData({ ...formData, applyStartDate: Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>開始時間</label>
                                    <input type="time" value={formData.applyStartTime || ''} onChange={(e) => setFormData({ ...formData, applyStartTime: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>終了日 (相対日数)</label>
                                    <input type="number" value={formData.applyEndDate ?? ''} onChange={(e) => setFormData({ ...formData, applyEndDate: Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>終了時間</label>
                                    <input type="time" value={formData.applyEndTime || ''} onChange={(e) => setFormData({ ...formData, applyEndTime: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 結果発表 */}
                    <div style={{ padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#ffc107' }}>結果発表</div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '140px' }}>
                                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>発表日 (相対日数)</label>
                                <input type="number" value={formData.resultDate ?? ''} onChange={(e) => setFormData({ ...formData, resultDate: Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: '140px' }}>
                                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>発表時間</label>
                                <input type="time" value={formData.resultTime || ''} onChange={(e) => setFormData({ ...formData, resultTime: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '40px', paddingBottom: '40px' }}>
                    <Link href="/master/shops">
                        <button type="button" style={{ padding: '12px 24px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', color: '#333' }}>キャンセル</button>
                    </Link>
                    {isEdit && onDelete && (
                        <button type="button" onClick={handleDelete} disabled={loading} style={{ padding: '12px 24px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>削除</button>
                    )}
                    <button type="submit" disabled={loading} style={{ padding: '12px 48px', backgroundColor: '#1e90ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{loading ? '処理中...' : (isEdit ? '更新する' : '登録する')}</button>
                </div>
            </div>
        </form>
    );
}
