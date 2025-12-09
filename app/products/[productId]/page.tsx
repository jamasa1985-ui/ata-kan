'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { Entry, Product } from '../../data';

type StatusOption = {
    code: number;
    name: string;
    order: number;
};

type StatusFilter = 'すべて' | string;

type PageProps = {
    params: Promise<{ productId: string }>;
};

export default function ProductEntriesPage({ params }: PageProps) {
    const { productId } = use(params);

    const [product, setProduct] = useState<Product | null>(null);
    const [productLoading, setProductLoading] = useState(true);
    const [productEntries, setProductEntries] = useState<Entry[]>([]);

    // Dynamic Options State
    const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
    const [statusMap, setStatusMap] = useState<Record<string, string>>({});
    const [applyMethodMap, setApplyMethodMap] = useState<Record<string, string>>({});

    // Detailed mode state
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
                    console.log('API Options Response:', data); // DEBUG LOG

                    // OP002: Status
                    if (data.OP002) {
                        const sOpts: StatusOption[] = data.OP002;
                        sOpts.sort((a, b) => a.order - b.order);
                        setStatusOptions(sOpts);
                        const sMap: Record<string, string> = {};
                        sOpts.forEach(opt => sMap[opt.code.toString()] = opt.name);
                        setStatusMap(sMap);
                    }

                    // OP003: Apply Method
                    if (data.OP003) {
                        const amOpts: StatusOption[] = data.OP003;
                        console.log('OP003 Data:', amOpts); // DEBUG LOG
                        const amMap: Record<string, string> = {};
                        amOpts.forEach(opt => amMap[opt.code.toString()] = opt.name);
                        setApplyMethodMap(amMap);
                        console.log('ApplyMethodMap Built:', amMap); // DEBUG LOG
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

    // Fetch Entries
    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const response = await fetch(`/api/products/${productId}/entries`);
                if (!response.ok) {
                    throw new Error('応募データの取得に失敗しました');
                }
                const data = await response.json();
                setProductEntries(data);
            } catch (error) {
                console.error('応募データの取得に失敗しました:', error);
            }
        };

        if (productId) {
            fetchEntries();
        }
    }, [productId]);

    // Helpers
    const getStatusName = (statusCode: string | number) => {
        return statusMap[statusCode.toString()] || statusCode.toString();
    };

    const getApplyMethodName = (code: string | number | undefined) => {
        if (!code) return 'WEB'; // Default fallback
        return applyMethodMap[code.toString()] || code.toString();
    };

    // Toggle logic
    useEffect(() => {
        if (isDetailMode) {
            setExpandedIds(new Set(productEntries.map(e => e.id)));
        } else {
            setExpandedIds(new Set());
        }
    }, [isDetailMode, productEntries]);

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

    // Strict MM/DD format
    const formatShortDate = (date: string | Date | undefined) => {
        if (!date) return '';
        const d = new Date(date);
        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    };

    const [statusFilter, setStatusFilter] = useState<StatusFilter>('すべて');
    const [keyword, setKeyword] = useState('');

    const filteredEntries = useMemo(() => {
        const filtered = productEntries.filter((e) => {
            const sName = getStatusName(e.status);
            if (statusFilter !== 'すべて' && sName !== statusFilter) {
                return false;
            }
            if (keyword.trim() === '') return true;
            const k = keyword.trim().toLowerCase();
            return (
                e.productName.toLowerCase().includes(k) ||
                e.shopShortName.toLowerCase().includes(k)
            );
        });

        // Create a map for status order for O(1) lookup
        const statusOrder: Record<string, number> = {};
        statusOptions.forEach(opt => {
            statusOrder[opt.code.toString()] = opt.order;
        });

        // Helper to get date for sorting
        const getSortDate = (entry: Entry, statusName: string) => {
            if (statusName.includes('未応募') || statusName.includes('応募中')) return entry.applyEnd;
            if (statusName.includes('応募済')) return entry.resultDate;
            if (statusName.includes('当選')) return entry.purchaseEnd;
            if (statusName.includes('購入済')) return (entry as any).purchaseDate;
            return '';
        };

        return filtered.sort((a, b) => {
            // 1. Sort by Status Order
            const orderA = statusOrder[a.status.toString()] || 999;
            const orderB = statusOrder[b.status.toString()] || 999;
            if (orderA !== orderB) {
                return orderA - orderB;
            }

            // 2. Sort by Date
            const statusNameA = getStatusName(a.status);
            // Assuming status is same here because order is same (and order usually distinct per status, or at least grouped)
            // But if multiple statuses have same order, we use their specific logic
            const dateA = getSortDate(a, statusNameA);
            const statusNameB = getStatusName(b.status);
            const dateB = getSortDate(b, statusNameB);

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return new Date(dateA).getTime() - new Date(dateB).getTime();
        });
    }, [productEntries, statusFilter, keyword, statusMap, statusOptions]);

    // Header Info Helper
    const getEntryHeaderInfo = (entry: Entry, statusName: string) => {
        let label = '';
        let dateVal: string | Date = '';

        if (statusName.includes('未応募') || statusName.includes('応募中')) {
            label = '応〆日';
            dateVal = entry.applyEnd || '';
        } else if (statusName.includes('応募済')) {
            label = '発表日';
            dateVal = entry.resultDate || '';
        } else if (statusName.includes('当選')) {
            label = '購〆日';
            dateVal = entry.purchaseEnd || '';
        } else if (statusName.includes('購入済')) {
            label = '購入日';
            dateVal = (entry as any).purchaseDate || '';
        } else if (statusName.includes('落選')) {
            // Keep empty to align status
        }

        return { label, dateVal };
    };

    if (productLoading) {
        return (
            <main style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
                <p>読み込み中...</p>
            </main>
        );
    }
    // ...
    // ...


    if (!product) {
        return (
            <main style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
                <p>商品が見つかりませんでした。</p>
                <Link href="/">TOPへ戻る</Link>
            </main>
        );
    }

    return (
        <main
            style={{
                minHeight: '100vh',
                padding: '12px 12px 80px 12px', // フッター分空ける
                fontFamily: 'system-ui, sans-serif',
                backgroundColor: '#f5f5f5',
                color: '#333',
                maxWidth: 480,
                margin: '0 auto',
                position: 'relative',
            }}
        >
            <header
                style={{
                    marginBottom: '10px',
                    padding: '10px 14px',
                    backgroundColor: '#1e90ff',
                    color: '#fff',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    抽選情報
                </div>
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
            </header>

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
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px', fontSize: '14px' }}>店舗名</span>
                    <input
                        type="text"
                        placeholder="店舗名で絞り込み"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '4px 8px',
                            fontSize: '14px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setStatusFilter('すべて')}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: statusFilter === 'すべて' ? '#1e90ff' : '#fff',
                            color: statusFilter === 'すべて' ? '#fff' : '#666',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        全て
                    </button>
                    {statusOptions.map((option) => (
                        <button
                            key={option.code}
                            onClick={() => setStatusFilter(option.name)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                backgroundColor: statusFilter === option.name ? '#fff' : '#fff',
                                color: statusFilter === option.name ? '#333' : '#999',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: statusFilter === option.name ? 'bold' : 'normal',
                            }}
                        >
                            {option.name}
                        </button>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#666' }}>({filteredEntries.length}件)</span>
                </div>
            </section>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredEntries.map((entry) => {
                    const isOpen = expandedIds.has(entry.id);
                    const statusName = getStatusName(entry.status);
                    const applyMethodName = getApplyMethodName(entry.applyMethod);

                    const headerInfo = getEntryHeaderInfo(entry, statusName);

                    return (
                        <div
                            key={entry.id}
                            style={{
                                backgroundColor: isOpen ? '#fff' : '#e6f2ff',
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
                                    backgroundColor: isOpen ? '#fff' : '#e6f2ff',
                                }}
                            >
                                <div style={{ fontSize: '16px', fontWeight: isOpen ? 'bold' : 'normal' }}>
                                    {entry.shopShortName}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '14px' }}>{statusName}</span>
                                    <span style={{
                                        fontSize: '14px',
                                        display: 'flex',
                                        gap: '4px',
                                        width: '110px',     // Fixed width for alignment
                                        justifyContent: 'flex-end',
                                        color: headerInfo.label ? '#333' : 'transparent' // text color or visibility
                                    }}>
                                        <span>{headerInfo.label}</span>
                                        <span>{formatShortDate(headerInfo.dateVal)}</span>
                                    </span>
                                    <span style={{ marginLeft: '4px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>
                                        ^
                                    </span>
                                </div>
                            </div>

                            {isOpen && (
                                <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #eee' }}>
                                    {/* ステータス・応募方法 */}
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', alignItems: 'center' }}>
                                        {/* Returned Status display per user request */}
                                        <div style={{ fontWeight: 'bold', color: '#000' }}>ステータス：</div>
                                        <span style={{ color: '#000' }}>{statusName}</span>

                                        <div style={{ fontWeight: 'bold', marginLeft: '8px', color: '#000' }}>応募方法：</div>
                                        <span style={{ color: '#000' }}>
                                            {/* Debugging Apply Method */}
                                            {/* {console.log(`Entry: ${entry.id}, Method: ${entry.applyMethod}, Name: ${applyMethodName}`)} */}
                                            {applyMethodName}
                                        </span>
                                    </div>

                                    <div style={{ marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#000' }}>応募期間：</div>
                                        <div style={{ color: '#333' }}>
                                            {formatDate(entry.applyStart)} ～ {formatDate(entry.applyEnd)}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#000' }}>発表日：</div>
                                        <div style={{ color: '#333' }}>{formatDate(entry.resultDate)}</div>
                                    </div>

                                    <div style={{ marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#000' }}>購入期限：</div>
                                        <div style={{ color: '#333' }}>
                                            {formatDate(entry.purchaseStart)} ～ {formatDate(entry.purchaseEnd)}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 'bold', marginRight: '8px', color: '#000' }}>URL：</div>
                                        {entry.url ? (
                                            <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1e90ff' }}>
                                                コチラ
                                            </a>
                                        ) : (
                                            <span style={{ color: '#999' }}>なし</span>
                                        )}
                                    </div>

                                    {/* Memo readonly */}
                                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 'bold', marginRight: '8px', color: '#000' }}>メモ：</div>
                                        <div style={{ color: '#000' }}>{entry.memo || '（なし）'}</div>
                                    </div>



                                    {/* Members Section */}
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

                                                                // Show modal if status is Won (30) or Purchased (40)
                                                                if (newStatus === 30 || newStatus === 40) {
                                                                    setSelectedEntry(entry);
                                                                    setSelectedMember(member);

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
                                                                }

                                                                // Optimistic Update
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
                                                                    // Revert if needed, but for now simple alert
                                                                }
                                                            }}
                                                            style={{
                                                                border: '1px solid #ccc',
                                                                borderRadius: '4px',
                                                                padding: '2px 4px',
                                                                fontSize: '12px',
                                                                backgroundColor: member.status === 1 ? '#d4edda' : '#fff' // Highlight logic
                                                            }}
                                                        >
                                                            {statusOptions.filter(opt => opt.code !== 10).map(opt => (
                                                                <option key={opt.code} value={opt.code}>{opt.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ color: '#999', fontSize: '12px' }}>メンバー登録なし</div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Link href={`/entries/${entry.id}?productId=${productId}`}>
                                            <button style={{ backgroundColor: '#1e90ff', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
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
                }}
            >
                <Link href={`/entries/create?productId=${productId}`}>
                    <button
                        style={{
                            backgroundColor: '#fff',
                            color: '#333',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                        }}
                    >
                        抽選情報登録
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
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={() => setShowItemsModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            padding: '20px',
                            maxWidth: '500px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflow: 'auto',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px' }}>購入商品登録</h2>
                            <button
                                onClick={() => setShowItemsModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: 0 }}
                            >
                                ×
                            </button>
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
                                            <div
                                                key={relation.code}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold' }}>{relation.shortName}</div>
                                                    <div style={{ fontSize: '12px', color: '#666' }}>¥{relation.price.toLocaleString()}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <button
                                                        onClick={() => {
                                                            const newQty = Math.max(0, qty - 1);
                                                            setItemQuantities(prev => ({ ...prev, [relation.code]: newQty }));
                                                        }}
                                                        style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            border: '1px solid #ccc',
                                                            borderRadius: '4px',
                                                            backgroundColor: '#fff',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={qty}
                                                        onChange={(e) => {
                                                            const newQty = Math.max(0, parseInt(e.target.value) || 0);
                                                            setItemQuantities(prev => ({ ...prev, [relation.code]: newQty }));
                                                        }}
                                                        style={{
                                                            width: '50px',
                                                            textAlign: 'center',
                                                            border: '1px solid #ccc',
                                                            borderRadius: '4px',
                                                            padding: '4px',
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newQty = qty + 1;
                                                            setItemQuantities(prev => ({ ...prev, [relation.code]: newQty }));
                                                        }}
                                                        style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            border: '1px solid #ccc',
                                                            borderRadius: '4px',
                                                            backgroundColor: '#fff',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div style={{ width: '80px', textAlign: 'right', fontSize: '14px' }}>
                                                    ¥{subtotal.toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                                    関連商品がありません
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '2px solid #333', paddingTop: '12px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
                                <span>合計:</span>
                                <span>
                                    ¥{Object.entries(itemQuantities).reduce((total, [code, qty]) => {
                                        const relation = product.productRelations?.find((r: any) => r.code === code);
                                        return total + (relation ? relation.price * qty : 0);
                                    }, 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowItemsModal(false)}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    backgroundColor: '#fff',
                                    cursor: 'pointer',
                                }}
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const items = product.productRelations
                                            ?.map((relation: any) => ({
                                                code: relation.code,
                                                shortName: relation.shortName,
                                                quantity: itemQuantities[relation.code] || 0,
                                                amount: relation.price * (itemQuantities[relation.code] || 0),
                                            }))
                                            .filter((item: any) => item.quantity > 0) || [];

                                        const res = await fetch(`/api/entries/${selectedEntry.id}/members/${selectedMember.id}/items`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ items }),
                                        });

                                        if (!res.ok) {
                                            throw new Error('Failed to save items');
                                        }

                                        alert('購入商品を登録しました');
                                        setShowItemsModal(false);
                                    } catch (error) {
                                        console.error('Error saving items:', error);
                                        alert('購入商品の登録に失敗しました');
                                    }
                                }}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: '#1e90ff',
                                    color: '#fff',
                                    cursor: 'pointer',
                                }}
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
