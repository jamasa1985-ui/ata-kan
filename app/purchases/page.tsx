'use client';

import Link from 'next/link';
import Header from '../_components/Header';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Entry as DataEntry, Product, Member } from '../data';

type Entry = {
    id: string;
    productId: string;
    productName: string;
    shopShortName: string;
    status: number;
    applyMethod?: number;
    applyStart?: string;
    applyEnd?: string;
    resultDate?: string;
    purchaseStart?: string;
    purchaseEnd?: string;
    purchaseDate?: string;
    url?: string;
    memo?: string;
    purchaseMembers?: Member[];
};

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
    price?: number;
};

type MemberWithItems = Member & {
    purchaseItems?: PurchaseItem[];
};

function PurchasesContent() {
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode');
    const [entries, setEntries] = useState<Entry[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('all');
    const [memberItems, setMemberItems] = useState<Record<string, Record<string, PurchaseItem[]>>>({});

    const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
    const [statusMap, setStatusMap] = useState<Record<string, string>>({});
    const [applyMethodMap, setApplyMethodMap] = useState<Record<string, string>>({});

    const [isDetailMode, setIsDetailMode] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Purchase Items Modal State
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
    const [modalProduct, setModalProduct] = useState<Product | null>(null);

    // Fetch Options
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const response = await fetch('/api/options');
                if (response.ok) {
                    const data = await response.json();
                    if (data.OP002) {
                        const sOpts = data.OP002.sort((a: any, b: any) => a.order - b.order);
                        setStatusOptions(sOpts);
                        const sMap: Record<string, string> = {};
                        sOpts.forEach((opt: any) => sMap[opt.code.toString()] = opt.name);
                        setStatusMap(sMap);
                    }
                    if (data.OP003) {
                        const amOpts: StatusOption[] = data.OP003;
                        const amMap: Record<string, string> = {};
                        amOpts.forEach(opt => amMap[opt.code.toString()] = opt.name);
                        setApplyMethodMap(amMap);
                    }
                }
            } catch (error) {
                console.error('オプション情報の取得エラー:', error);
            }
        };
        fetchOptions();
    }, []);

    // Fetch All Entries
    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const response = await fetch('/api/entries/all');
                if (!response.ok) {
                    throw new Error('応募データの取得に失敗しました');
                }
                const data: Entry[] = await response.json();
                setEntries(data);
            } catch (error) {
                console.error('応募データの取得に失敗しました:', error);
            }
        };

        fetchEntries();
    }, []);

    // Base Filter (Mode & Date) - Used for Dropdown Options
    const baseFilteredEntries = useMemo(() => {
        return entries.filter(e => {
            if (mode === 'management') {
                // Status check: 30, 40, 99
                if (![30, 40, 99].includes(e.status)) return false;

                const now = new Date();

                // 1. purchaseDate (購入日) がある場合
                if (e.purchaseDate) {
                    const purchaseDate = new Date(e.purchaseDate);
                    const diffTime = now.getTime() - purchaseDate.getTime();
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);
                    // 14日以上経過していたら非表示
                    if (diffDays > 14) return false;
                }
                // 2. purchaseEnd (購入期限) がある場合
                else if (e.purchaseEnd) {
                    const purchaseEnd = new Date(e.purchaseEnd);
                    // 期限切れなら非表示
                    if (purchaseEnd < now) return false;
                }

                return true;
            } else {
                // Default: ステータス40（購入済）のみ表示
                return e.status === 40;
            }
        });
    }, [entries, mode]);

    // Get unique products for filter - BASED ON BASE FILTERED ENTRIES
    const uniqueProducts = useMemo(() => {
        const productMap = new Map<string, string>();
        baseFilteredEntries.forEach(e => {
            if (e.productId && e.productName) {
                productMap.set(e.productId, e.productName);
            }
        });
        return Array.from(productMap.entries()).map(([id, name]) => ({ id, name }));
    }, [baseFilteredEntries]);

    // Final Filtered Entries (Apply User Filters)
    const filteredEntries = useMemo(() => {
        let filtered = baseFilteredEntries;

        // Filter by product
        if (selectedProductId !== 'all') {
            filtered = filtered.filter(e => e.productId === selectedProductId);
        }

        // Sort by purchaseDate
        return filtered.sort((a, b) => {
            const dateA = (a as any).purchaseDate;
            const dateB = (b as any).purchaseDate;

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return new Date(dateB).getTime() - new Date(dateA).getTime(); // 新しい順
        });
    }, [baseFilteredEntries, selectedProductId]);

    // Fetch Purchase Items for Base Filtered Entries
    useEffect(() => {
        const fetchItems = async () => {
            const itemsMap: Record<string, Record<string, PurchaseItem[]>> = { ...memberItems };
            let hasNewData = false;

            const fetchPromises = baseFilteredEntries.flatMap(entry => {
                // If we already have data for this entry, skip (or assume up to date)
                // To be safe, we can check if the entry key exists in memberItems.
                // However, detailed member checks are better.
                // For simplicity, let's fetch if 'entry.id' key is missing in itemsMap
                if (itemsMap[entry.id]) return [];

                if (!entry.purchaseMembers || !Array.isArray(entry.purchaseMembers) || entry.purchaseMembers.length === 0) {
                    return [];
                }

                return entry.purchaseMembers.map(async (member) => {
                    try {
                        const itemsRes = await fetch(`/api/entries/${entry.id}/members/${member.id}/items`);
                        if (itemsRes.ok) {
                            const itemsData = await itemsRes.json();
                            if (itemsData.items && itemsData.items.length > 0) {
                                if (!itemsMap[entry.id]) itemsMap[entry.id] = {};
                                itemsMap[entry.id][member.id] = itemsData.items;
                                hasNewData = true;
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching items for member ${member.id}:`, error);
                    }
                });
            });

            if (fetchPromises.length > 0) {
                await Promise.all(fetchPromises);
                if (hasNewData) {
                    setMemberItems(itemsMap);
                }
            }
        };

        if (baseFilteredEntries.length > 0) {
            fetchItems();
        }
    }, [baseFilteredEntries]);

    const getStatusName = (statusCode: string | number) => {
        return statusMap[statusCode.toString()] || statusCode.toString();
    };

    const toggleAccordion = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Handle opening the items modal
    const handleOpenItemsModal = async (entry: any, member: any) => {
        setSelectedEntry(entry);
        setSelectedMember(member);

        // Load product data for modal
        try {
            const productRes = await fetch(`/api/products/${entry.productId}`);
            if (productRes.ok) {
                setModalProduct(await productRes.json());
            }
        } catch (error) {
            console.error('Error loading product:', error);
        }

        // Load existing purchase items
        try {
            const itemsRes = await fetch(`/api/entries/${entry.id}/members/${member.id}/items`);
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
    };

    const formatDate = (date: string | Date | undefined) => {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getFullYear().toString().slice(-2)}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}(${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}) ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    const formatShortDate = (date: string | Date | undefined) => {
        if (!date) return '';
        const d = new Date(date);
        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (isDetailMode) {
            setExpandedIds(new Set(filteredEntries.map(e => e.id)));
        } else {
            setExpandedIds(new Set());
        }
    }, [isDetailMode, filteredEntries]);





    const totalAmount = useMemo(() => {
        let sum = 0;
        filteredEntries.forEach(entry => {
            const entryItems = memberItems[entry.id];
            if (entryItems) {
                Object.values(entryItems).forEach(items => {
                    items.forEach(item => {
                        const val = item.amount || (item.quantity * (item.price || 0));
                        sum += val || 0;
                    });
                });
            }
        });
        return sum;
    }, [filteredEntries, memberItems]);

    return (
        <main
            style={{
                minHeight: '100vh',
                padding: '80px 12px 200px 12px', // Top padding for fixed header
                fontFamily: 'system-ui, sans-serif',
                backgroundColor: '#f5f5f5',
                color: '#333',
                maxWidth: 480,
                margin: '0 auto',
                position: 'relative',
            }}
        >
            <Header
                title={mode === 'management' ? '購入管理' : '購入一覧'}
                maxWidth={480}
                backgroundColor="#1e90ff"
                hasBackLink={false}
                rightContent={
                    <Link href="/" style={{
                        backgroundColor: '#fff',
                        color: '#333',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontSize: '12px'
                    }}>
                        TOPへ戻る
                    </Link>
                }
            />

            {/* Product Filter */}
            <section
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '10px',
                    border: '1px solid #ddd',
                }}
            >
                <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>
                        商品で絞り込み:
                    </label>
                    <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '6px',
                            fontSize: '14px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                        }}
                    >
                        <option value="all">すべて</option>
                        {uniqueProducts.map(product => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ fontSize: '14px', color: '#666', marginTop: '8px', display: 'flex', alignItems: 'center' }}>
                    <span>({filteredEntries.length}件)</span>
                    <span style={{ marginLeft: '16px', fontWeight: 'bold', color: '#333' }}>
                        合計: ¥{totalAmount.toLocaleString()}
                    </span>
                </div>
            </section>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '80px' }}>
                {filteredEntries.map((entry) => {
                    const isOpen = expandedIds.has(entry.id);
                    const statusName = getStatusName(entry.status);
                    const entryItems = memberItems[entry.id] || {};

                    return (
                        <div
                            key={entry.id}
                            style={{
                                backgroundColor: '#fff',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                onClick={() => toggleAccordion(entry.id)}
                                style={{
                                    padding: '8px 12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    background: '#e6f2ff'
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: isOpen ? 'bold' : 'normal' }}>
                                        {entry.productName}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666' }}>
                                        {entry.shopShortName}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <span style={{ fontSize: '14px' }}>{statusName}</span>
                                    <span style={{
                                        fontSize: '14px',
                                        display: 'flex',
                                        gap: '4px',
                                        width: '110px',
                                        justifyContent: 'flex-end'
                                    }}>
                                        <span>購入日</span>
                                        <span>{entry.purchaseDate ? formatShortDate(entry.purchaseDate) : ''}</span>
                                    </span>
                                    <span style={{ marginLeft: '4px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>
                                        ^
                                    </span>
                                </div>
                            </div>

                            {isOpen && (
                                <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #eee', backgroundColor: '#fff' }}>
                                    <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '15px' }}>
                                        購入日時： <span style={{ fontWeight: 'normal' }}>{entry.purchaseDate ? formatDate(entry.purchaseDate) : ''}</span>
                                    </div>

                                    {/* Members Section with Status */}
                                    <div style={{ marginBottom: '12px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#000', marginBottom: '4px' }}>メンバー：</div>
                                        {entry.purchaseMembers && entry.purchaseMembers.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {entry.purchaseMembers.map((member) => (
                                                    <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '4px 8px', borderRadius: '4px' }}>
                                                        <span style={{ fontSize: '14px' }}>{member.name}</span>
                                                        <select
                                                            value={member.status !== undefined ? member.status : 0}
                                                            onChange={async (e) => {
                                                                const newStatus = Number(e.target.value);

                                                                if (newStatus === 30 || newStatus === 40) {
                                                                    await handleOpenItemsModal(entry, member);
                                                                }

                                                                const updatedMembers = entry.purchaseMembers?.map(m =>
                                                                    m.id === member.id ? { ...m, status: newStatus } : m
                                                                );

                                                                setEntries(prev => prev.map(p =>
                                                                    p.id === entry.id ? { ...p, purchaseMembers: updatedMembers || [] } : p
                                                                ));

                                                                try {
                                                                    const res = await fetch(`/api/entries/${entry.id}/members`, {
                                                                        method: 'PUT',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ members: updatedMembers }),
                                                                    });
                                                                    if (!res.ok) {
                                                                        throw new Error('Failed to update');
                                                                    }
                                                                    const data = await res.json();
                                                                    if (data.newStatus !== undefined) {
                                                                        setEntries(prev => prev.map(p =>
                                                                            p.id === entry.id ? { ...p, status: data.newStatus } : p
                                                                        ));
                                                                    }
                                                                } catch (error) {
                                                                    alert('ステータス更新に失敗しました');
                                                                }
                                                            }}
                                                            style={{
                                                                border: '1px solid #ccc',
                                                                borderRadius: 4,
                                                                padding: '2px 4px',
                                                                fontSize: 12,
                                                                backgroundColor: '#fff'
                                                            }}
                                                        >
                                                            {statusOptions.filter(opt => opt.code !== 10).map(opt => (
                                                                <option key={opt.code} value={opt.code}>{opt.name}</option>
                                                            ))}
                                                        </select>
                                                        {(member.status === 30 || member.status === 40) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenItemsModal(entry, member);
                                                                }}
                                                                style={{
                                                                    marginLeft: '4px',
                                                                    padding: '2px 6px',
                                                                    fontSize: '11px',
                                                                    backgroundColor: '#28a745',
                                                                    color: '#fff',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                商品
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ color: '#999', fontSize: '12px' }}>メンバー登録なし</div>
                                        )}
                                    </div>

                                    {/* Quantity Breakdown */}
                                    <div style={{ marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>数量内訳：</div>
                                        {entry.purchaseMembers && entry.purchaseMembers.length > 0 ? (
                                            <div style={{ paddingLeft: '8px' }}>
                                                {entry.purchaseMembers.map((member, idx) => {
                                                    const items = entryItems[member.id] || [];
                                                    if (items.length === 0) return null;
                                                    return (
                                                        <div key={member.id}>
                                                            {items.map((item, itemIdx) => (
                                                                <div key={item.code} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                                    <span>{itemIdx === 0 ? member.name : ''}</span>
                                                                    <span>{item.shortName}：{item.quantity}個</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ paddingLeft: '8px', color: '#999' }}>データなし</div>
                                        )}
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>メモ：</div>
                                        <div style={{ paddingLeft: '8px' }}>{entry.memo || '（なし）'}</div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Link href={`/entries/${entry.id}?productId=${entry.productId}&from=purchases&mode=${mode || ''}`}>
                                            <button style={{ backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                                                編集
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>


            <footer
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '100%',
                    maxWidth: '480px',
                    backgroundColor: '#1e90ff',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#fff',
                    zIndex: 100,
                    height: '60px',
                    boxSizing: 'border-box'
                }}
            >
                <Link href="/purchases/create">
                    <button
                        style={{
                            backgroundColor: '#fff',
                            color: '#333',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                        }}
                    >
                        購入情報登録
                    </button>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label
                        htmlFor="detailToggle"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            gap: '4px'
                        }}
                    >
                        <div style={{
                            width: '40px',
                            height: '20px',
                            backgroundColor: isDetailMode ? '#fff' : '#ccc',
                            borderRadius: '999px',
                            position: 'relative',
                            transition: 'background-color 0.2s'
                        }}>
                            <div style={{
                                width: '16px',
                                height: '16px',
                                backgroundColor: isDetailMode ? '#1e90ff' : '#fff',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: isDetailMode ? '22px' : '2px',
                                transition: 'left 0.2s'
                            }} />
                        </div>
                        <span>詳細</span>
                    </label>
                    <input
                        id="detailToggle"
                        type="checkbox"
                        checked={isDetailMode}
                        onChange={(e) => setIsDetailMode(e.target.checked)}
                        style={{ display: 'none' }}
                    />
                </div>
            </footer>

            {/* Purchase Items Modal */}
            {showItemsModal && modalProduct && selectedEntry && selectedMember && (
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
                                    const relation = modalProduct.productRelations?.find((r: any) => r.code === code);
                                    return total + (relation ? relation.price * qty : 0);
                                }, 0).toLocaleString()}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowItemsModal(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer' }}>キャンセル</button>
                            <button onClick={async () => {
                                try {
                                    const items = modalProduct.productRelations?.map((relation: any) => ({ code: relation.code, shortName: relation.shortName, quantity: itemQuantities[relation.code] || 0, amount: relation.price * (itemQuantities[relation.code] || 0) })).filter((item: any) => item.quantity > 0) || [];
                                    const res = await fetch(`/api/entries/${selectedEntry.id}/members/${selectedMember.id}/items`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
                                    if (!res.ok) throw new Error('Failed to save items');

                                    // Refresh items
                                    const itemsRes = await fetch(`/api/entries/${selectedEntry.id}/members/${selectedMember.id}/items`);
                                    if (itemsRes.ok) {
                                        const itemsData = await itemsRes.json();
                                        setMemberItems(prev => ({
                                            ...prev,
                                            [selectedEntry.id]: {
                                                ...prev[selectedEntry.id],
                                                [selectedMember.id]: itemsData.items || []
                                            }
                                        }));
                                    }

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
export default function PurchasesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PurchasesContent />
        </Suspense>
    );
}
