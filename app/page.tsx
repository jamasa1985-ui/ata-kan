// app/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Product = {
  id: string;
  name: string;
  displayFlag?: boolean;
  releaseDate?: string;
};

// Alert Types
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

type AlertsResponse = {
  currentProducts: ProductAlert[];
  pastProducts: AlertCounts | null;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, alertsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/alerts')
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data);
        }

        if (alertsRes.ok) {
          const data = await alertsRes.json();
          setAlerts(data);
        }

      } catch (error) {
        console.error('データの取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const hasAlerts = alerts && (alerts.currentProducts.length > 0 || alerts.pastProducts);

  return (
    <main
      style={{
        minHeight: '100vh',
        paddingTop: '80px', // Header height + space
        paddingBottom: '80px', // Footer height + space
        paddingLeft: '16px',
        paddingRight: '16px',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif',
        backgroundColor: '#f5f5f5',
        maxWidth: 480,
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* ヘッダー (固定) */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '480px',
          padding: '12px 16px',
          backgroundColor: '#1e90ff',
          color: '#fff',
          borderRadius: '0 0 10px 10px',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1.3 }}>
          応募管理アプリ
        </div>
      </header>

      {/* メッセージエリア */}
      <section
        style={{
          marginTop: '16px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <h3 style={{ fontSize: '14px', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px', color: '#000' }}>お知らせ</h3>
        <div
          style={{
            maxHeight: '180px',
            overflowY: 'auto',
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#000',
          }}
        >
          {loading ? (
            <p>読み込み中...</p>
          ) : !hasAlerts ? (
            <p className="mb-0">メッセージはありません。</p>
          ) : (
            <>
              {alerts?.currentProducts.map(p => (
                <div key={p.id} style={{ marginBottom: '8px', borderBottom: '1px dashed #eee', paddingBottom: '4px' }}>
                  <div style={{ fontWeight: 'bold', color: '#1e90ff' }}>{p.name}</div>
                  {p.alertCounts.applyEnd > 0 && <div>・応募締切が近いものがあります {p.alertCounts.applyEnd}件</div>}
                  {p.alertCounts.resultDate > 0 && <div>・発表日が近いものがあります {p.alertCounts.resultDate}件</div>}
                  {p.alertCounts.purchaseEnd > 0 && <div>・購入期限が近いものがあります {p.alertCounts.purchaseEnd}件</div>}
                </div>
              ))}

              {alerts?.pastProducts && (
                <div style={{ marginBottom: '8px', borderBottom: '1px dashed #eee', paddingBottom: '4px' }}>
                  <div style={{ fontWeight: 'bold', color: '#666' }}>過去商品</div>
                  {alerts.pastProducts.applyEnd > 0 && <div>・応募締切が近いものがあります {alerts.pastProducts.applyEnd}件</div>}
                  {alerts.pastProducts.resultDate > 0 && <div>・発表日が近いものがあります {alerts.pastProducts.resultDate}件</div>}
                  {alerts.pastProducts.purchaseEnd > 0 && <div>・購入期限が近いものがあります {alerts.pastProducts.purchaseEnd}件</div>}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* 商品一覧 */}
      <section style={{ marginTop: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#333' }}>
            読み込み中...
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#333' }}>
            表示可能な商品がありません
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: '1px solid #eee',
                }}
              >
                {/* 発売日 */}
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  ★ {product.releaseDate ? new Date(product.releaseDate).toLocaleDateString() : '日付未定'}
                </div>

                {/* 商品名 (リンク) */}
                <Link
                  href={`/products/${product.id}`}
                  style={{
                    textDecoration: 'none',
                    color: '#000',
                  }}
                >
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      marginBottom: '12px',
                    }}
                  >
                    {product.name}
                  </div>
                </Link>

                {/* ボタンエリア */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {/* 抽選情報ボタン (青) */}
                  <Link href={`/products/${product.id}`} style={{ textDecoration: 'none' }}>
                    <button
                      style={{
                        backgroundColor: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      抽選情報
                    </button>
                  </Link>

                  {/* 当落管理ボタン (黄/オレンジ) */}
                  <Link href={`/products/${product.id}/results`} style={{ textDecoration: 'none' }}>
                    <button
                      style={{
                        backgroundColor: '#ffc107',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      当落管理
                    </button>
                  </Link>

                  {/* 購入管理ボタン (赤) */}
                  <Link href={`/products/${product.id}/purchases`} style={{ textDecoration: 'none' }}>
                    <button
                      style={{
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      購入管理
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>



      <footer
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#fff',
          borderTop: '1px solid #ddd',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: '60px',
        }}
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            color: '#1e90ff', fontSize: '10px'
          }}
        >
          <span style={{ fontSize: '20px' }}>🏠</span>
          商品一覧
        </button>
        <Link
          href="/schedule"
          style={{
            textDecoration: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            color: '#666', fontSize: '10px'
          }}
        >
          <span style={{ fontSize: '20px' }}>📅</span>
          スケジュール
        </Link>
        <Link
          href="/purchases/create"
          style={{
            textDecoration: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            color: '#666', fontSize: '10px'
          }}
        >
          <span style={{ fontSize: '20px' }}>📝</span>
          購入登録
        </Link>
        <button
          onClick={() => setIsMenuOpen(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            color: '#666', fontSize: '10px'
          }}
        >
          <span style={{ fontSize: '20px' }}>≡</span>
          メニュー
        </button>
      </footer>

      {/* メニューオーバーレイ */}
      {isMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 200,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#fff',
              borderRadius: '16px 16px 0 0',
              padding: '24px 20px 40px', // 下部に余裕を持たせる
              position: 'relative',
              animation: 'slideUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style jsx>{`
                @keyframes slideUp {
                  from { transform: translateY(100%); }
                  to { transform: translateY(0); }
                }
              `}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>メニュー</h3>
              <button
                onClick={() => setIsMenuOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px'
                }}
              >×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              <Link href="/products/past" style={{ textDecoration: 'none', color: '#333', fontSize: '16px', padding: '16px 8px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>📦</span> 過去商品
              </Link>
              <Link href="/master" style={{ textDecoration: 'none', color: '#333', fontSize: '16px', padding: '16px 8px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>⚙️</span> マスタ
              </Link>
              <Link href="/lotteries" style={{ textDecoration: 'none', color: '#333', fontSize: '16px', padding: '16px 8px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>🎟️</span> 抽選一覧
              </Link>
              <Link href="/purchases" style={{ textDecoration: 'none', color: '#333', fontSize: '16px', padding: '16px 8px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>🛒</span> 購入一覧
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
