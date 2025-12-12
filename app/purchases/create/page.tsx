'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Member } from '../../data';

type StatusOption = {
    code: number;
    name: string;
    order: number;
};

type PurchaseItem = {
    code: string;
    shortName: string;
    quantity: number;
    amount: number;
};

type ItemMap = Record<string, PurchaseItem[]>; // memberId -> items

type PurchaseForm = {
    productId: string;
    productName: string;
    shopShortName: string;
    status: string;
    purchaseDate: string;
    purchaseMembers: Member[];
    memo: string;
    memberItems: ItemMap;
};

const toDatetimeLocal = (val: string) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getCurrentTimeISO = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function CreatePurchaseContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const productId = searchParams.get('productId');

    const [loading, setLoading] = useState(false);
    const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
    const [shopOptions, setShopOptions] = useState<{ id: string, name: string }[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Modal State
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [modalMemberId, setModalMemberId] = useState<string | null>(null);
    const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
    const [modalProduct, setModalProduct] = useState<any | null>(null);

    const [formData, setFormData] = useState<PurchaseForm>({
        productId: productId || '',
        productName: '',
        shopShortName: '',
        status: '40', // 購入済
        purchaseDate: getCurrentTimeISO(),
        purchaseMembers: [],
        memo: '',
        memberItems: {},
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
                    }
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

                    // Auto-select primary members with status 40 (購入済)
                    const primaryMembers = data.filter(m => m.primaryFlg).map(m => ({ ...m, status: 40 }));
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

        const fetchProduct = async () => {
            if (productId) {
                try {
                    const res = await fetch(`/api/products/${productId}`);
                    if (res.ok) {
                        const p = await res.json();
                        setFormData(prev => ({ ...prev, productName: p.name }));
                        // If product ID comes from URL, we also need this product data for the modal if we want to add items immediately
                        setModalProduct(p);
                    }
                } catch (e) { console.error(e); }
            }
        };

        const fetchProducts = async () => {
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
        fetchShops();
        fetchMembers();
        fetchProduct();
        fetchProducts();
    }, [productId]);

    const handleRegister = async () => {
        if (!formData.productId || !formData.shopShortName) {
            alert('商品と店舗を選択してください');
            return;
        }

        // Validation: Check if all members have items
        const missingItemsMember = formData.purchaseMembers.find(m => {
            const items = formData.memberItems[m.id];
            return !items || items.length === 0 || items.every(i => i.quantity === 0);
        });

        if (missingItemsMember) {
            alert(`メンバー「${missingItemsMember.name}」の購入商品が登録されていません`);
            return;
        }

        if (!confirm('登録してもよろしいですか？')) return;
        setLoading(true);

        try {
            const payload = {
                productId: formData.productId,
                productShortName: formData.productName,
                shopShortName: formData.shopShortName,
                status: Number(formData.status),
                purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : null,
                purchaseMembers: formData.purchaseMembers,
                memo: formData.memo,
                // Set other required fields as null/empty
                applyMethod: '',
                applyStart: null,
                applyEnd: null,
                resultDate: null,
                purchaseStart: null,
                purchaseEnd: null,
                url: '',
            };

            const payloadWithItems = {
                ...payload,
                purchaseMembers: formData.purchaseMembers.map(m => ({
                    ...m,
                    items: formData.memberItems[m.id] || []
                }))
            };

            const res = await fetch('/api/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadWithItems),
            });

            if (res.ok) {
                alert('登録しました');
                if (productId) {
                    router.push(`/products/${productId}/purchases`);
                } else {
                    router.push('/purchases');
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
                purchaseMembers: [...prev.purchaseMembers, { ...memberToAdd, status: 40 }]
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
            router.push(`/products/${productId}/purchases`);
        } else {
            router.push('/purchases');
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
                <div style={{ fontWeight: 'bold', fontSize: 18 }}>購入登録</div>
                <Link href="/" style={{ background: '#fff', borderRadius: 4, padding: '4px 8px', textDecoration: 'none', color: '#333', fontSize: 12 }}>TOPへ戻る</Link>
            </header>

            <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', backgroundColor: '#fff', minHeight: 'calc(100vh - 50px)' }}>

                {/* Product Name */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>商品</label>
                    {productId ? (
                        // 既存: 固定表示（購入管理画面からの遷移）
                        <div style={{ padding: 8, background: '#eee', borderRadius: 4, color: '#555' }}>
                            {formData.productName || '読み込み中...'}
                        </div>
                    ) : (
                        // 新規: プルダウン表示（購入一覧ページからの遷移）
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
                                if (selectedProduct) {
                                    setModalProduct(selectedProduct);
                                }
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
                    <div style={{ padding: 8, background: '#eee', borderRadius: 4, color: '#555' }}>
                        購入済 (コード: 40)
                    </div>
                </div>

                {/* Purchase Date */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>購入日時</label>
                    <input
                        type="datetime-local"
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        value={toDatetimeLocal(formData.purchaseDate)}
                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    />
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
                                <div>
                                    <div>{member.name}</div>
                                    {/* Show summary of items if any */}
                                    {formData.memberItems[member.id] && formData.memberItems[member.id].length > 0 && (
                                        <div style={{ fontSize: 12, color: '#666' }}>
                                            {formData.memberItems[member.id].map((it, idx) => (
                                                <span key={idx}>{it.shortName} x{it.quantity} </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!formData.productId) {
                                                alert('先に商品を選択してください');
                                                return;
                                            }
                                            const openModal = async () => {
                                                // Always fetch product to ensure we have relations
                                                try {
                                                    const res = await fetch(`/api/products/${formData.productId}`);
                                                    if (res.ok) {
                                                        const p = await res.json();
                                                        setModalProduct(p);

                                                        // After setting product, open modal
                                                        if (p) {
                                                            setModalMemberId(member.id);
                                                            const currentItems = formData.memberItems[member.id] || [];
                                                            const q: Record<string, number> = {};
                                                            currentItems.forEach(it => q[it.code] = it.quantity);
                                                            setItemQuantities(q);
                                                            setShowItemsModal(true);
                                                        }
                                                    } else {
                                                        alert('商品データを読み込めませんでした');
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                    alert('商品データの取得に失敗しました');
                                                }
                                            };
                                            openModal();
                                        }}
                                        style={{ backgroundColor: '#ffc107', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
                                    >
                                        商品
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveMember(member.id)}
                                        style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12 }}
                                    >
                                        削除
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
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

            {/* Purchase Items Modal */}
            {showItemsModal && modalProduct && modalMemberId && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowItemsModal(false)}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px' }}>購入商品登録</h2>
                            <button onClick={() => setShowItemsModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: 0 }}>×</button>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            {modalProduct.productRelations && modalProduct.productRelations.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {modalProduct.productRelations.map((relation: any) => {
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
                                                    <input type="number" min="0" value={qty} onChange={(e) => setItemQuantities(prev => ({ ...prev, [relation.code]: Math.max(0, parseInt(e.target.value) || 0) }))} style={{ width: '50px', textAlign: 'center', border: '1px solid #ccc', borderRadius: '4px', padding: '4px' }} />
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
                                    const relation = modalProduct.productRelations?.find((r: any) => r.code === code);
                                    return total + (relation ? relation.price * qty : 0);
                                }, 0).toLocaleString()}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowItemsModal(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer' }}>キャンセル</button>
                            <button onClick={() => {
                                const items: PurchaseItem[] = modalProduct.productRelations?.map((relation: any) => ({
                                    code: relation.code,
                                    shortName: relation.shortName,
                                    quantity: itemQuantities[relation.code] || 0,
                                    amount: relation.price * (itemQuantities[relation.code] || 0)
                                })).filter((item: any) => item.quantity > 0) || [];

                                setFormData(prev => ({
                                    ...prev,
                                    memberItems: {
                                        ...prev.memberItems,
                                        [modalMemberId]: items
                                    }
                                }));
                                setShowItemsModal(false);
                            }} style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', backgroundColor: '#1e90ff', color: '#fff', cursor: 'pointer' }}>決定</button>
                        </div>
                    </div>
                </div>
            )}
        </main >
    );
}

export default function CreatePurchasePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreatePurchaseContent />
        </Suspense>
    );
}
