'use client';

import Link from 'next/link';
import Header from '../_components/Header';

export default function MasterPage() {
    const menuItems = [
        { name: '商品マスタ', path: '/master/products', icon: '📦' },
        { name: '店舗マスタ', path: '/master/shops', icon: '🏪' },
        { name: 'メンバーマスタ', path: '/master/members', icon: '👥' },
    ];

    return (
        <main style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '40px', paddingTop: '80px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#333' }}>
            <Header title="マスターメニュー" backLinkText="TOPへ" />


            <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {menuItems.map((item) => (
                    <Link key={item.path} href={item.path} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{
                            backgroundColor: '#fff',
                            padding: '20px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid #ddd' // 枠線を少し濃く
                        }}>
                            <span style={{ fontSize: '24px' }}>{item.icon}</span>
                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000' }}>{item.name}</span>
                            <span style={{ marginLeft: 'auto', color: '#333', fontWeight: 'bold' }}>&gt;</span>
                        </div>
                    </Link>
                ))}
            </div>
        </main>
    );
}
