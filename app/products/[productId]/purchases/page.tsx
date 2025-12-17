'use client';

import Link from 'next/link';
import Header from '../../../_components/Header';
import { use, useEffect, useMemo, useState } from 'react';
import { Entry, Product, Member } from '../../../data';

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

type MemberWithItems = Member & {
    purchaseItems?: PurchaseItem[];
};

type PurchaseTab = 'すべて' | '購入前' | '購入済';

type PageProps = {
    params: Promise<{ productId: string }>;
};

export default function ProductPurchasesPage({ params }: PageProps) {
    const { productId } = use(params);

    const [product, setProduct] = useState<Product | null>(null);
    const [productLoading, setProductLoading] = useState(true);
    const [productEntries, setProductEntries] = useState<Entry[]>([]);
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

    // Fetch Product and Options
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch(`/api/products/${productId}`);
                if (response.ok) {
                    const data = await response.json();
                    setProduct(data);
                }
            } catch (error) {
                console.error('商品情報の取得エラー:', error);
            } finally {
                setProductLoading(false);
            }
        };

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

        if (productId) {
            fetchProduct();
            fetchOptions();
        }
    }, [productId]);

    // Fetch Entries and Purchase Items
    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const response = await fetch(`/api/products/${productId}/entries`);
                if (!response.ok) {
                    throw new Error('応募データの取得に失敗しました');
                }
                const data: Entry[] = await response.json();
                const targetStatuses = ['30', '40'];
                const filtered = data.filter(e => targetStatuses.includes(e.status.toString()));
                setProductEntries(filtered);

                // Fetch purchase items for all members
                const itemsMap: Record<string, Record<string, PurchaseItem[]>> = {};
                for (const entry of filtered) {
                    if (entry.purchaseMembers && entry.purchaseMembers.length > 0) {
                        itemsMap[entry.id] = {};
                        for (const member of entry.purchaseMembers) {
                            try {
                                const itemsRes = await fetch(`/api/entries/${entry.id}/members/${member.id}/items`);
                                if (itemsRes.ok) {
                                    const itemsData = await itemsRes.json();
                                    itemsMap[entry.id][member.id] = itemsData.items || [];
                                }
                            } catch (error) {
                                console.error(`Error fetching items for member ${member.id}:`, error);
                            }
                        }
                    }
                }
                setMemberItems(itemsMap);
            } catch (error) {
                console.error('応募データの取得に失敗しました:', error);
            }
        };

        if (productId) {
            fetchEntries();
        }
    }, [productId]);

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
            setExpandedIds(new Set(productEntries.map(e => e.id)));
        } else {
            setExpandedIds(new Set());
        }
    }, [isDetailMode, productEntries]);

    const [currentTab, setCurrentTab] = useState<PurchaseTab>('すべて');

    const filteredEntries = useMemo(() => {
        const filtered = productEntries.filter((e) => {
            if (currentTab === '購入前' && e.status.toString() !== '30') return false;
            if (currentTab === '購入済' && e.status.toString() !== '40') return false;
            return true;
        });

        // Sort by Status Order -> Date
        const statusOrder: Record<string, number> = {};
        statusOptions.forEach(opt => {
            statusOrder[opt.code.toString()] = opt.order;
        });

        return filtered.sort((a, b) => {
            // 1. Status
            const statusA = Number(a.status);
            const statusB = Number(b.status);
            if (statusA !== statusB) {
                return statusA - statusB;
            }

            // 2. Date
            const dateA = statusA === 30 ? a.purchaseEnd : (a as any).purchaseDate;
            const dateB = statusB === 30 ? b.purchaseEnd : (b as any).purchaseDate;

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;

            return new Date(dateA).getTime() - new Date(dateB).getTime(); // Ascending
        });
    }, [productEntries, currentTab, statusOptions, statusMap]);

    // Calculate totals
    const totals = useMemo(() => {
        const productTotals: Record<string, number> = {};
        const memberTotals: Record<string, number> = {};
        let grandTotal = 0;

        filteredEntries.forEach(entry => {
            if (entry.purchaseMembers && memberItems[entry.id]) {
                entry.purchaseMembers.forEach(member => {
                    const items = memberItems[entry.id]?.[member.id] || [];
                    let memberTotal = 0;
                    items.forEach(item => {
                        productTotals[item.shortName] = (productTotals[item.shortName] || 0) + item.quantity;
                        memberTotal += item.amount;
                    });
                    if (memberTotal > 0) {
                        const memberKey = member.name || member.id;
                        memberTotals[memberKey] = (memberTotals[memberKey] || 0) + memberTotal;
                        grandTotal += memberTotal;
                    }
                });
            }
        });

        return { productTotals, memberTotals, grandTotal };
    }, [filteredEntries, memberItems]);

    if (productLoading) {
        return (
            <main style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
                <p>読み込み中...</p>
            </main>
        );
    }

    if (!product) {
        return (
            <main style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
                <p>商品が見つかりませんでした。</p>
                <Link href="/">TOPへ戻る</Link>
            </main>
        );
    }

    const tabs: PurchaseTab[] = ['すべて', '購入前', '購入済'];

    return (
        <main
            style={{
                minHeight: '100vh',
                padding: '80px 12px 200px 12px', // Top 80px for header
                fontFamily: 'system-ui, sans-serif',
                backgroundColor: '#f5f5f5',
                color: '#333',
                maxWidth: 480,
                margin: '0 auto',
                position: 'relative',
            }}
        >
            <Header
                title="購入管理"
                maxWidth={480}
                backgroundColor="#1e90ff"
                color="#fff"
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

            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>{product.name}</div>

            <section
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '10px',
                    border: '1px solid #ddd',
                }}
            >

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setCurrentTab(tab)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                backgroundColor: currentTab === tab ? '#1e90ff' : '#fff',
                                color: currentTab === tab ? '#fff' : '#666',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: currentTab === tab ? 'bold' : 'normal',
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#666' }}>({filteredEntries.length}件)</span>
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
                                <div style={{ fontSize: '16px', fontWeight: isOpen ? 'bold' : 'normal', flex: 1, minWidth: 0, paddingRight: '8px' }}>
                                    {entry.shopShortName}
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
                                        {/* Status 30: 購〆日 (purchaseEnd) / Status 40: 購入日 (purchaseDate) */}
                                        {Number(entry.status) === 30 && entry.purchaseEnd ? (
                                            <>
                                                <span>購〆日</span>
                                                <span>{formatShortDate(entry.purchaseEnd)}</span>
                                            </>
                                        ) : (Number(entry.status) === 40 || (entry as any).purchaseDate) ? (
                                            <>
                                                <span>購入日</span>
                                                <span>{entry.purchaseDate ? formatShortDate(entry.purchaseDate) : ''}</span>
                                            </>
                                        ) : null}
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
                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                            {(Number(member.status) === 30 || Number(member.status) === 40) && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        // Need to define handleOpenItemsModal or pass logic
                                                                        // Assuming handleOpenItemsModal exists in this component as per snippet context
                                                                        setSelectedEntry(entry);
                                                                        setSelectedMember(member);

                                                                        // Fetch items logic reused from onChange or similar
                                                                        // Better to just call the logic if extracted, but for now inline async fetch
                                                                        (async () => {
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
                                                                        })();
                                                                    }}
                                                                    style={{
                                                                        padding: '2px 6px',
                                                                        fontSize: '11px',
                                                                        backgroundColor: '#28a745',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        marginRight: '8px'
                                                                    }}
                                                                >
                                                                    商品
                                                                </button>
                                                            )}
                                                            <select
                                                                value={member.status !== undefined ? member.status : 0}
                                                                onChange={async (e) => {
                                                                    const newStatus = Number(e.target.value);

                                                                    if (newStatus === 30 || newStatus === 40) {
                                                                        setSelectedEntry(entry);
                                                                        setSelectedMember(member);

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
                                                                    }

                                                                    const updatedMembers = entry.purchaseMembers?.map(m =>
                                                                        m.id === member.id ? { ...m, status: newStatus } : m
                                                                    );

                                                                    setProductEntries(prev => prev.map(p =>
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
                                                                            setProductEntries(prev => prev.map(p =>
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
                                                        </div>
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
                                        <Link href={`/entries/${entry.id}?productId=${productId}`}>
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

            {/* Fixed Totals Display */}
            <div
                style={{
                    position: 'fixed',
                    bottom: '60px', // Above the 60px footer
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '100%',
                    maxWidth: '480px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderTop: '1px solid #ccc',
                    padding: '8px 12px',
                    zIndex: 90,
                    boxShadow: '0 -2px 5px rgba(0,0,0,0.1)',
                    fontSize: '13px',
                }}
            >
                {/* 1. Item Totals */}
                {Object.keys(totals.productTotals).length > 0 && (
                    <div style={{ marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dashed #eee' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>商品計:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {Object.entries(totals.productTotals).map(([name, qty]) => (
                                <span key={name} style={{ backgroundColor: '#e6f2ff', padding: '2px 6px', borderRadius: '4px' }}>
                                    {name}: {qty}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Member Totals */}
                {Object.keys(totals.memberTotals).length > 0 && (
                    <div style={{ marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dashed #eee' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>メンバー計:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {Object.entries(totals.memberTotals).map(([name, amount]) => (
                                <span key={name}>
                                    {name}: ¥{amount.toLocaleString()}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Grand Total */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                    <span>合計:</span>
                    <span style={{ marginLeft: '8px', color: '#1e90ff' }}>¥{totals.grandTotal.toLocaleString()}</span>
                </div>
            </div>

            {/* Footer */}


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
                <Link href={`/purchases/create?productId=${productId}`}>
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
            {showItemsModal && product && selectedEntry && selectedMember && (
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
