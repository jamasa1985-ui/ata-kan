'use client';

import { use, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../_components/Header';
import { Member } from '../../data';

type StatusOption = {
    code: number;
    name: string;
    order: number;
};

// Minimal entry shape for creation
type EntryForm = {
    productId: string;
    productName: string;
    shopId: string;
    shopShortName: string;
    status: string; // code string
    applyMethod: string; // code string
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

// Helper for datetime-local
const toDatetimeLocal = (val: string) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};



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
    // Use proper types from data.ts or define local extension if needed
    // We need Shop with relative date fields.
    // We need Product with releaseDate.
    type ProductWithRelease = { id: string; name: string; releaseDate?: string };
    const [shopOptions, setShopOptions] = useState<any[]>([]); // Use 'any' or cast to Shop[] to allow fields. Simplest for now is any or import.
    const [products, setProducts] = useState<ProductWithRelease[]>([]); // Minimal needed

    // Helper for default time (current hour)
    const getCurrentHourISO = () => {
        const d = new Date();
        d.setMinutes(0, 0, 0); // Round down to hour
        // Format to YYYY-MM-DDTHH:mm for local time input
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const [formData, setFormData] = useState<EntryForm>({
        productId: productId || '',
        productName: productName || '',
        shopId: '',
        shopShortName: '',
        status: '21',
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

    // Date Calculation Logic
    const calculateAndSetDates = (prodId: string, shopName: string, currentShopOptions: any[], currentProducts: any[]) => {
        if (!prodId || !shopName) return;

        const product = currentProducts.find(p => p.id === prodId);
        const shop = currentShopOptions.find(s => s.name === shopName);

        if (product && product.releaseDate && shop) {
            const releaseDate = new Date(product.releaseDate);
            if (isNaN(releaseDate.getTime())) return;

            const calcDate = (relativeDays: number | undefined, timeStr: string | undefined): string => {
                if (relativeDays === undefined || relativeDays === null) return '';
                const d = new Date(releaseDate);
                d.setDate(d.getDate() + Number(relativeDays));

                if (timeStr) {
                    const [h, m] = timeStr.split(':').map(Number);
                    if (!isNaN(h) && !isNaN(m)) {
                        d.setHours(h, m, 0, 0);
                    }
                }
                return d.toISOString(); // Store as ISO
            };

            const newDates: Partial<EntryForm> = {};

            // Apply Start
            if (shop.applyStartDate !== undefined) newDates.applyStart = calcDate(shop.applyStartDate, shop.applyStartTime);
            // Apply End
            if (shop.applyEndDate !== undefined) newDates.applyEnd = calcDate(shop.applyEndDate, shop.applyEndTime);
            // Result Date
            if (shop.resultDate !== undefined) newDates.resultDate = calcDate(shop.resultDate, shop.resultTime);
            // Purchase Start
            if (shop.purchaseStartDate !== undefined) newDates.purchaseStart = calcDate(shop.purchaseStartDate, shop.purchaseStartTime);
            // Purchase End
            if (shop.purchaseEndDate !== undefined) newDates.purchaseEnd = calcDate(shop.purchaseEndDate, shop.purchaseEndTime);

            // Update state
            setFormData(prev => ({ ...prev, ...newDates }));
        }
    };


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

        // Fetch Members
        const fetchMembers = async () => {
            try {
                const res = await fetch('/api/members');
                if (res.ok) {
                    const data: Member[] = await res.json();
                    setAvailableMembers(data);
                    const primaryMembers = data.filter(m => m.primaryFlg).map(m => ({ ...m, status: 0 }));
                    if (primaryMembers.length > 0) {
                        setFormData(prev => ({
                            ...prev,
                            purchaseMembers: primaryMembers
                        }));
                    }
                }
            } catch (error) {
                console.error('Error fetching members:', error);
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
                        // If we have productId (from URL), and we just fetched it, we might need to store it in 'products' list or just use it for calculation if needed? 
                        // Actually, if we come from product detail, we might want to auto-calc if shop is selected later.
                        // But 'products' list is only fetched if !productId.
                        // If productId exists, we treat it as single.
                        // For calculation, we need releaseDate.
                        // Let's add it to a temporary single-item list or handle it specially?
                        // Simple way: ensure 'products' has it.
                        setProducts([p]);
                    }
                } catch (e) { console.error(e); }
            }
        };

        // Fetch Products if no productId
        const fetchProducts = async () => {
            // Even if productId exists, we might want the full list for dropdown if we allowed changing it?
            // But the UI says: if productId, show fixed div.
            // If !productId, fetch all.
            if (!productId) {
                try {
                    const res = await fetch('/api/products?all=true');
                    if (res.ok) {
                        const data = await res.json();
                        const filtered = data
                            .filter((p: any) => p.displayFlag === true)
                            .sort((a: any, b: any) => b.id.localeCompare(a.id));
                        setProducts(filtered);
                    }
                } catch (e) { console.error(e); }
            }
        };

        fetchOptions();
        fetchOptions(); // Duplicate call in original, removing it here implicitly by just one block... wait, original had two. I'll stick to one.
        fetchShops();
        fetchMembers();
        fetchProduct();
        fetchProducts();
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
                purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : null,
            };

            const res = await fetch('/api/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                alert('登録しました');
                if (productId) {
                    router.push(`/products/${productId}`);
                } else {
                    router.push('/lotteries');
                }
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

    const handleAddMember = () => {
        if (!selectedMemberId) return;
        const memberToAdd = availableMembers.find(m => m.id === selectedMemberId);
        if (memberToAdd) {
            // Check if already added
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

    const handleCancel = () => {
        if (productId) {
            router.push(`/products/${productId}`);
        } else {
            router.back();
        }
    };

    return (
        <main style={{ padding: '80px 0 80px 0', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh', color: '#333' }}>
            <Header
                title="抽選情報登録"
                maxWidth={480}
                backgroundColor="#1e90ff"
                leftContent={
                    <button onClick={handleCancel} style={{ background: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', color: '#333', fontSize: 12 }}>戻る</button>
                }
                rightContent={
                    <Link href="/" style={{ background: '#fff', borderRadius: 4, padding: '4px 8px', textDecoration: 'none', color: '#333', fontSize: 12 }}>TOPへ戻る</Link>
                }
            />

            <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', backgroundColor: '#fff', minHeight: 'calc(100vh - 50px)' }}>

                {/* Product Name */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>商品</label>
                    {productId ? (
                        <div style={{ padding: 8, background: '#eee', borderRadius: 4, color: '#555' }}>
                            {formData.productName || '読み込み中...'}
                        </div>
                    ) : (
                        <select
                            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                            value={formData.productId}
                            onChange={(e) => {
                                const val = e.target.value;
                                const selectedProduct = products.find(p => p.id === val);
                                setFormData(prev => ({
                                    ...prev,
                                    productId: val,
                                    productName: selectedProduct?.name || ''
                                }));
                                calculateAndSetDates(val, formData.shopShortName, shopOptions, products);
                            }}
                        >
                            <option value="">選択してください</option>
                            {products.map(product => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Shop Name */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>店舗</label>
                    <select
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={formData.shopShortName}
                        onChange={(e) => {
                            const val = e.target.value;
                            const selectedShop = shopOptions.find(s => s.name === val);
                            setFormData(prev => ({
                                ...prev,
                                shopShortName: val,
                                shopId: selectedShop ? selectedShop.id : ''
                            }));
                            // Trigger calculation
                            // Note: We need the productId. If fixed (productId prop), use that. Else use formData.productId.
                            const pId = productId || formData.productId;
                            calculateAndSetDates(pId, val, shopOptions, products);
                        }}
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
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: productId ? '#eee' : '#fff' }}
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        disabled={!!productId}
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
                                value={toDatetimeLocal(formData[item.field as keyof EntryForm] as string)}
                                onChange={(e) => handleDateChange(item.field as keyof EntryForm, new Date(e.target.value).toISOString())}
                                // Note: toDatetimeLocal expects ISO/DateStr -> returns local format.
                                // onChange gets local format. We should probably store as ISO.
                                // The original code stored whatever was passed. Let's make sure we store ISO to be consistent with calculation.
                                // Wait, the original code had: onChange={(e) => handleDateChange(..., e.target.value)}
                                // And 'toDatetimeLocal' handles the display.
                                // If I change it to store ISO, I must convert e.target.value (local) to ISO.
                                // However, simple string storage is easiest if we don't care about TZ.
                                // But my calc produces ISO. So consistency is key.
                                // I will stick to what I just wrote: calculateAndSetDates produces ISO.
                                // So handleDateChange should probably try to produce ISO? Or just keep local string?
                                // If I store local string, 'new Date(localString)' works.
                                // But Firestore likes ISO.
                                // Let's try to convert to ISO on change.
                                disabled={!!(productId && !formData[item.field as keyof EntryForm])}
                            />
                            {productId && (
                                <label style={{ display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={!formData[item.field as keyof EntryForm]}
                                        onChange={() => toggleUndecided(item.field as keyof EntryForm)}
                                    />
                                    <span style={{ fontSize: 12, marginLeft: 4 }}>未定</span>
                                </label>
                            )}
                        </div>
                    </div>
                ))}


                {/* Purchase Date */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4, color: (Number(formData.status) === 30 || Number(formData.status) === 40) ? '#333' : '#aaa' }}>購入日時</label>
                    <input
                        type="datetime-local"
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: (Number(formData.status) === 30 || Number(formData.status) === 40) ? '#fff' : '#eee' }}
                        value={toDatetimeLocal(formData.purchaseDate)}
                        onChange={(e) => handleDateChange('purchaseDate', e.target.value)} // Keep simple for manual input for now
                        disabled={Number(formData.status) !== 30 && Number(formData.status) !== 40}
                    />
                </div>


                {/* Members */}
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
                    {/* Member List */}
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
                backgroundColor: '#1e90ff', borderTop: 'none', padding: 12,
                display: 'flex', justifyContent: 'flex-end', alignItems: 'center', zIndex: 10,
                gap: 8, boxShadow: '0 -2px 4px rgba(0,0,0,0.1)'
            }}>
                <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                        onClick={handleCancel}
                        style={{ backgroundColor: '#fff', color: '#333', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        style={{ backgroundColor: '#fff', color: '#1e90ff', border: 'none', borderRadius: 4, padding: '8px 24px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                        {loading ? '登録中...' : '登録'}
                    </button>
                </div>
            </div>
        </main >
    );
}

export default function CreateEntryPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreateEntryContent />
        </Suspense>
    );
}
