import { adminDb } from './firebase-admin';
import * as admin from 'firebase-admin';

type SequenceType = 'entry' | 'product' | 'shop' | 'member';

/**
 * 指定されたタイプの次のシーケンス番号を取得・更新します。
 * 現在の seq 値をタイプごとのフォーマット（例: M001, P0001）で返し、DB上の値を +1 します。
 * ドキュメントが存在しない場合は作成し、1 (のフォーマット済み文字列) を返します。
 */
export async function getNextSequence(t: admin.firestore.Transaction, type: SequenceType): Promise<string> {
    const docRef = adminDb.collection('seqManagement').doc(type);
    const doc = await t.get(docRef);

    let currentSeq: number;

    if (!doc.exists) {
        // ドキュメントが存在しない場合、初期化して1を使う（次は2）
        currentSeq = 1;
        t.set(docRef, { seq: 2 });
    } else {
        const data = doc.data();
        const seqVal = data?.seq;

        if (typeof seqVal !== 'number') {
            // 数値でない場合リセット
            currentSeq = 1;
            t.set(docRef, { seq: 2 });
        } else {
            currentSeq = seqVal;
            t.update(docRef, { seq: currentSeq + 1 });
        }
    }

    // フォーマット適用
    switch (type) {
        case 'member':
            // M + 3桁ゼロ埋め (例: M001)
            return `M${currentSeq.toString().padStart(3, '0')}`;
        case 'product':
            // P + 4桁ゼロ埋め (例: P0001)
            return `P${currentSeq.toString().padStart(4, '0')}`;
        case 'shop':
            // S + 4桁ゼロ埋め (例: S0001)
            return `S${currentSeq.toString().padStart(4, '0')}`;
        case 'entry':
        default:
            // そのまま文字列化
            return currentSeq.toString();
    }
}
