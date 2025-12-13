'use client';

import Link from 'next/link';
import Header from '../_components/Header';
import { useEffect, useState } from 'react';

type ScheduleItem = {
    sortDate: string;
    sortTime: string;
    sortType: string;
    monthId: string;
    date: string;
    time: string;
    type: string;
    shopName: string;
    productName: string;
    productShortName: string;
    productId: string;
    entryId: string;
    url: string;
};

type ProductFilter = {
    id: string;
    name: string;
};

export default function SchedulePage() {
    const [scheduleList, setScheduleList] = useState<ScheduleItem[]>([]);
    const [productList, setProductList] = useState<ProductFilter[]>([]);
    const [selectedProduct, setSelectedProduct] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const response = await fetch('/api/schedule');
                if (response.ok) {
                    const data = await response.json();
                    setScheduleList(data.scheduleList || []);
                    setProductList(data.productList || []);
                }
            } catch (error) {
                console.error('スケジュール取得エラー:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, []);

    // フィルタリング処理
    const filteredSchedule = scheduleList.filter(item => {
        if (selectedProduct === 'all') return true;
        return item.productName === selectedProduct;
    });

    // 月・日でグループ化
    const groupedSchedule: { [key: string]: { [key: string]: ScheduleItem[] } } = {};
    filteredSchedule.forEach(item => {
        const month = item.date ? item.monthId : '未定';
        const date = item.date || '未定';

        if (!groupedSchedule[month]) groupedSchedule[month] = {};
        if (!groupedSchedule[month][date]) groupedSchedule[month][date] = [];
        groupedSchedule[month][date].push(item);
    });

    if (loading) {
        return (
            <main style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
                <p>読み込み中...</p>
            </main>
        );
    }

    return (
        <main style={{
            minHeight: '100vh',
            // So Main needs paddingTop 56px.
            // Then Filter `top` should be 56px.
            paddingTop: '56px',
            paddingBottom: '80px',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: '#f8f9fa',
            color: '#333'
        }}>
            {/* ヘッダー */}
            <Header
                title="スケジュール"
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

            {/* フィルター */}
            <div style={{
                position: 'sticky',
                top: '56px', // Below fixed header
                zIndex: 1030,
                backgroundColor: '#fff',
                borderBottom: '1px solid #ddd',
                padding: '8px 16px',
                maxWidth: 480,
                margin: '0 auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label htmlFor="productSelect" style={{ fontSize: '14px', whiteSpace: 'nowrap', minWidth: '80px' }}>
                        商品名：
                    </label>
                    <select
                        id="productSelect"
                        className="form-select"
                        style={{
                            flex: 1,
                            padding: '6px 12px',
                            fontSize: '14px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                    >
                        <option value="all">全て</option>
                        {productList.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 本文 */}
            <div style={{
                maxWidth: 480,
                margin: '0 auto',
                padding: '16px'
            }}>
                {Object.keys(groupedSchedule).sort().map(month => {
                    const monthLabel = month === '未定' ? '未定' : `${parseInt(month.split('-')[1])}月`;

                    return (
                        <div key={month}>
                            {/* 月見出し */}
                            <div style={{
                                marginTop: '16px',
                                fontWeight: 'bold',
                                borderBottom: '2px solid #333',
                                fontSize: '16px'
                            }}>
                                {monthLabel}
                            </div>

                            {/* 日付ごとのグループ */}
                            {Object.keys(groupedSchedule[month]).map(date => {
                                const items = groupedSchedule[month][date];
                                const firstItem = items[0];

                                // 日付と曜日を抽出
                                let dayLabel = '未定';
                                let weekday = '';
                                if (date !== '未定' && firstItem.date) {
                                    const match = firstItem.date.match(/(\d+)\/(\d+)\((.)\)/);
                                    if (match) {
                                        dayLabel = parseInt(match[2]).toString();
                                        weekday = match[3];
                                    }
                                }

                                return (
                                    <div key={date} style={{ marginBottom: '8px' }}>
                                        <div style={{
                                            display: 'flex',
                                            borderBottom: '1px solid #ddd',
                                            paddingTop: '8px'
                                        }}>
                                            {/* 日付部分 */}
                                            <div style={{
                                                textAlign: 'center',
                                                paddingRight: '8px',
                                                width: '60px',
                                                flexShrink: 0
                                            }}>
                                                <div style={{ fontSize: '16px' }}>{dayLabel}</div>
                                                {weekday && (
                                                    <div style={{ fontSize: '12px' }}>({weekday})</div>
                                                )}
                                            </div>

                                            {/* イベントリスト */}
                                            <div style={{ flex: 1 }}>
                                                {items.map((item, idx) => (
                                                    <div key={idx} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        marginBottom: '4px',
                                                        fontSize: '14px'
                                                    }}>
                                                        {/* 時間 */}
                                                        <div style={{ width: '50px', textAlign: 'left', marginRight: '8px' }}>
                                                            {!item.date ? '未定' : (item.time === '00:00' ? '-' : item.time)}
                                                        </div>

                                                        {/* 種別 */}
                                                        <div style={{ width: '40px', textAlign: 'left', marginRight: '8px' }}>
                                                            {item.url ? (
                                                                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#1e90ff' }}>
                                                                    {item.type}
                                                                </a>
                                                            ) : (
                                                                item.type
                                                            )}
                                                        </div>

                                                        {/* 商品略称 */}
                                                        <div style={{ width: '40px', textAlign: 'center', flexShrink: 0, marginRight: '8px' }}>
                                                            {item.productShortName || ''}
                                                        </div>

                                                        {/* 店舗名 */}
                                                        <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            <Link
                                                                href={`/entries/${item.entryId}?productId=${item.productId}&from=schedule`}
                                                                style={{ textDecoration: 'none', color: '#1e90ff' }}
                                                            >
                                                                {item.shopName}
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* フッター */}
            <footer style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#1e90ff',
                padding: '8px 12px',
                zIndex: 100
            }}>
                <div style={{
                    maxWidth: 480,
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'flex-start'
                }}>
                    <Link href="/entries/create/schedule">
                        <button style={{
                            backgroundColor: '#fff',
                            color: '#333',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}>
                            抽選情報登録
                        </button>
                    </Link>
                </div>
            </footer>
        </main>
    );
}
