// app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '24px',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif',
        backgroundColor: '#f5f5f5',
      }}
    >
      {/* ヘッダー */}
      <header
        style={{
          marginBottom: '24px',
          padding: '12px 16px',
          backgroundColor: '#1e90ff',
          color: '#fff',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
          応募管理アプリ（Next.js版）
        </div>
        <nav style={{ fontSize: '14px' }}>
          <Link href="/" style={{ marginRight: '12px', color: '#fff', textDecoration: 'none' }}>
            ホーム
          </Link>
          <Link href="/about" style={{ color: '#fff', textDecoration: 'none' }}>
            このアプリについて
          </Link>
        </nav>
      </header>

      {/* メイン内容 */}
      <section>
        <p style={{ marginBottom: '8px' }}>開発環境のセットアップが完了しました ✅</p>
        <p style={{ marginBottom: '8px' }}>
          これから、この画面をベースにして画面や機能を増やしていきます。
        </p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          ※ターミナルで <code>npm run dev</code> を動かしたままにしておくと、
          保存するたびにブラウザが自動で更新されます。
        </p>
      </section>
    </main>
  );
}
