'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shop } from '../../data';

export default function ShopListPage() {
    const [shops, setShops] = useState<Shop[]>([]);
    const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchShops = async () => {
            try {
                const res = await fetch('/api/shops');
                if (res.ok) {
                    const data = await res.json();
                    setShops(data);
                    setFilteredShops(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchShops();
    }, []);

    // 検索処理
    useEffect(() => {
        if (!searchQuery) {
            setFilteredShops(shops);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = shops.filter(shop =>
                shop.name.toLowerCase().includes(lowerQuery)
            );
            setFilteredShops(filtered);
        }
    }, [searchQuery, shops]);

    return (
        <main style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif', color: '#333' }}>
            <header style={{
                backgroundColor: '#1e90ff',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: '0 0 10px 10px',
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                maxWidth: '600px',
                margin: '0 auto 24px auto',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div>
                    <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>店舗マスタ一覧</h1>
                    <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}>
                        <Link href="/master" style={{ color: '#fff', textDecoration: 'underline' }}>メニュー</Link> &gt; 店舗マスタ
                    </div>
                </div>
                <Link href="/master/shops/create">
                    <button style={{
                        backgroundColor: '#fff',
                        color: '#1e90ff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        + 新規
                    </button>
                </Link>
            </header>

            {/* 検索ボックス */}
            <div style={{ maxWidth: '600px', margin: '0 auto 16px auto', padding: '0 16px' }}>
                <input
                    type="text"
                    placeholder="店舗名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                    }}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', marginTop: '40px' }}>読み込み中...</div>
            ) : (
                <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#e6f2ff', color: '#1e90ff', borderBottom: '2px solid #cce5ff' }}>
                                <th style={{ padding: '12px', textAlign: 'left', width: '80px', fontWeight: 'bold' }}>ID</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>店舗名</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '60px', fontWeight: 'bold' }}>表示</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '60px', fontWeight: 'bold' }}>順序</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '70px', fontWeight: 'bold' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredShops.map((shop) => (
                                <tr key={shop.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px', fontFamily: 'monospace', color: '#333' }}>{shop.id}</td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#000' }}>{shop.name}</div>
                                        {shop.shortName && <div style={{ fontSize: '12px', color: '#555' }}>{shop.shortName}</div>}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        {shop.displayFlag ? <span style={{ color: 'green', fontWeight: 'bold', fontSize: '12px' }}>ON</span> : <span style={{ color: '#999', fontSize: '12px' }}>OFF</span>}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center', color: '#333' }}>{shop.order}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <Link href={`/master/shops/${shop.id}`}>
                                            <button style={{
                                                backgroundColor: '#fff',
                                                border: '1px solid #1e90ff',
                                                color: '#1e90ff',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}>編集</button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}
