'use client';

import { useState, useEffect, useMemo } from 'react';
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
    const [allShops, setAllShops] = useState<Shop[]>([]);
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

    useEffect(() => {
        const fetchShops = async () => {
            try {
                const res = await fetch('/api/shops');
                if (res.ok) {
                    const data = await res.json();
                    setAllShops(data);
                }
            } catch (error) {
                console.error('店舗情報の取得に失敗しました:', error);
            }
        };
        fetchShops();
    }, []);

    const similarShops = useMemo(() => {
        if (!formData.name) return [];

        // 正規化関数：NFKC(半角カナ→全角、全角英数→半角) + 小文字化 + 空白除去
        const normalize = (str: string) =>
            str.normalize('NFKC').toLowerCase().replace(/[\s　]+/g, '');

        const normalizedInput = normalize(formData.name);
        if (!normalizedInput) return [];

        return allShops.filter(s => {
            // 自分自身は除外（編集時）
            if (isEdit && s.id === shopId) return false;

            const normalizedBase = normalize(s.name);
            // 完全一致または部分一致
            return normalizedBase.includes(normalizedInput) || normalizedInput.includes(normalizedBase);
        });
    }, [formData.name, allShops, isEdit, shopId]);

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

                        {similarShops.length > 0 && (
                            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '4px', fontSize: '13px', color: '#856404' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>類似・重複する店舗が既に登録されています：</div>
                                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                    {similarShops.map(s => (
                                        <li key={s.id}>
                                            <span style={{ fontWeight: 'bold' }}>{s.name}</span> {s.shortName ? `(${s.shortName})` : ''}
                                            <span style={{ marginLeft: '8px', fontSize: '11px', color: '#666' }}>[ID: {s.id}]</span>
                                        </li>
                                    ))}
                                </ul>
                                <div style={{ marginTop: '4px', fontSize: '11px' }}>※入力ミスや二重登録にご注意ください。</div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>略称</label>
                            <input type="text" value={formData.shortName} onChange={(e) => setFormData({ ...formData, shortName: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', color: '#000' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>表示順</label>
                            <input type="number" value={formData.order === 0 ? '' : formData.order} onChange={(e) => setFormData({ ...formData, order: e.target.value === '' ? 0 : Number(e.target.value) })} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', color: '#000' }} placeholder="0" />
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

                    {/* 応募期間 */}
                    <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#28a745' }}>応募期間</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>開始日 (相対日数)</label>
                                    <input type="number" value={formData.applyStartDate === 0 ? '' : (formData.applyStartDate ?? '')} onChange={(e) => setFormData({ ...formData, applyStartDate: e.target.value === '' ? 0 : Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} placeholder="0" />
                                </div>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>開始時間</label>
                                    <input type="time" value={formData.applyStartTime || ''} onChange={(e) => setFormData({ ...formData, applyStartTime: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>終了日 (相対日数)</label>
                                    <input type="number" value={formData.applyEndDate === 0 ? '' : (formData.applyEndDate ?? '')} onChange={(e) => setFormData({ ...formData, applyEndDate: e.target.value === '' ? 0 : Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} placeholder="0" />
                                </div>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>終了時間</label>
                                    <input type="time" value={formData.applyEndTime || ''} onChange={(e) => setFormData({ ...formData, applyEndTime: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 結果発表 */}
                    <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#ffc107' }}>結果発表</div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '140px' }}>
                                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>発表日 (相対日数)</label>
                                <input type="number" value={formData.resultDate === 0 ? '' : (formData.resultDate ?? '')} onChange={(e) => setFormData({ ...formData, resultDate: e.target.value === '' ? 0 : Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} placeholder="0" />
                            </div>
                            <div style={{ flex: 1, minWidth: '140px' }}>
                                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>発表時間</label>
                                <input type="time" value={formData.resultTime || ''} onChange={(e) => setFormData({ ...formData, resultTime: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                    </div>

                    {/* 購入期間 */}
                    <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e90ff' }}>購入期間</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>開始日 (相対日数)</label>
                                    <input type="number" value={formData.purchaseStartDate === 0 ? '' : (formData.purchaseStartDate ?? '')} onChange={(e) => setFormData({ ...formData, purchaseStartDate: e.target.value === '' ? 0 : Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} placeholder="0" />
                                </div>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>開始時間</label>
                                    <input type="time" value={formData.purchaseStartTime || ''} onChange={(e) => setFormData({ ...formData, purchaseStartTime: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>終了日 (相対日数)</label>
                                    <input type="number" value={formData.purchaseEndDate === 0 ? '' : (formData.purchaseEndDate ?? '')} onChange={(e) => setFormData({ ...formData, purchaseEndDate: e.target.value === '' ? 0 : Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} placeholder="0" />
                                </div>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>終了時間</label>
                                    <input type="time" value={formData.purchaseEndTime || ''} onChange={(e) => setFormData({ ...formData, purchaseEndTime: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons (Fixed) */}
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    backgroundColor: '#1e90ff', padding: '12px',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10,
                    boxShadow: '0 -2px 4px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Link href="/master/shops">
                                <button type="button" style={{ padding: '8px 16px', backgroundColor: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#333', fontWeight: 'bold' }}>キャンセル</button>
                            </Link>
                            {isEdit && onDelete && (
                                <button type="button" onClick={handleDelete} disabled={loading} style={{ padding: '8px 16px', backgroundColor: '#fff', color: '#dc3545', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>削除</button>
                            )}
                        </div>
                        <button type="submit" disabled={loading} style={{ padding: '8px 24px', backgroundColor: '#fff', color: '#1e90ff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{loading ? '処理中...' : (isEdit ? '更新' : '登録')}</button>
                    </div>
                </div>
            </div>
        </form>
    );
}
