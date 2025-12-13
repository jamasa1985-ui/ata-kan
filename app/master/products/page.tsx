'use client';

import Link from 'next/link';
import Header from '../../_components/Header';
import { useEffect, useState } from 'react';

// リスト表示用に必要な型定義（data.tsのProduct型と互換性ある形で）
type Product = {
    id: string;
    name: string;
    shortName?: string;
    displayFlag: boolean;
    releaseDate?: string | Date;
};

export default function ProductListPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                // all=true で全件取得（日付フィルタなし）
                const res = await fetch('/api/products?all=true');
                if (res.ok) {
                    const data = await res.json();
                    // IDの降順で表示
                    const sortedData = data.sort((a: Product, b: Product) => b.id.localeCompare(a.id));
                    setProducts(sortedData);
                    setFilteredProducts(sortedData);
                } else {
                    console.error('Failed to fetch products');
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // 検索処理
    useEffect(() => {
        if (!searchQuery) {
            setFilteredProducts(products);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = products.filter(product =>
                product.name.toLowerCase().includes(lowerQuery)
            );
            setFilteredProducts(filtered);
        }
    }, [searchQuery, products]);

    const formatDate = (date: string | Date | undefined) => {
        if (!date) return '-';
        const d = new Date(date);
        return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    };

    return (
        <main style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '40px', paddingTop: '80px', fontFamily: 'system-ui, sans-serif', color: '#333' }}>
            <Header
                title="商品マスタ一覧"
                backLinkText="メニュー"
                backLinkHref="/master"
                maxWidth="600px"
                rightContent={
                    <Link href="/master/products/create">
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
                }
            />

            {/* 検索ボックス */}
            <div style={{ maxWidth: '600px', margin: '0 auto 16px auto', padding: '0 16px' }}>
                <input
                    type="text"
                    placeholder="商品名で検索..."
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
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>商品名</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '60px', fontWeight: 'bold' }}>表示</th>
                                <th style={{ padding: '12px', textAlign: 'left', width: '100px', fontWeight: 'bold' }}>発売日</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '70px', fontWeight: 'bold' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px', fontFamily: 'monospace', color: '#333' }}>{product.id}</td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#000' }}>{product.name}</div>
                                        {product.shortName && <div style={{ fontSize: '12px', color: '#555' }}>{product.shortName}</div>}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        {product.displayFlag ? (
                                            <span style={{ color: 'green', fontWeight: 'bold', fontSize: '12px' }}>ON</span>
                                        ) : (
                                            <span style={{ color: '#999', fontSize: '12px' }}>OFF</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '14px', color: '#333' }}>{formatDate(product.releaseDate)}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <Link href={`/master/products/${product.id}`}>
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
