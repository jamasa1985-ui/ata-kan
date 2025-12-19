'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../_components/Header';
import { Entry, Member } from '../../data';

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
    const from = searchParams.get('from');
    const mode = searchParams.get('mode');

    const handleRedirect = () => {
        if (from === 'schedule') {
            router.push('/schedule');
        } else if (from === 'lotteries') {
            router.push(`/lotteries${mode ? `?mode=${mode}` : ''}`);
        } else if (from === 'purchases') {
            router.push(`/purchases${mode ? `?mode=${mode}` : ''}`);
        } else if (from === 'product-purchases' && productId) {
            router.push(`/products/${productId}/purchases`);
        } else if (productId) {
            router.push(`/products/${productId}`);
        } else {
            router.back();
        }
    };

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

    // Members State
    const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState('');

    // Purchase Items Modal State
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
    const [product, setProduct] = useState<any>(null);
    const [statusMap, setStatusMap] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Options
                const optsParams = await fetch('/api/options');
                if (optsParams.ok) {
                    const optsData = await optsParams.json();
                    if (optsData.OP002) {
                        const sOpts = optsData.OP002.sort((a: any, b: any) => a.order - b.order);
                        setStatusOptions(sOpts);
                        const sMap: Record<string, string> = {};
                        sOpts.forEach((opt: any) => sMap[opt.code.toString()] = opt.name);
                        setStatusMap(sMap);
                    }
                    if (optsData.OP003) setApplyMethodOptions(optsData.OP003);
                }

                const entryRes = await fetch(`/api/entries/${entryId}`);
                if (entryRes.ok) {
                    const entryData = await entryRes.json();
                    setEntry(entryData);
                    setFormData(entryData);

                    // Fetch product for productRelations
                    if (entryData.productId) {
                        const prodRes = await fetch(`/api/products/${entryData.productId}`);
                        if (prodRes.ok) {
                            const prodData = await prodRes.json();
                            setProduct(prodData);
                        }
                    }
                } else {
                    alert('応募データの取得に失敗しました');
                    router.back();
                }

                // Fetch Members
                const membersRes = await fetch('/api/members');
                if (membersRes.ok) {
                    const membersData = await membersRes.json();
                    setAvailableMembers(membersData);
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
            // Calculate correct status based on member statuses
            let calculatedStatus = formData.status;
            const members = formData.purchaseMembers || [];

            if (members.length > 0) {
                const statuses = members.map(m => Number(m.status || 0));
                // Priority Logic
                if (statuses.includes(40)) {
                    calculatedStatus = 40 as any; // Purchased
                } else if (statuses.includes(30)) {
                    calculatedStatus = 30 as any; // Won
                } else if (statuses.includes(10) || statuses.includes(0)) {
                    // applying or not applied (in progress)
                    if (statuses.every(s => s === 0)) {
                        calculatedStatus = 0 as any; // All Not Applied
                    } else {
                        calculatedStatus = 10 as any; // Applying (Mixed or just 10)
                    }
                } else if (statuses.includes(20)) {
                    // Applied (and no 40, 30, 10, 0) -> [20, 20] or [20, 99]
                    calculatedStatus = 20 as any;
                } else if (statuses.every(s => s === 99)) {
                    calculatedStatus = 99 as any; // Lost
                }
                // Else keep current
            }

            const payload = {
                ...formData,
                status: calculatedStatus
            };

            const res = await fetch(`/api/entries/${entryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                alert('更新しました');
                handleRedirect();
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
                handleRedirect();
            } else {
                alert('削除に失敗しました');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('エラーが発生しました');
        }
    };

    const handleCancel = () => {
        handleRedirect();
    };

    // Helper for default time (current hour in DB format)
    const getCurrentHourDbFormat = () => {
        const d = new Date();
        d.setMinutes(0, 0, 0); // Round down to hour
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // Helper for datetime-local
    const toDatetimeLocal = (val: string | Date | undefined) => {
        if (!val) return '';
        const strVal = String(val);
        // If YYYY/MM/DD HH:mm
        if (strVal.includes('/')) {
            const [date, time] = strVal.split(' ');
            if (date && time) {
                return `${date.replace(/\//g, '-')}T${time}`;
            }
        }
        // Fallback
        const d = new Date(val);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // Helper for DB format
    const toDbFormat = (val: string) => {
        if (!val) return '';
        const [date, time] = val.split('T');
        if (date && time) {
            return `${date.replace(/-/g, '/')} ${time}`;
        }
        return val;
    };

    const handleDateChange = (field: keyof Entry, val: string) => {
        // val is YYYY-MM-DDTHH:mm
        setFormData(prev => ({ ...prev, [field]: toDbFormat(val) }));
    };

    const toggleUndecided = (field: keyof Entry) => {
        setFormData(prev => {
            const currentVal = prev[field];
            // If currently has value, we are checking "Undecided" -> set to null
            if (currentVal) {
                return { ...prev, [field]: null };
            } else {
                // If currently empty, we are unchecking "Undecided" -> set to default time
                return { ...prev, [field]: getCurrentHourDbFormat() };
            }
        });
    };

    const handleAddMember = () => {
        if (!selectedMemberId) return;
        const memberToAdd = availableMembers.find(m => m.id === selectedMemberId);
        if (memberToAdd) {
            // Check if already in entry (formData.purchaseMembers might be undefined initially)
            const currentMembers = formData.purchaseMembers || [];
            if (currentMembers.some(m => m.id === memberToAdd.id)) {
                alert('既に追加されています');
                return;
            }
            setFormData(prev => {
                const currentStatus = Number(prev.status);
                let newStatus = prev.status;
                // If status is Applied (20), Won (30), Purchased (40), or Lost (99), revert to Applying (10)
                if ([20, 30, 40, 99].includes(currentStatus)) {
                    newStatus = 10 as any;
                }
                return {
                    ...prev,
                    status: newStatus,
                    purchaseMembers: [...(prev.purchaseMembers || []), { ...memberToAdd, status: 0 }]
                };
            });
            setSelectedMemberId('');
        }
    };

    const handleRemoveMember = (memberId: string) => {
        setFormData(prev => {
            const currentStatus = Number(prev.status);
            let newStatus = prev.status;
            // If status is Applied (20), Won (30), Purchased (40), or Lost (99), revert to Applying (10)
            if ([20, 30, 40, 99].includes(currentStatus)) {
                newStatus = 10 as any;
            }
            return {
                ...prev,
                status: newStatus,
                purchaseMembers: (prev.purchaseMembers || []).filter(m => m.id !== memberId)
            };
        });
    };

    if (loading) return <div style={{ padding: 16 }}>読み込み中...</div>;
    if (!entry) return <div style={{ padding: 16 }}>データが見つかりません</div>;

    return (
        <main style={{ padding: '80px 0 80px 0', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh', color: '#333' }}>
            {/* Header */}
            <Header
                title="抽選情報修正"
                maxWidth={480}
                backgroundColor="#1e90ff"
                leftContent={
                    <Link href="/" style={{ background: '#fff', borderRadius: 4, padding: '4px 8px', textDecoration: 'none', color: '#333', fontSize: 12 }}>TOPへ戻る</Link>
                }
                rightContent={
                    <div style={{ fontSize: '12px', color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                        ID: <span style={{ fontFamily: 'monospace' }}>{entryId}</span>
                    </div>
                }
            />

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
                        disabled
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: '#eee', color: '#555' }}
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


                {/* Purchase Date */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4, color: (Number(formData.status) === 30 || Number(formData.status) === 40) ? '#333' : '#aaa' }}>購入日時</label>
                    <input
                        type="datetime-local"
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: (Number(formData.status) === 30 || Number(formData.status) === 40) ? '#fff' : '#eee' }}
                        value={toDatetimeLocal(formData.purchaseDate as string)}
                        onChange={(e) => handleDateChange('purchaseDate', e.target.value)}
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
                        {(formData.purchaseMembers || []).map((member: Member) => (
                            <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, background: '#f9f9f9', border: '1px solid #eee', borderRadius: 4 }}>
                                <span style={{ flex: 1 }}>{member.name}</span>
                                <select
                                    value={member.status !== undefined ? member.status : 0}
                                    onChange={async (e) => {
                                        const newStatus = Number(e.target.value);

                                        // Show modal if status is Won (30) or Purchased (40)
                                        if (newStatus === 30 || newStatus === 40) {
                                            setSelectedMember(member);

                                            // Load existing purchase items
                                            try {
                                                const itemsRes = await fetch(`/api/entries/${entryId}/members/${member.id}/items`);
                                                if (itemsRes.ok) {
                                                    const itemsData = await itemsRes.json();
                                                    const quantities: Record<string, number> = {};
                                                    itemsData.items.forEach((item: any) => {
                                                        quantities[item.code] = item.quantity;
                                                    });
                                                    setItemQuantities(quantities);
                                                } else {
                                                    setItemQuantities({});
                                                }
                                            } catch (error) {
                                                console.error('Error loading items:', error);
                                                setItemQuantities({});
                                            }

                                            setShowItemsModal(true);
                                        }

                                        const updatedMembers = (formData.purchaseMembers || []).map(m =>
                                            m.id === member.id ? { ...m, status: newStatus } : m
                                        );

                                        // Optimistic update
                                        setFormData(prev => ({ ...prev, purchaseMembers: updatedMembers }));

                                        try {
                                            const res = await fetch(`/api/entries/${entryId}/members`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ members: updatedMembers }),
                                            });
                                            if (!res.ok) {
                                                throw new Error('Failed to update');
                                            }
                                            const data = await res.json();
                                            if (data.newStatus !== undefined) {
                                                setFormData(prev => ({ ...prev, status: data.newStatus }));
                                            }
                                        } catch (error) {
                                            alert('ステータス更新に失敗しました');
                                        }
                                    }}
                                    style={{
                                        border: '1px solid #ccc',
                                        borderRadius: 4,
                                        padding: '4px 8px',
                                        fontSize: 12,
                                        marginRight: 8
                                    }}
                                >
                                    {statusOptions.filter(opt => opt.code !== 10).map(opt => (
                                        <option key={opt.code} value={opt.code}>{opt.name}</option>
                                    ))}
                                </select>
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
                backgroundColor: '#1e90ff', padding: 12,
                display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10,
                boxShadow: '0 -2px 4px rgba(0,0,0,0.1)'
            }}>
                <div style={{ width: '100%', maxWidth: '480px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={handleDelete}
                        style={{ backgroundColor: '#fff', color: '#dc3545', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        削除
                    </button>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            onClick={handleCancel}
                            style={{ backgroundColor: '#fff', color: '#333', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            キャンセル
                        </button>
                        <button
                            type="button"
                            onClick={handleUpdate}
                            style={{ backgroundColor: '#fff', color: '#1e90ff', border: 'none', borderRadius: 4, padding: '8px 24px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            更新
                        </button>
                    </div>
                </div>
            </div>

            {/* Purchase Items Modal */}
            {showItemsModal && product && selectedMember && entry && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowItemsModal(false)}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px' }}>購入商品登録</h2>
                            <button onClick={() => setShowItemsModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: 0 }}>×</button>
                        </div>
                        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                            <div><strong>メンバー:</strong> {selectedMember.name}</div>
                            <div><strong>ステータス:</strong> {statusMap[selectedMember.status] || selectedMember.status}</div>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            {product.productRelations && product.productRelations.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {product.productRelations.map((relation: any) => {
                                        const qty = itemQuantities[relation.code] || 0;
                                        const subtotal = relation.price * qty;
                                        return (
                                            <div key={relation.code} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold' }}>{relation.shortName}</div>
                                                    <div style={{ fontSize: '12px', color: '#666' }}>¥{relation.price.toLocaleString()}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <button onClick={() => setItemQuantities(prev => ({ ...prev, [relation.code]: Math.max(0, qty - 1) }))} style={{ width: '28px', height: '28px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer' }}>-</button>
                                                    <input type="number" min="0" value={qty === 0 ? '' : qty} onChange={(e) => { const val = e.target.value; setItemQuantities(prev => ({ ...prev, [relation.code]: val === '' ? 0 : parseInt(val) })) }} style={{ width: '50px', textAlign: 'center', border: '1px solid #ccc', borderRadius: '4px', padding: '4px' }} placeholder="0" />
                                                    <button onClick={() => setItemQuantities(prev => ({ ...prev, [relation.code]: qty + 1 }))} style={{ width: '28px', height: '28px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer' }}>+</button>
                                                </div>
                                                <div style={{ width: '80px', textAlign: 'right', fontSize: '14px' }}>¥{subtotal.toLocaleString()}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>関連商品がありません</div>
                            )}
                        </div>
                        <div style={{ borderTop: '2px solid #333', paddingTop: '12px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
                                <span>合計:</span>
                                <span>¥{Object.entries(itemQuantities).reduce((total, [code, qty]) => {
                                    const relation = product.productRelations?.find((r: any) => r.code === code);
                                    return total + (relation ? relation.price * qty : 0);
                                }, 0).toLocaleString()}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowItemsModal(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer' }}>キャンセル</button>
                            <button onClick={async () => {
                                try {
                                    const items = product.productRelations?.map((relation: any) => ({ code: relation.code, shortName: relation.shortName, quantity: itemQuantities[relation.code] || 0, amount: relation.price * (itemQuantities[relation.code] || 0) })).filter((item: any) => item.quantity > 0) || [];
                                    const res = await fetch(`/api/entries/${entryId}/members/${selectedMember.id}/items`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
                                    if (!res.ok) throw new Error('Failed to save items');
                                    alert('購入商品を登録しました');
                                    setShowItemsModal(false);
                                } catch (error) {
                                    console.error('Error saving items:', error);
                                    alert('購入商品の登録に失敗しました');
                                }
                            }} style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', backgroundColor: '#1e90ff', color: '#fff', cursor: 'pointer' }}>保存</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
