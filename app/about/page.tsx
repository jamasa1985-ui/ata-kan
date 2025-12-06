// app/about/page.tsx
export default function AboutPage() {
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
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
        このアプリについて
      </h1>
      <p style={{ marginBottom: '8px' }}>
        これは Google スプレッドシート ＋ GAS で作っていた応募管理アプリを、
        Next.js で作り直していくプロジェクトです。
      </p>
      <p style={{ marginBottom: '8px' }}>
        今後、応募一覧・店舗別の管理・当選結果の管理などを、少しずつ画面や機能として追加していきます。
      </p>
    </main>
  );
}
