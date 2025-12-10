import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// ヘルパー: 日付文字列をDateオブジェクトに変換（無効ならnull）
const parseDate = (val: any): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

// ヘルパー: 期限が「今日」から「7日後」の間にあるか判定
const isApproaching = (targetDate: Date, now: Date, sevenDaysLater: Date): boolean => {
    // 時間を無視して日付のみで比較するために、時刻を00:00:00に設定
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(sevenDaysLater);
    end.setHours(23, 59, 59, 999); // 7日後の終わりまで

    return target >= start && target <= end;
};

type AlertCounts = {
    applyEnd: number;
    resultDate: number;
    purchaseEnd: number;
};

type ProductAlert = {
    id: string;
    name: string;
    alertCounts: AlertCounts;
};

export async function GET() {
    try {
        // 全商品取得
        const productsSnapshot = await adminDb.collection('products').get();
        const now = new Date();
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(now.getDate() - 14);

        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(now.getDate() + 7);

        // 商品をIDでマップ化し、同時に新商品かどうかも判定
        const productMap = new Map<string, { name: string, isCurrent: boolean, counts: AlertCounts }>();

        productsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            let releaseDate: Date | null = null;
            if (data.releaseDate) {
                if (typeof data.releaseDate.toDate === 'function') releaseDate = data.releaseDate.toDate();
                else if (typeof data.releaseDate === 'string') releaseDate = new Date(data.releaseDate);
            }

            // 表示フラグがない、またはfalseの場合はスキップするか？
            // 要件では「発売日が今日-14より新しい商品」とあるが、displayFlagについての言及はない。
            // しかし通常非表示商品は出さない方が良いのでチェックする。
            if (data.displayFlag !== false) { // undefinedはtrue扱い（レガシー互換）または明示的にfalseでなければ
                const isCurrent = releaseDate ? releaseDate >= fourteenDaysAgo : false;
                productMap.set(doc.id, {
                    name: data.name || '名称未設定',
                    isCurrent,
                    counts: { applyEnd: 0, resultDate: 0, purchaseEnd: 0 }
                });
            }
        });

        // 全エントリ取得 (collectionGroupを使用)
        // 効率化のため。ただしセキュリティルールに注意（Admin SDKなので無視されるが）
        const entriesSnapshot = await adminDb.collectionGroup('entries').get();

        entriesSnapshot.docs.forEach(doc => {
            const data = doc.data();

            // エントリは商品のサブコレクションではなく、トップレベルのコレクション
            // productIdはドキュメントのフィールドとして保存されている
            const productId = data.productId;

            if (!productId) {
                return;
            }

            const productInfo = productMap.get(productId);
            if (!productInfo) {
                return; // 対象外の商品（displayFlag=falseなど）ならスキップ
            }
            const status = Number(data.status); // ステータスを数値として取得
            const applyEnd = parseDate(data.applyEnd);
            const resultDate = parseDate(data.resultDate);
            const purchaseEnd = parseDate(data.purchaseEnd);

            // 応募締切: ステータスが「0 (未応募)」かつ応募終了日時が近い
            if (status === 0 && applyEnd && isApproaching(applyEnd, now, sevenDaysLater)) {
                productInfo.counts.applyEnd++;
            }

            // 発表日: ステータスが「10 (応募中)」または「20 (応募済)」かつ発表日時が近い
            if ((status === 10 || status === 20) && resultDate && isApproaching(resultDate, now, sevenDaysLater)) {
                productInfo.counts.resultDate++;
            }

            // 購入期限: ステータスが「30 (当選)」かつ購入期限終了日時が近い
            if (status === 30 && purchaseEnd && isApproaching(purchaseEnd, now, sevenDaysLater)) {
                productInfo.counts.purchaseEnd++;
            }
        });

        const alerts: ProductAlert[] = [];
        const pastAlerts: AlertCounts = { applyEnd: 0, resultDate: 0, purchaseEnd: 0 };
        let hasPastAlerts = false;

        productMap.forEach((info, id) => {
            const { applyEnd, resultDate, purchaseEnd } = info.counts;
            const hasAlert = applyEnd > 0 || resultDate > 0 || purchaseEnd > 0;

            if (hasAlert) {
                if (info.isCurrent) {
                    alerts.push({
                        id,
                        name: info.name,
                        alertCounts: info.counts
                    });
                } else {
                    pastAlerts.applyEnd += applyEnd;
                    pastAlerts.resultDate += resultDate;
                    pastAlerts.purchaseEnd += purchaseEnd;
                    hasPastAlerts = true;
                }
            }
        });

        console.log('📊 Final Alert Results:', {
            currentProducts: alerts,
            pastProducts: hasPastAlerts ? pastAlerts : null
        });

        return NextResponse.json({
            currentProducts: alerts,
            pastProducts: hasPastAlerts ? pastAlerts : null
        });

    } catch (error) {
        console.error('アラートデータの取得に失敗しました:', error);
        return NextResponse.json(
            { error: 'アラートデータの取得に失敗しました' },
            { status: 500 }
        );
    }
}
