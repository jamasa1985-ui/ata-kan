import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
    try {
        // 期間設定: 1ヶ月前〜1ヶ月後
        const today = new Date();
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const oneMonthLater = new Date(today);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

        // 未定イベント用の最も未来の日付
        const invalidFuture = new Date(oneMonthLater);
        invalidFuture.setDate(invalidFuture.getDate() + 1);

        // 全商品を取得
        const productsSnapshot = await adminDb.collection('products').get();
        const products: Record<string, { name: string; shortName: string }> = {};
        productsSnapshot.forEach(doc => {
            const data = doc.data();
            products[doc.id] = {
                name: data.name || '',
                shortName: data.shortName || ''
            };
        });

        // 全店舗を取得
        const shopsSnapshot = await adminDb.collection('shops').get();
        const shops: Record<string, string> = {};
        shopsSnapshot.forEach(doc => {
            const data = doc.data();
            shops[doc.id] = data.name || '';
        });

        // 全抽選情報を取得
        const entriesSnapshot = await adminDb.collection('entries').get();
        const scheduleItems: any[] = [];

        entriesSnapshot.forEach(doc => {
            const entry = doc.data();
            const status = entry.status;
            const productId = entry.productId;
            const shopShortName = entry.shopShortName || '';
            const url = entry.url || '';
            const product = products[productId];

            if (!product) return;

            const addItem = (dateStr: any, type: string) => {
                let sortDate: Date;
                let dateDisplay = '';
                let timeDisplay = '';

                // 未定または空の場合
                if (!dateStr) {
                    sortDate = invalidFuture;
                    dateDisplay = '';
                    timeDisplay = '';
                } else {
                    const dt = new Date(dateStr);
                    if (isNaN(dt.getTime())) {
                        sortDate = invalidFuture;
                        dateDisplay = '';
                        timeDisplay = '';
                    } else {
                        sortDate = dt;
                        // 日付フォーマット: MM/DD(曜)
                        const mm = String(dt.getMonth() + 1).padStart(2, '0');
                        const dd = String(dt.getDate()).padStart(2, '0');
                        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
                        const w = weekdays[dt.getDay()];
                        dateDisplay = `${mm}/${dd}(${w})`;

                        // 時間フォーマット: HH:mm
                        const hh = String(dt.getHours()).padStart(2, '0');
                        const mi = String(dt.getMinutes()).padStart(2, '0');
                        timeDisplay = `${hh}:${mi}`;
                    }
                }

                // 未定は必ず通す or 日付範囲内のものだけ通す
                if (!dateStr || (sortDate >= oneMonthAgo && sortDate <= oneMonthLater)) {
                    scheduleItems.push({
                        sortDate: sortDate.toISOString(),
                        sortTime: timeDisplay,
                        sortType: type,
                        monthId: dateDisplay ? `${sortDate.getFullYear()}-${String(sortDate.getMonth() + 1).padStart(2, '0')}` : '',
                        date: dateDisplay,
                        time: timeDisplay,
                        type: type,
                        shopName: shopShortName,
                        productName: product.name,
                        productShortName: product.shortName,
                        productId: productId,
                        entryId: doc.id,
                        url: url
                    });
                }
            };

            // ステータスに応じてイベントを追加
            if ([0, 10, 20].includes(status)) {
                addItem(entry.applyStart, '応募');
                addItem(entry.applyEnd, '応〆');
            }
            if (status === 20) {
                addItem(entry.resultDate, '当落');
            }
            if (status === 30) {
                addItem(entry.purchaseStart, '購入');
                addItem(entry.purchaseEnd, '購〆');
            }
        });

        // ソート: 日付→時間→種別順
        const typeOrder: Record<string, number> = { '応募': 1, '応〆': 2, '当落': 3, '購入': 4, '購〆': 5 };
        scheduleItems.sort((a, b) => {
            if (a.sortDate !== b.sortDate) return a.sortDate.localeCompare(b.sortDate);
            if (a.sortTime !== b.sortTime) return a.sortTime.localeCompare(b.sortTime);
            return (typeOrder[a.sortType] || 99) - (typeOrder[b.sortType] || 99);
        });

        // 商品リスト（フィルター用）
        const productList = Object.entries(products).map(([id, p]) => ({
            id,
            name: p.name
        })).sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({
            scheduleList: scheduleItems,
            productList: productList
        });
    } catch (error) {
        console.error('スケジュール取得エラー:', error);
        return NextResponse.json({ error: 'スケジュールの取得に失敗しました' }, { status: 500 });
    }
}
