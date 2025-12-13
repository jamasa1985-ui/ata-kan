'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '../../../_components/Header';

export type MemberFormData = {
    name: string;
    shortName: string;
    displayFlag: boolean;
    order: number;
    primaryFlg: boolean;
};

type Props = {
    initialData?: MemberFormData;
    isEdit?: boolean;
    memberId?: string;
    onSubmit: (data: MemberFormData) => Promise<void>;
    onDelete?: () => Promise<void>;
};

export default function MemberForm({ initialData, isEdit, memberId, onSubmit, onDelete }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<MemberFormData>(initialData || {
        name: '',
        shortName: '',
        displayFlag: true,
        order: 999,
        primaryFlg: false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm(isEdit ? '更新してもよろしいですか？' : '登録してもよろしいですか？')) return;

        setLoading(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error(error);
            alert('エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        if (!confirm('本当に削除しますか？この操作は取り消せません。')) return;
        setLoading(true);
        try {
            await onDelete();
        } catch (error) {
            console.error(error);
            alert('削除エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '40px', paddingTop: '80px', fontFamily: 'system-ui, sans-serif', color: '#000' }}>
            <Header
                title={isEdit ? 'メンバー編集' : 'メンバー登録'}
                backLinkText="一覧に戻る"
                backLinkHref="/master/members"
                maxWidth="600px"
                rightContent={isEdit && (
                    <div style={{ fontSize: '12px', color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                        ID: <span style={{ fontFamily: 'monospace' }}>{memberId}</span>
                    </div>
                )}
            />

            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>メンバー名 <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '16px', color: '#000' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>略称</label>
                            <input type="text" value={formData.shortName} onChange={(e) => setFormData({ ...formData, shortName: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', color: '#000' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>表示順</label>
                            <input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', color: '#000' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input type="checkbox" checked={formData.displayFlag} onChange={(e) => setFormData({ ...formData, displayFlag: e.target.checked })} style={{ transform: 'scale(1.2)', marginRight: '8px' }} />
                            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>表示フラグ</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input type="checkbox" checked={formData.primaryFlg} onChange={(e) => setFormData({ ...formData, primaryFlg: e.target.checked })} style={{ transform: 'scale(1.2)', marginRight: '8px' }} />
                            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>主（メイン）</label>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '40px', paddingBottom: '40px' }}>
                <Link href="/master/members">
                    <button type="button" style={{ padding: '12px 24px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', color: '#333' }}>キャンセル</button>
                </Link>
                {isEdit && onDelete && (
                    <button type="button" onClick={handleDelete} disabled={loading} style={{ padding: '12px 24px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>削除</button>
                )}
                <button type="submit" disabled={loading} style={{ padding: '12px 48px', backgroundColor: '#1e90ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{loading ? '処理中...' : (isEdit ? '更新する' : '登録する')}</button>
            </div>
        </form>
    );
}
