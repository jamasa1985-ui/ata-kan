// app/data.ts

// ステータス
export type EntryStatus = '未応募' | '応募済' | '当選' | '購入済' | '落選';

// 商品マスタ
export type Product = {
    id: string;   // URL用のID（スラッグ）
    name: string; // 商品名
    productRelations?: Array<{
        code: string;
        name: string;
        shortName: string;
        price: number;
        quantity: number;
        amount: number;
    }>;
};

// メンバー
export type Member = {
    id: string;
    name: string;
    primaryFlg?: boolean; // 自動セット用フラグ
    order?: number;       // 表示順
    status?: number;      // 0: 未購入? (Entry内でのステータス用)
};

// 応募データ
export type Entry = {
    id: string;
    productId: string;
    productName: string; // productShortName in Firestore
    shopShortName: string; // Firestore field
    status: EntryStatus;

    // Firestore fields
    applyStart?: string | Date;
    applyEnd?: string | Date;
    applyMethod?: string;
    resultDate?: string | Date;
    purchaseStart?: string | Date;
    purchaseEnd?: string | Date;
    purchaseDate?: string | Date; // Added for Purchase Management
    purchaseMembers?: Member[]; // Added for Purchase Member Management
    url?: string;
    memo?: string;

    // Legacy/Mock compatibility
    buyDeadline?: string;
};

export const products: Product[] = [
    { id: 'mega-dream-ex', name: 'MEGAドリームEX' },
    { id: 'sweets-festa', name: 'スイーツフェスタくじ' },
    { id: 'new-product-a', name: '新商品Aお試しキャンペーン' },
    { id: 'winter-point', name: '冬のポイントくじ' },
    { id: 'lucky-winter', name: 'ラッキーウィンター抽選会' },
];

export const entries: Entry[] = [
    {
        id: '1',
        productId: 'mega-dream-ex',
        productName: 'MEGAドリームEX',
        shopShortName: 'イオン福岡店',
        buyDeadline: '2025-12-10',
        status: '未応募',
        applyMethod: 'アプリ',
        url: 'https://example.com',
    },
    {
        id: '2',
        productId: 'sweets-festa',
        productName: 'スイーツフェスタくじ',
        shopShortName: 'セブン博多駅前店',
        buyDeadline: '2025-12-08',
        status: '応募済',
        applyMethod: 'WEB',
    },
    {
        id: '3',
        productId: 'new-product-a',
        productName: '新商品Aお試しキャンペーン',
        shopShortName: 'ドラッグストア〇〇天神店',
        buyDeadline: '2025-12-05',
        status: '当選',
    },
    {
        id: '4',
        productId: 'winter-point',
        productName: '冬のポイントくじ',
        shopShortName: 'ローソン〇〇店',
        buyDeadline: '2025-12-03',
        status: '購入済',
    },
    {
        id: '5',
        productId: 'lucky-winter',
        productName: 'ラッキーウィンター抽選会',
        shopShortName: 'スーパー〇〇久留米店',
        buyDeadline: '2025-12-07',
        status: '未応募',
    },
];

export const STATUS_ORDER: EntryStatus[] = ['未応募', '応募済', '当選', '購入済', '落選'];

export function countByStatus(targetEntries: Entry[]): Record<EntryStatus, number> {
    const init: Record<EntryStatus, number> = {
        未応募: 0,
        応募済: 0,
        当選: 0,
        購入済: 0,
        落選: 0,
    };
    return targetEntries.reduce((acc, e) => {
        acc[e.status] += 1;
        return acc;
    }, init);
}

export function getProductById(productId: string): Product | undefined {
    return products.find((p) => p.id === productId);
}

export function getEntriesByProductId(productId: string): Entry[] {
    return entries.filter((e) => e.productId === productId);
}
