'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Member } from '../../../data';

type StatusOption = {
    code: number;
    name: string;
    order: number;
};

type Product = {
    id: string;
    name: string;
    displayFlag?: boolean;
};

type EntryForm = {
    productId: string;
    productName: string;
    shopShortName: string;
    status: string;
    applyMethod: string;
    applyStart: string;
    applyEnd: string;
    resultDate: string;
    purchaseStart: string;
    purchaseEnd: string;
    purchaseDate: string;
    purchaseMembers: Member[];
    memo: string;
    url: string;
};

const toDatetimeLocal = (val: string) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function CreateEntryFromScheduleContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get('from');
    const mode = searchParams.get('mode');
    const productIdParam = searchParams.get('productId');

    const [loading, setLoading] = useState(false);
    // ... rest of state
    const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
    const [applyMethodOptions, setApplyMethodOptions] = useState<StatusOption[]>([]);
    const [shopOptions, setShopOptions] = useState<{ id: string, name: string }[]>([]);
    const [productOptions, setProductOptions] = useState<Product[]>([]);

    const handleRedirect = () => {
        if (from === 'schedule') {
            router.push('/schedule');
        } else if (from === 'lotteries') {
            router.push(`/lotteries${mode ? `?mode=${mode}` : ''}`);
        } else if (from === 'purchases') {
            router.push(`/purchases${mode ? `?mode=${mode}` : ''}`);
        } else if (from === 'product-purchases' && productIdParam) {
            router.push(`/products/${productIdParam}/purchases`);
        } else if (productIdParam) {
            router.push(`/products/${productIdParam}`);
        } else {
            router.push('/schedule'); // Default fallback for this page
        }
    };

    const getCurrentHourISO = () => {
        const d = new Date();
        d.setMinutes(0, 0, 0);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const [formData, setFormData] = useState<EntryForm>({
        productId: productIdParam || '',
        productName: '',
        shopShortName: '',
        status: '0',
        applyMethod: '',
        applyStart: getCurrentHourISO(),
        applyEnd: getCurrentHourISO(),
        resultDate: getCurrentHourISO(),
        purchaseStart: getCurrentHourISO(),
        purchaseEnd: getCurrentHourISO(),
        purchaseDate: '',
        purchaseMembers: [],
        memo: '',
        url: '',
    });

    const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState('');

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const response = await fetch('/api/options');
                if (response.ok) {
                    const data = await response.json();
                    if (data.OP002) {
                        const sOpts: StatusOption[] = data.OP002.sort((a: any, b: any) => a.order - b.order);
                        setStatusOptions(sOpts);
                        if (sOpts.length > 0 && !formData.status) {
                            setFormData(prev => ({ ...prev, status: sOpts[0].code.toString() }));
                        }
                    }
                    if (data.OP003) setApplyMethodOptions(data.OP003);
                }
            } catch (error) {
                console.error('Error fetching options:', error);
            }
        };

        const fetchShops = async () => {
            try {
                const response = await fetch('/api/shops');
                if (response.ok) {
                    const data = await response.json();
                    setShopOptions(data);
                }
            } catch (error) {
                console.error('Error fetching shops:', error);
            }
        };

        const fetchMembers = async () => {
            try {
                const res = await fetch('/api/members');
                if (res.ok) {
                    const data: Member[] = await res.json();
                    setAvailableMembers(data);
                    const primaryMembers = data.filter(m => m.primaryFlg).map(m => ({ ...m, status: 0 }));
                    if (primaryMembers.length > 0) {
                        setFormData(prev => ({ ...prev, purchaseMembers: primaryMembers }));
                    }
                }
            } catch (error) {
                console.error('Error fetching members:', error);
            }
        };

        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/products?all=true');
                if (res.ok) {
                    const data: Product[] = await res.json();
                    // displayFlagがtrueの商品のみ、商品コードの降順でソート
                    const filtered = data
                        .filter(p => p.displayFlag === true)
                        .sort((a, b) => b.id.localeCompare(a.id));
                    setProductOptions(filtered);

                    if (productIdParam) {
                        const p = filtered.find(p => p.id === productIdParam);
                        if (p) setFormData(prev => ({ ...prev, productName: p.name }));
                    }
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            }
        };

        fetchOptions();
        fetchShops();
        fetchMembers();
        fetchProducts();
    }, [productIdParam]);

    const handleRegister = async () => {
        if (!formData.productId) {
            alert('商品を選択してください');
            return;
        }

        if (!confirm('登録してもよろしいですか？')) return;
        setLoading(true);

        try {
            const payload = {
                ...formData,
                status: Number(formData.status),
                applyStart: formData.applyStart ? new Date(formData.applyStart).toISOString() : null,
                applyEnd: formData.applyEnd ? new Date(formData.applyEnd).toISOString() : null,
                resultDate: formData.resultDate ? new Date(formData.resultDate).toISOString() : null,
                purchaseStart: formData.purchaseStart ? new Date(formData.purchaseStart).toISOString() : null,
                purchaseEnd: formData.purchaseEnd ? new Date(formData.purchaseEnd).toISOString() : null,
                purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : null,
            };

            const res = await fetch('/api/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                alert('登録しました');
                handleRedirect();
            } else {
                alert('登録に失敗しました');
            }
        } catch (error) {
            console.error('Register error:', error);
            alert('エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = () => {
        if (!selectedMemberId) return;
        const memberToAdd = availableMembers.find(m => m.id === selectedMemberId);
        if (memberToAdd) {
            if (formData.purchaseMembers.some(m => m.id === memberToAdd.id)) {
                alert('既に追加されています');
                return;
            }
            setFormData(prev => ({
                ...prev,
                purchaseMembers: [...prev.purchaseMembers, { ...memberToAdd, status: 0 }]
            }));
            setSelectedMemberId('');
        }
    };

    const handleRemoveMember = (memberId: string) => {
        setFormData(prev => ({
            ...prev,
            purchaseMembers: prev.purchaseMembers.filter(m => m.id !== memberId)
        }));
    };

    const handleDateChange = (field: keyof EntryForm, val: string) => {
        setFormData(prev => ({ ...prev, [field]: val ? new Date(val).toISOString() : null }));
    };

    const handleProductChange = (productId: string) => {
        const product = productOptions.find(p => p.id === productId);
        setFormData(prev => ({
            ...prev,
            productId: productId,
            productName: product ? product.name : ''
        }));
    };

    return (
        <main style={{ paddingBottom: 80, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh', color: '#333' }}>
            <header style={{
                backgroundColor: '#1e90ff', color: '#fff', padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 100
            }}>
                <Link href="/schedule" style={{ background: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', textDecoration: 'none', color: '#333' }}>戻る</Link>
                <div style={{ fontWeight: 'bold', fontSize: 18 }}>抽選情報登録</div>
                <Link href="/" style={{ background: '#fff', borderRadius: 4, padding: '4px 8px', textDecoration: 'none', color: '#333', fontSize: 12 }}>TOPへ戻る</Link>
            </header>

            <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', backgroundColor: '#fff', minHeight: 'calc(100vh - 50px)' }}>

                {/* 商品選択 */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>商品</label>
                    <select
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={formData.productId}
                        onChange={(e) => handleProductChange(e.target.value)}
                    >
                        <option value="">選択してください</option>
                        {productOptions.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* 店舗 */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>店舗</label>
                    <select
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={formData.shopShortName}
                        onChange={(e) => setFormData({ ...formData, shopShortName: e.target.value })}
                    >
                        <option value="">選択してください</option>
                        {shopOptions.map(shop => (
                            <option key={shop.id} value={shop.name}>{shop.name}</option>
                        ))}
                    </select>
                </div>

                {/* ステータス */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>ステータス</label>
                    <select
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                        {statusOptions.map(opt => (
                            <option key={opt.code} value={opt.code}>{opt.name}</option>
                        ))}
                    </select>
                </div>

                {/* 応募方法 */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>応募方法</label>
                    <select
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={formData.applyMethod}
                        onChange={(e) => setFormData({ ...formData, applyMethod: e.target.value })}
                    >
                        <option value="">選択してください</option>
                        {applyMethodOptions.map(opt => (
                            <option key={opt.code} value={opt.code}>{opt.name}</option>
                        ))}
                    </select>
                </div>

                {/* 応募開始日時 */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>応募開始日時</label>
                    <input
                        type="datetime-local"
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={toDatetimeLocal(formData.applyStart)}
                        onChange={(e) => handleDateChange('applyStart', e.target.value)}
                    />
                </div>

                {/* 応募終了日時 */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>応募終了日時</label>
                    <input
                        type="datetime-local"
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={toDatetimeLocal(formData.applyEnd)}
                        onChange={(e) => handleDateChange('applyEnd', e.target.value)}
                    />
                </div>

                {/* 発表日時 */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>発表日時</label>
                    <input
                        type="datetime-local"
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={toDatetimeLocal(formData.resultDate)}
                        onChange={(e) => handleDateChange('resultDate', e.target.value)}
                    />
                </div>

                {/* 購入期限開始日時 */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>購入期限開始日時</label>
                    <input
                        type="datetime-local"
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={toDatetimeLocal(formData.purchaseStart)}
                        onChange={(e) => handleDateChange('purchaseStart', e.target.value)}
                    />
                </div>

                {/* 購入期限終了日時 */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>購入期限終了日時</label>
                    <input
                        type="datetime-local"
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={toDatetimeLocal(formData.purchaseEnd)}
                        onChange={(e) => handleDateChange('purchaseEnd', e.target.value)}
                    />
                </div>

                {/* 購入日時 */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4, backgroundColor: Number(formData.status) === 30 || Number(formData.status) === 40 ? '#fff' : '#eee' }}>購入日時</label>
                    <input
                        type="datetime-local"
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: Number(formData.status) === 30 || Number(formData.status) === 40 ? '#fff' : '#eee' }}
                        value={toDatetimeLocal(formData.purchaseDate)}
                        onChange={(e) => handleDateChange('purchaseDate', e.target.value)}
                        disabled={Number(formData.status) !== 30 && Number(formData.status) !== 40}
                    />
                </div>

                {/* URL */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>URL</label>
                    <input
                        type="text"
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    />
                </div>

                {/* メモ */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>メモ</label>
                    <textarea
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', minHeight: 80, boxSizing: 'border-box' }}
                        value={formData.memo}
                        onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    />
                </div>

                {/* メンバー */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>購入メンバー</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <select
                            style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                            value={selectedMemberId}
                            onChange={(e) => setSelectedMemberId(e.target.value)}
                        >
                            <option value="">メンバーを選択</option>
                            {availableMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleAddMember}
                            style={{ padding: '8px 16px', backgroundColor: '#e0e0e0', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
                        >
                            追加
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {formData.purchaseMembers.map(member => (
                            <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, background: '#f9f9f9', border: '1px solid #eee', borderRadius: 4 }}>
                                <span>{member.name}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveMember(member.id)}
                                    style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12 }}
                                >
                                    削除
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* フッター */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                backgroundColor: '#fff', borderTop: '1px solid #ccc', padding: 12,
                display: 'flex', justifyContent: 'flex-end', alignItems: 'center', zIndex: 10,
                gap: 8
            }}>
                <button
                    onClick={handleRegister}
                    disabled={loading}
                    style={{ backgroundColor: loading ? '#ccc' : '#1e90ff', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 24px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                    {loading ? '登録中...' : '登録'}
                </button>
                <button
                    onClick={handleRedirect}
                    style={{ backgroundColor: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: 4, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    キャンセル
                </button>
            </div>
        </main>
    );
}

export default function CreateEntryFromSchedulePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreateEntryFromScheduleContent />
        </Suspense>
    );
}
