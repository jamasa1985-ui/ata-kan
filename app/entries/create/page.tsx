'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type StatusOption = {
    code: number;
    name: string;
    order: number;
};

// Minimal entry shape for creation
type EntryForm = {
    productId: string;
    productName: string;
    shopShortName: string;
    status: string; // code string
    applyMethod: string; // code string
    applyStart: string;
    applyEnd: string;
    resultDate: string;
    purchaseStart: string;
    purchaseEnd: string;
    memo: string;
    url: string;
};

// Helper for datetime-local
const toDatetimeLocal = (val: string) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

import { Suspense } from 'react';

// ... (imports remain the same, but remove Suspense from here if it was imported, though it wasn't)

// ... types and helper functions ...

function CreateEntryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const productId = searchParams.get('productId');
    const productName = searchParams.get('productName'); // Optional: pass name to avoid fetch

    // State
    const [loading, setLoading] = useState(false); // Only for submitting
    const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
    const [applyMethodOptions, setApplyMethodOptions] = useState<StatusOption[]>([]);
    const [shopOptions, setShopOptions] = useState<{ id: string, name: string }[]>([]);

    const [formData, setFormData] = useState<EntryForm>({
        productId: productId || '',
        productName: productName || '',
        shopShortName: '',
        status: '21', // Default to '未応募' (21) if possible, or fetch order
        applyMethod: '',
        applyStart: '',
        applyEnd: '',
        resultDate: '',
        purchaseStart: '',
        purchaseEnd: '',
        memo: '',
        url: '',
    });

    useEffect(() => {
        // Fetch Options
        const fetchOptions = async () => {
            try {
                const response = await fetch('/api/options');
                if (response.ok) {
                    const data = await response.json();
                    if (data.OP002) {
                        const sOpts: StatusOption[] = data.OP002.sort((a: any, b: any) => a.order - b.order);
                        setStatusOptions(sOpts);
                        // Default Status if not set
                        if (sOpts.length > 0) {
                            setFormData(prev => ({ ...prev, status: sOpts[0].code.toString() }));
                        }
                    }
                    if (data.OP003) setApplyMethodOptions(data.OP003);
                }
            } catch (error) {
                console.error('Error fetching options:', error);
            }
        };

        // Fetch Shops
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

        // Fetch Product Name if not passed
        const fetchProduct = async () => {
            if (productId && !productName) {
                try {
                    const res = await fetch(`/api/products/${productId}`);
                    if (res.ok) {
                        const p = await res.json();
                        setFormData(prev => ({ ...prev, productName: p.name }));
                    }
                } catch (e) { console.error(e); }
            }
        };

        fetchOptions();
        fetchShops();
        fetchProduct();
    }, [productId, productName]);


    const handleRegister = async () => {
        if (!formData.productId) {
            alert('商品情報が不足しています');
            return;
        }

        if (!confirm('登録してもよろしいですか？')) return;
        setLoading(true);

        try {
            // Prepare payload
            // Convert datetime-local strings to ISO strings or keep as is? 
            // Existing data seems to use full ISO strings often.
            const payload = {
                ...formData,
                status: Number(formData.status), // convert to number for status code
                // Dates: if empty string, send null/undefined or empty string? Firestore handles mixed well but cleaner to be explicit.
                applyStart: formData.applyStart ? new Date(formData.applyStart).toISOString() : null,
                applyEnd: formData.applyEnd ? new Date(formData.applyEnd).toISOString() : null,
                resultDate: formData.resultDate ? new Date(formData.resultDate).toISOString() : null,
                purchaseStart: formData.purchaseStart ? new Date(formData.purchaseStart).toISOString() : null,
                purchaseEnd: formData.purchaseEnd ? new Date(formData.purchaseEnd).toISOString() : null,
            };

            const res = await fetch('/api/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                alert('登録しました');
                router.push(`/products/${productId}`);
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

    // Helper for default time (current hour)
    const getCurrentHourISO = () => {
        const d = new Date();
        d.setMinutes(0, 0, 0); // Round down to hour
        // Format to YYYY-MM-DDTHH:mm for local time input
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const handleDateChange = (field: keyof EntryForm, val: string) => {
        setFormData(prev => ({ ...prev, [field]: val }));
    };

    const toggleUndecided = (field: keyof EntryForm) => {
        setFormData(prev => {
            const currentVal = prev[field];
            // If currently has value (meaning undecided is unchecked), we are checking it -> set to empty
            if (currentVal) {
                return { ...prev, [field]: '' };
            } else {
                // If currently empty (undecided is checked), we are unchecking it -> set to default time
                return { ...prev, [field]: getCurrentHourISO() };
            }
        });
    };

    const handleCancel = () => {
        if (productId) {
            router.push(`/products/${productId}`);
        } else {
            router.back();
        }
    };

    return (
        <main style={{ paddingBottom: 80, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh', color: '#333' }}>
            {/* Header */}
            <header style={{
                backgroundColor: '#1e90ff', color: '#fff', padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 100
            }}>
                <button onClick={handleCancel} style={{ background: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', color: '#333' }}>戻る</button>
                <div style={{ fontWeight: 'bold', fontSize: 18 }}>抽選情報登録</div>
                <Link href="/" style={{ background: '#fff', borderRadius: 4, padding: '4px 8px', textDecoration: 'none', color: '#333', fontSize: 12 }}>TOPへ戻る</Link>
            </header>

            <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', backgroundColor: '#fff', minHeight: 'calc(100vh - 50px)' }}>

                {/* Product Name */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>商品</label>
                    <div style={{ padding: 8, background: '#eee', borderRadius: 4, color: '#555' }}>
                        {formData.productName || '読み込み中...'}
                    </div>
                </div>

                {/* Shop Name */}
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

                {/* Status */}
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

                {/* Apply Method */}
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

                {/* Dates */}
                {[
                    { label: '応募開始日時', field: 'applyStart' },
                    { label: '応募終了日時', field: 'applyEnd' },
                    { label: '発表日時', field: 'resultDate' },
                    { label: '購入開始日時', field: 'purchaseStart' },
                    { label: '購入終了日時', field: 'purchaseEnd' },
                ].map(item => (
                    <div key={item.field} style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>{item.label}</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="datetime-local"
                                style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                                value={formData[item.field as keyof EntryForm]}
                                onChange={(e) => handleDateChange(item.field as keyof EntryForm, e.target.value)}
                                disabled={!formData[item.field as keyof EntryForm]}
                            />
                            {/* "Undecided" checkbox logic */}
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={!formData[item.field as keyof EntryForm]}
                                    onChange={() => toggleUndecided(item.field as keyof EntryForm)}
                                />
                                <span style={{ fontSize: 12, marginLeft: 4 }}>未定</span>
                            </label>
                        </div>
                    </div>
                ))}

                {/* Memo */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>メモ</label>
                    <textarea
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', minHeight: 80, boxSizing: 'border-box' }}
                        value={formData.memo}
                        onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
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

            </div>

            {/* Footer Buttons */}
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
                    onClick={handleCancel}
                    style={{ backgroundColor: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: 4, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    キャンセル
                </button>
            </div>
        </main>
    );
}

export default function CreateEntryPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreateEntryContent />
        </Suspense>
    );
}
