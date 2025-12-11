'use client';

import { useRouter } from 'next/navigation';
import MemberForm, { MemberFormData } from '../_components/MemberForm';

export default function CreateMemberPage() {
    const router = useRouter();

    const handleCreate = async (data: MemberFormData) => {
        const response = await fetch('/api/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('登録に失敗しました');

        alert('メンバーを登録しました');
        router.push('/master/members');
        router.refresh();
    };

    return <MemberForm onSubmit={handleCreate} />;
}
