'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Entry } from '../../data';

type StatusOption = {
    code: number;
    name: string;
    order: number;
};

type PageProps = {
    params: Promise<{ entryId: string }>;
};

export default function EditEntryPage({ params }: PageProps) {
    const { entryId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const productId = searchParams.get('productId');

    const [entry, setEntry] = useState<Entry | null>(null);
    const [loading, setLoading] = useState(true);

    // Options
    const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
    const [applyMethodOptions, setApplyMethodOptions] = useState<StatusOption[]>([]);

    // Form State
    const [formData, setFormData] = useState<Partial<Entry>>({});

    // Date Checkboxes (for "Undecided" logic - simplified: if date is empty, it's undecided)
    // Actually, image shows "Undecided" checkbox. 
    // We will just implement inputs. If clear -> empty.

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Options
                const optsParams = await fetch('/api/options');
                if (optsParams.ok) {
                    const optsData = await optsParams.json();
                    if (optsData.OP002) setStatusOptions(optsData.OP002.sort((a: any, b: any) => a.order - b.order));
                    if (optsData.OP003) setApplyMethodOptions(optsData.OP003);
                }

                // Fetch Entry
                const entryRes = await fetch(`/api/entries/${entryId}`);
                if (entryRes.ok) {
                    const entryData = await entryRes.json();
                    setEntry(entryData);
                    setFormData(entryData);
                } else {
                    alert('応募データの取得に失敗しました');
                    router.back();
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (entryId) {
            fetchData();
        }
    }, [entryId, router]);

    const handleUpdate = async () => {
        if (!confirm('更新してもよろしいですか？')) return;

        try {
            const res = await fetch(`/api/entries/${entryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                alert('更新しました');
                if (productId) {
                    router.push(`/products/${productId}`);
                } else {
                    router.back();
                }
            } else {
                alert('更新に失敗しました');
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('エラーが発生しました');
        }
    };

    const handleDelete = async () => {
        if (!confirm('本当に削除しますか？この操作は取り消せません。')) return;

        try {
            const res = await fetch(`/api/entries/${entryId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                alert('削除しました');
                if (productId) {
                    router.push(`/products/${productId}`);
                } else {
                    router.back();
                }
            } else {
                alert('削除に失敗しました');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('エラーが発生しました');
        }
    };

    const handleCancel = () => {
        if (productId) {
            router.push(`/products/${productId}`);
        } else {
            router.back();
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

    // Helper for datetime-local
    const toDatetimeLocal = (val: string | Date | undefined) => {
        if (!val) return '';
        const d = new Date(val);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const handleDateChange = (field: keyof Entry, val: string) => {
        // val is YYYY-MM-DDTHH:mm
        setFormData(prev => ({ ...prev, [field]: val ? new Date(val).toISOString() : null }));
    };

    const toggleUndecided = (field: keyof Entry) => {
        setFormData(prev => {
            const currentVal = prev[field];
            // If currently has value, we are checking "Undecided" -> set to null
            if (currentVal) {
                return { ...prev, [field]: null };
            } else {
                // If currently empty, we are unchecking "Undecided" -> set to default time
                return { ...prev, [field]: new Date(getCurrentHourISO()).toISOString() };
            }
        });
    };

    if (loading) return <div style={{ padding: 16 }}>読み込み中...</div>;
    if (!entry) return <div style={{ padding: 16 }}>データが見つかりません</div>;

    return (
        <main style={{ paddingBottom: 80, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh', color: '#333' }}>
            {/* Header */}
            <header style={{
                backgroundColor: '#1e90ff', color: '#fff', padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 100
            }}>
                <button onClick={handleCancel} style={{ background: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', color: '#333' }}>戻る</button>
                <div style={{ fontWeight: 'bold', fontSize: 18 }}>抽選情報修正</div>
                <Link href="/" style={{ background: '#fff', borderRadius: 4, padding: '4px 8px', textDecoration: 'none', color: '#333', fontSize: 12 }}>TOPへ戻る</Link>
            </header>

            <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', backgroundColor: '#fff', minHeight: 'calc(100vh - 50px)' }}>

                {/* Product Name */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>商品</label>
                    <input
                        type="text"
                        disabled
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', backgroundColor: '#eee', color: '#555', boxSizing: 'border-box' }}
                        value={formData.productName || ''}
                    />
                </div>

                {/* Shop Name */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>店舗</label>
                    <input
                        type="text"
                        disabled
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', backgroundColor: '#eee', color: '#555', boxSizing: 'border-box' }}
                        value={formData.shopShortName || ''}
                    />
                </div>

                {/* Status */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>ステータス</label>
                    <select
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={formData.status || ''}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
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
                        value={formData.applyMethod || ''}
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
                                value={toDatetimeLocal(formData[item.field as keyof Entry] as string)}
                                onChange={(e) => handleDateChange(item.field as keyof Entry, e.target.value)}
                                disabled={!formData[item.field as keyof Entry]}
                            />
                            {/* "Undecided" logic could go here, for now just clear input implies undecided */}
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={!formData[item.field as keyof Entry]}
                                    onChange={() => toggleUndecided(item.field as keyof Entry)}
                                />
                                <span style={{ fontSize: 12, marginLeft: 4 }}>未定</span>
                            </label>
                        </div>
                    </div>
                ))}

                {/* Purchase Date - Missing from Type initially but in Image. Assuming 'purchaseDate' field if exists. 
                   Data.ts doesn't have purchaseDate in Entry type explicitly, might be implied or legacy. 
                   I'll skip specific "Purchase Date" separate from start/end unless requested. 
                   Wait, image has "購入日" area. 
                   I'll skip for now to avoid compilation errors if not in type. 
                */}

                {/* Quantity - "数量内訳" in image. Not in `Entry` type? 
                   Checked data.ts: Entry has `memo`, `url`, etc. No quantity. 
                   I'll skip.
                */}

                {/* Memo */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>メモ</label>
                    <textarea
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', minHeight: 80, boxSizing: 'border-box' }}
                        value={formData.memo || ''}
                        onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    />
                </div>

                {/* URL */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>URL</label>
                    <input
                        type="text"
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={formData.url || ''}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    />
                </div>

            </div>

            {/* Footer Buttons */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                backgroundColor: '#fff', borderTop: '1px solid #ccc', padding: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10
            }}>
                <button
                    onClick={handleDelete}
                    style={{ backgroundColor: '#fff', color: '#f00', border: '1px solid #f00', borderRadius: 4, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    削除
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={handleUpdate}
                        style={{ backgroundColor: '#fff', color: '#1e90ff', border: '1px solid #1e90ff', borderRadius: 4, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        更新
                    </button>
                    <button
                        onClick={handleCancel}
                        style={{ backgroundColor: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: 4, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        キャンセル
                    </button>
                </div>
            </div>
        </main>
    );
}
