// app/lotteries/page.tsx
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Header from '../_components/Header';
import { useSearchParams } from 'next/navigation';

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
    purchaseMembers?: any[];
};

type StatusOption = {
    code: number;
    name: string;
    order: number;
};

type StatusFilter = 'すべて' | string;

function LotteriesContent() {
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode');
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);

    // Dynamic Options State
    const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
    const [statusMap, setStatusMap] = useState<Record<string, string>>({});
    const [applyMethodMap, setApplyMethodMap] = useState<Record<string, string>>({});

    // Filter State
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('すべて');
    const [productFilter, setProductFilter] = useState<string>('すべて');
    const [shopFilter, setShopFilter] = useState<string>('');

    // Detailed mode state
    const [isDetailMode, setIsDetailMode] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Purchase Items Modal State
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
    const [modalProduct, setModalProduct] = useState<any>(null);

    // Fetch Entries
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [entriesRes, optionsRes] = await Promise.all([
                    fetch('/api/entries/all'),
                    fetch('/api/options')
                ]);

                if (entriesRes.ok) {
                    const data = await entriesRes.json();
                    setEntries(data);
                }

                if (optionsRes.ok) {
                    const data = await optionsRes.json();

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
                        const amMap: Record<string, string> = {};
                        amOpts.forEach(opt => amMap[opt.code.toString()] = opt.name);
                        setApplyMethodMap(amMap);
                    }
                }

            } catch (error) {
                console.error('データの取得に失敗しました:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Helpers
    const getStatusName = (statusCode: string | number) => {
        return statusMap[statusCode.toString()] || statusCode.toString();
    };

    const getApplyMethodName = (code: string | number | undefined) => {
        if (!code) return 'WEB';
        return applyMethodMap[code.toString()] || code.toString();
    };

    // Toggle logic
    useEffect(() => {
        if (isDetailMode) {
            setExpandedIds(new Set(entries.map(e => e.id)));
        } else {
            setExpandedIds(new Set());
        }
    }, [isDetailMode, entries]);

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

    // Get unique products for filter
    const uniqueProducts = useMemo(() => {
        const products = new Map<string, string>();
        entries.forEach(e => {
            if (e.productId && e.productName) {
                products.set(e.productId, e.productName);
            }
        });
        return Array.from(products.entries()).map(([id, name]) => ({ id, name }));
    }, [entries]);

    // Filtered Entries
    const filteredEntries = useMemo(() => {
        const filtered = entries.filter((e) => {
            // Mode-based filtering
            if (mode === 'info') {
                // 抽選情報: entriesのstatusが99以外のものは全て
                // statusが99のものはresultDateが14日経過していないもの
                if (e.status === 99) {
                    if (!e.resultDate) return false;
                    const resultDate = new Date(e.resultDate);
                    const now = new Date();
                    const diffTime = now.getTime() - resultDate.getTime();
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);
                    // resultDateが14日以内のもの (未来の日付も含むならdiffDays < 14)
                    // "14日経過していない" = diffDays <= 14
                    if (diffDays > 14) return false;
                }
            } else if (mode === 'results') {
                // 当落管理: entriesのstatusが20,30,99のもの全て
                const validStatuses = [20, 30, 99];
                if (!validStatuses.includes(e.status)) return false;
            }

            // Normal filters (User manually selecting dropdowns still apply WITHIN the mode)
            // But usually "mode" implies a preset view.
            // Let's assume User filters (Product/Shop/Status dropdowns) act as ADDITIONAL filters
            // on top of the mode-restricted dataset.

            // Status filter (Manual)

            const sName = getStatusName(e.status);
            if (statusFilter !== 'すべて' && sName !== statusFilter) {
                return false;
            }

            // Product filter
            if (productFilter !== 'すべて' && e.productId !== productFilter) {
                return false;
            }

            // Shop filter (partial match)
            if (shopFilter && !e.shopShortName.includes(shopFilter)) {
                return false;
            }

            return true;
        });

        // Create a map for status order
        const statusOrder: Record<string, number> = {};
        statusOptions.forEach(opt => {
            statusOrder[opt.code.toString()] = opt.order;
        });

        // Helper to get date for sorting
        const getSortDate = (entry: Entry, statusName: string) => {
            if (statusName.includes('未応募') || statusName.includes('応募中')) return entry.applyEnd;
            if (statusName.includes('応募済')) return entry.resultDate;
            if (statusName.includes('当選')) return entry.purchaseEnd;
            if (statusName.includes('購入済')) return entry.purchaseDate;
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
            const dateA = getSortDate(a, statusNameA);
            const statusNameB = getStatusName(b.status);
            const dateB = getSortDate(b, statusNameB);

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return new Date(dateA).getTime() - new Date(dateB).getTime();
        });
    }, [entries, statusFilter, productFilter, shopFilter, statusMap, statusOptions, mode]);

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
            dateVal = entry.purchaseDate || '';
        }

        return { label, dateVal };
    };

    if (loading) {
        return (
            <main style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
                <p>読み込み中...</p>
            </main>
        );
    }

    return (
        <main
            style={{
                minHeight: '100vh',
                padding: '80px 12px 80px 12px',
                fontFamily: 'system-ui, sans-serif',
                backgroundColor: '#f5f5f5',
                color: '#333',
                maxWidth: 480,
                margin: '0 auto',
                position: 'relative',
            }}
        >
            <Header title={mode === 'info' ? '抽選情報' : mode === 'results' ? '当落管理' : '抽選一覧'} backLinkText="TOPへ戻る" />

            {/* Filters Section */}
            <section
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '10px',
                    border: '1px solid #ddd',
                }}
            >
                {/* Product Filter */}
                <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>
                        商品で絞り込み:
                    </label>
                    <select
                        value={productFilter}
                        onChange={(e) => setProductFilter(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '6px',
                            fontSize: '14px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                        }}
                    >
                        <option value="すべて">すべて</option>
                        {uniqueProducts.map(product => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Shop Filter */}
                <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>
                        店舗で絞り込み:
                    </label>
                    <input
                        type="text"
                        value={shopFilter}
                        onChange={(e) => setShopFilter(e.target.value)}
                        placeholder="店舗名を入力（部分一致）"
                        style={{
                            width: '100%',
                            padding: '6px',
                            fontSize: '14px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                        }}
                    />
                </div>

                {/* Status Filter */}
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

            {/* Entries List */}
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
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: isOpen ? 'bold' : 'normal' }}>
                                        {entry.shopShortName}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666' }}>
                                        {entry.productName}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '14px' }}>{statusName}</span>
                                    <span style={{
                                        fontSize: '14px',
                                        display: 'flex',
                                        gap: '4px',
                                        width: '110px',
                                        justifyContent: 'flex-end',
                                        color: headerInfo.label ? '#333' : 'transparent'
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
                                    {/* Status & Apply Method */}
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 'bold', color: '#000' }}>ステータス：</div>
                                        <span style={{ color: '#000' }}>{statusName}</span>

                                        <div style={{ fontWeight: 'bold', marginLeft: '8px', color: '#000' }}>応募方法：</div>
                                        <span style={{ color: '#000' }}>{applyMethodName}</span>
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
                                                                }

                                                                // Optimistic Update
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
                                                                borderRadius: '4px',
                                                                padding: '2px 4px',
                                                                fontSize: '12px',
                                                                backgroundColor: member.status === 1 ? '#d4edda' : '#fff'
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
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
                                        <Link href={`/entries/${entry.id}?productId=${entry.productId}&from=lotteries&mode=${mode || ''}`}>
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
                <Link href="/entries/create">
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
            {showItemsModal && modalProduct && selectedEntry && selectedMember && (
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
                            {modalProduct.productRelations && modalProduct.productRelations.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {modalProduct.productRelations.map((relation: any) => {
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
                                        const relation = modalProduct.productRelations?.find((r: any) => r.code === code);
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
                                        const items = modalProduct.productRelations
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

                                        setShowItemsModal(false);
                                        alert('購入商品情報を保存しました');
                                    } catch (error) {
                                        console.error('Error saving items:', error);
                                        alert('保存に失敗しました');
                                    }
                                }}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: '#1e90ff',
                                    color: '#fff',
                                    fontWeight: 'bold',
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
export default function LotteriesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LotteriesContent />
        </Suspense>
    );
}
