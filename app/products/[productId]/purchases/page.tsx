'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { Entry, Product } from '../../../data';

type StatusOption = {
    code: number;
    name: string;
    order: number;
};

// Tabs for Purchase Page: All (30+40), Before Purchase (30), Purchased (40)
type PurchaseTab = 'すべて' | '購入前' | '購入済';

type PageProps = {
    params: Promise<{ productId: string }>;
};

export default function ProductPurchasesPage({ params }: PageProps) {
    const { productId } = use(params);

    const [product, setProduct] = useState<Product | null>(null);
    const [productLoading, setProductLoading] = useState(true);
    const [productEntries, setProductEntries] = useState<Entry[]>([]);

    // Dynamic Options State
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

                    // OP002: Status
                    if (data.OP002) {
                        const sOpts: StatusOption[] = data.OP002;
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
                console.error('オプション情報の取得エラー:', error);
            }
        };

        if (productId) {
            fetchProduct();
            fetchOptions();
        }
    }, [productId]);

    // Fetch Entries and Initial Filter
    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const response = await fetch(`/api/products/${productId}/entries`);
                if (!response.ok) {
                    throw new Error('応募データの取得に失敗しました');
                }
                const data: Entry[] = await response.json();
                // Filter for Purchase Management screen: Only 30 (Won) and 40 (Purchased)
                const targetStatuses = ['30', '40'];
                const filtered = data.filter(e => targetStatuses.includes(e.status.toString()));
                setProductEntries(filtered);
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

    // Toggle logic for Detail Mode
    useEffect(() => {
        if (isDetailMode) {
            setExpandedIds(new Set(productEntries.map(e => e.id)));
        } else {
            setExpandedIds(new Set());
        }
    }, [isDetailMode, productEntries]);


    const [currentTab, setCurrentTab] = useState<PurchaseTab>('すべて');
    const [keyword, setKeyword] = useState('');

    const filteredEntries = useMemo(() => {
        return productEntries.filter((e) => {
            // Tab filtering logic
            // 30: 購入前 (Won), 40: 購入済 (Purchased)
            if (currentTab === '購入前' && e.status.toString() !== '30') return false;
            if (currentTab === '購入済' && e.status.toString() !== '40') return false;

            if (keyword.trim() === '') return true;
            const k = keyword.trim().toLowerCase();
            return (
                e.productName.toLowerCase().includes(k) ||
                e.shopShortName.toLowerCase().includes(k)
            );
        });
    }, [productEntries, currentTab, keyword]);

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

    // Tab Definitions
    const tabs: PurchaseTab[] = ['すべて', '購入前', '購入済'];

    return (
        <main
            style={{
                minHeight: '100vh',
                padding: '12px 12px 80px 12px', // Footer space
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
                    backgroundColor: '#1e90ff', // Blue for Purchase Page
                    color: '#fff',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    購入管理
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

                    return (
                        <div
                            key={entry.id}
                            style={{
                                backgroundColor: isOpen ? '#fff' : '#e6f2ff', // Light blue default
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
                                    backgroundColor: isOpen ? '#e6f2ff' : '#fff', // Swapped from results page logic? Let's stick to standard: open=colored header or white? 
                                    // User image shows header is Light Blue (#d0e7ff approx) when open? 
                                    // Actually image "ポケセンオンライン" is light blue header. 
                                    // Let's use light blue for header always or when open.
                                    // Let's stick to similar style: Light header.
                                    background: '#e6f2ff'
                                }}
                            >
                                <div style={{ fontSize: '16px', fontWeight: isOpen ? 'bold' : 'normal' }}>
                                    {entry.shopShortName}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '14px' }}>
                                        {statusName === '購入済' ? `購入：${formatDate(entry.purchaseDate).split(' ')[0].slice(5)}` : `購：`}
                                    </span>
                                    <span style={{ marginLeft: '4px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>
                                        ^
                                    </span>
                                </div>
                            </div>

                            {isOpen && (
                                <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #eee', backgroundColor: '#fff' }}>

                                    {/* Purchase Date */}
                                    <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '15px' }}>
                                        購入日時： <span style={{ fontWeight: 'normal' }}>{entry.purchaseDate ? formatDate(entry.purchaseDate) : ''}</span>
                                    </div>

                                    {/* Quantity Breakdown (Placeholder) */}
                                    <div style={{ marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>数量内訳：</div>
                                        {/* Mock Data based on image */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', marginBottom: '2px' }}>
                                            <span>MﾄﾞﾘBOX</span>
                                            <span>け：1個　ま：1個</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px' }}>
                                            <span>MﾄﾞﾘPAC</span>
                                            <span>け：0個　ま：0個</span>
                                        </div>
                                    </div>

                                    {/* Memo readonly */}
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
                                        <button style={{ backgroundColor: '#6c757d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'not-allowed' }} disabled>
                                            購入商品
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Total Area (Fixed above Footer) */}
            <div style={{
                position: 'fixed',
                bottom: 60, // Height of footer
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                maxWidth: '480px',
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #ccc',
                padding: '8px 16px',
                zIndex: 90,
                textAlign: 'right',
                fontWeight: 'bold',
                fontSize: '14px',
                lineHeight: 1.4
            }}>
                <div>MﾄﾞﾘBOX : 29個</div>
                <div>MﾄﾞﾘPAC : 0個</div>
                <div>け合計 : 121,000円</div>
                <div>ま合計 : 38,500円</div>
                <div style={{ fontSize: '16px' }}>合計 : 159,500円</div>
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
