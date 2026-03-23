'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: 'Inter, sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '512px' }}>
          {/* Glow */}
          <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }} aria-hidden>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)' }} />
          </div>

          <div style={{ position: 'relative', background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.1)', padding: '40px 40px', textAlign: 'center', zIndex: 1 }}>
            {/* Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ width: 80, height: 80, borderRadius: 16, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
            </div>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
              <svg fill="#7c6bc4" xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 32 32">
                <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#6b6c80' }}>CRM Система</span>
            </div>

            <p style={{ fontSize: 72, fontWeight: 800, color: '#ef4444', margin: '16px 0 4px', letterSpacing: '-2px', lineHeight: 1 }}>500</p>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#31323e', margin: '0 0 12px' }}>Критическая ошибка</h1>
            <p style={{ fontSize: 14, color: '#6b6c80', lineHeight: 1.6, margin: '0 0 24px' }}>
              {error.message || 'Произошла непредвиденная ошибка приложения.'}
              {error.digest && (
                <span style={{ display: 'block', marginTop: 8, fontFamily: 'monospace', fontSize: 12, color: '#9596a8' }}>
                  ID: {error.digest}
                </span>
              )}
            </p>

            <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: 24 }} />

            <button
              onClick={reset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#7c6bc4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Попробовать снова
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#9596a8', marginTop: 24 }}>
            © {new Date().getFullYear()} CRM Система. Критическая ошибка приложения.
          </p>
        </div>
      </body>
    </html>
  );
}
