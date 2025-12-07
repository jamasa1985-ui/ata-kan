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
        return productEntries.filter((e) => {
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
    }, [productEntries, statusFilter, keyword, statusMap]);

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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '14px' }}>{statusName}</span>
                                    <span style={{ fontSize: '14px' }}>
                                        {entry.resultDate ? formatShortDate(entry.resultDate) : ''}
                                        <span style={{ marginLeft: '4px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>
                                            ^
                                        </span>
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
        </main>
    );
}
