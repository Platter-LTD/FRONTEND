'use client'

import { useEffect } from 'react'
import { isChunkLoadError, reloadForStaleChunks } from '@/lib/chunkLoadRecovery'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const chunkError = isChunkLoadError(error)

  useEffect(() => {
    if (chunkError) {
      reloadForStaleChunks('global-error')
    }
  }, [chunkError])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          background: '#faf8f4',
          color: '#1f2937',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, margin: '0 0 8px', fontWeight: 700 }}>
            {chunkError ? 'Updating the app…' : 'Something went wrong'}
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#6b7280', margin: '0 0 20px' }}>
            {chunkError
              ? 'A newer version was deployed. Reloading to load the latest files.'
              : 'An unexpected error occurred. You can try again or reload the page.'}
          </p>
          {!chunkError ? (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  borderRadius: 999,
                  padding: '10px 18px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  border: 'none',
                  background: '#9A813F',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '10px 18px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reload page
              </button>
            </div>
          ) : null}
        </div>
      </body>
    </html>
  )
}
