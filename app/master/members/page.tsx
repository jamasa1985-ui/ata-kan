'use client';

import Link from 'next/link';
import Header from '../../_components/Header';
import { useEffect, useState } from 'react';

type Member = {
    id: string;
    name: string;
    shortName?: string;
    displayFlag: boolean;
    order: number;
    primaryFlg?: boolean;
};

export default function MemberListPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const res = await fetch('/api/members');
                if (res.ok) {
                    const data = await res.json();
                    // Sort logic if not provided by API
                    data.sort((a: Member, b: Member) => a.order - b.order);
                    setMembers(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, []);

    return (
        <main style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '40px', paddingTop: '80px', fontFamily: 'system-ui, sans-serif', color: '#333' }}>
            <Header
                title="メンバーマスタ一覧"
                backLinkText="メニュー"
                backLinkHref="/master"
                maxWidth="600px"
                rightContent={
                    <Link href="/master/members/create">
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

            {loading ? (
                <div style={{ textAlign: 'center', marginTop: '40px' }}>読み込み中...</div>
            ) : (
                <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#e6f2ff', color: '#1e90ff', borderBottom: '2px solid #cce5ff' }}>
                                <th style={{ padding: '12px', textAlign: 'left', width: '80px', fontWeight: 'bold' }}>ID</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>メンバー名</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '60px', fontWeight: 'bold' }}>表示</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '60px', fontWeight: 'bold' }}>順序</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '60px', fontWeight: 'bold' }}>主</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '70px', fontWeight: 'bold' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((member) => (
                                <tr key={member.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px', fontFamily: 'monospace', color: '#333' }}>{member.id}</td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#000' }}>{member.name}</div>
                                        {member.shortName && <div style={{ fontSize: '12px', color: '#555' }}>{member.shortName}</div>}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        {member.displayFlag ? <span style={{ color: 'green', fontWeight: 'bold', fontSize: '12px' }}>ON</span> : <span style={{ color: '#999', fontSize: '12px' }}>OFF</span>}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center', color: '#333' }}>{member.order}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        {member.primaryFlg && <span style={{ color: '#ff9800', fontWeight: 'bold' }}>★</span>}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <Link href={`/master/members/${member.id}`}>
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
