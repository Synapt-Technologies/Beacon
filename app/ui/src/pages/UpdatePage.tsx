import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UpdateStatus } from '../../../src/types/UpdateTypes'
import * as BeaconApi from '../api/BeaconApi'

const SESSION_KEY = 'beacon_update_success'
const UPDATE_RECOVERY_TIMEOUT_MS = 45_000

function toErrorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message) return value.message
  return fallback
}

export default function UpdatePage() {
  const navigate = useNavigate()

  const [status,       setStatus]       = useState<UpdateStatus | null>(null)
  const [checking,     setChecking]     = useState(false)
  const [showBranches, setShowBranches] = useState(false)
  const [showSuccess,  setShowSuccess]  = useState(false)
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setInitialLoadError(null)
        const next = await BeaconApi.getUpdateStatus()
        if (!active) return
        setStatus(next)
      } catch (e) {
        if (!active) return
        setInitialLoadError(toErrorMessage(e, 'Failed to load update status'))
      }
    }

    void load()

    if (sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.removeItem(SESSION_KEY)
      setShowSuccess(true)
    }

    return () => {
      active = false
    }
  }, [])

  // While an update is in progress, poll update status until completion.
  // This avoids missing very fast restarts where a down/up edge is never observed.
  useEffect(() => {
    if (!status?.updating) return

    let active = true
    let sawDisconnect = false

    const completeUpdate = () => {
      if (!active) return
      sessionStorage.setItem(SESSION_KEY, '1')
      window.location.reload()
    }

    const pollStatus = async () => {
      try {
        const res = await fetch('/api/update/status', { cache: 'no-store' })
        if (!res.ok) {
          // During restart, this can briefly fail/non-OK.
          sawDisconnect = true
          return
        }

        const next = (await res.json()) as UpdateStatus
        if (!active) return

        if (next.updating) {
          return
        }

        setStatus(next)

        if (!next.updateError) {
          completeUpdate()
          return
        }
      } catch {
        // Connection refused / network error during restart.
        sawDisconnect = true
      }

      // Fallback path: if we observed a disconnect and the backend readiness
      // endpoint is back, force a hard reload even if status polling stalls.
      if (sawDisconnect) {
        try {
          const ready = await fetch('/api/ready', { cache: 'no-store' })
          if (ready.ok) {
            completeUpdate()
          }
        } catch {
          // keep polling
        }
      }
    }

    const id = setInterval(() => { void pollStatus() }, 1000)
    const fallbackId = setTimeout(() => {
      completeUpdate()
    }, UPDATE_RECOVERY_TIMEOUT_MS)

    void pollStatus()

    return () => {
      active = false
      clearInterval(id)
      clearTimeout(fallbackId)
    }
  }, [status?.updating])

  const handleCheck = async () => {
    setChecking(true)
    try {
      setInitialLoadError(null)
      setStatus(await BeaconApi.checkForUpdates())
    } catch (e) {
      setInitialLoadError(toErrorMessage(e, 'Failed to check for updates'))
    } finally {
      setChecking(false)
    }
  }

  const noStatusMessage = initialLoadError ?? 'Loading...'
  const noStatusColor = initialLoadError ? '#E24B4A' : 'var(--color-text-tertiary)'

  const handleApply = async (ref: string, type: 'release' | 'branch') => {
    if (!confirm(`Update to ${ref}? The app will restart.`)) return
    try {
      await BeaconApi.applyUpdate(ref, type)
      setStatus(s => s ? { ...s, updating: true } : s)
    } catch {
      // error will surface in status
    }
  }

  if (status?.updating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, paddingTop: 60 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Updating...</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>The app is restarting. This page will be unavailable briefly.</div>
      </div>
    )
  }

  return (
    <>
    {showSuccess && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: 'var(--color-background-primary)',
          borderRadius: 'var(--border-radius-lg)',
          border: '0.5px solid var(--color-border-tertiary)',
          width: 320, overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '32px 24px 24px',
          gap: 8,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'color-mix(in srgb, var(--acc) 15%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 4,
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 11.5L9 16.5L18 6" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Update complete
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
            Beacon is now running the selected version.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, width: '100%' }}>
            <button
              onClick={() => setShowSuccess(false)}
              style={{
                flex: 1, fontSize: 12, padding: '7px 0',
                borderRadius: 'var(--border-radius-md)',
                border: '0.5px solid var(--color-border-tertiary)',
                background: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer',
              }}
            >
              Stay here
            </button>
            <button
              onClick={() => navigate('/overview')}
              style={{
                flex: 1, fontSize: 12, padding: '7px 0',
                borderRadius: 'var(--border-radius-md)',
                border: 'none', background: 'var(--acc)', color: '#fff', cursor: 'pointer',
              }}
            >
              Go to overview
            </button>
          </div>
        </div>
      </div>
    )}
    <div>
      {/* Back + check */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => navigate('/settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, background: 'none',
            border: 'none', cursor: 'pointer', padding: '4px 0',
            fontSize: 12, color: 'var(--color-text-secondary)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2.5L4.5 7L9 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Settings
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {status?.lastChecked
            ? `Last checked ${new Date(status.lastChecked).toLocaleTimeString()}`
            : 'Not yet checked'}
        </span>
        <button className="sm-btn" onClick={handleCheck} disabled={checking}>
          {checking ? 'Checking...' : 'Check for updates'}
        </button>
      </div>

      {/* Error */}
      {status?.updateError && (
        <div className="s-card" style={{ marginBottom: 16 }}>
          <div style={{ padding: '10px 14px', fontSize: 12, color: '#E24B4A' }}>
            {status.updateError}
          </div>
        </div>
      )}

      {/* Releases */}
      <div className="sec-lbl">Releases</div>
      <div className="s-card">
        {!status && (
          <div style={{ padding: '12px 14px', fontSize: 12, color: noStatusColor }}>
            {noStatusMessage}
          </div>
        )}
        {status && status.releases.length === 0 && !status.updateError && (
          <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            No releases found.
          </div>
        )}
        {status?.releases.map((r, i) => {
          const isCurrent = r.tag === `v${status.current}` || r.tag === status.current
          return (
            <div
              key={r.tag}
              className="s-row"
              style={{ borderTop: i > 0 ? '0.5px solid var(--color-border-tertiary)' : undefined }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{r.name}</span>
                  {r.prerelease && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'color-mix(in srgb, #E8A838 20%, transparent)', color: '#E8A838' }}>
                      beta
                    </span>
                  )}
                  {isCurrent && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'color-mix(in srgb, var(--acc) 20%, transparent)', color: 'var(--acc)' }}>
                      current
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                  {new Date(r.publishedAt).toLocaleDateString()}
                </div>
              </div>
              {!isCurrent && (
                <button className="sm-btn" onClick={() => handleApply(r.tag, 'release')}>
                  Update
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Branches — developer */}
      {status && status.branches.length > 0 && (
        <>
          <button
            onClick={() => setShowBranches(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              marginTop: 20, padding: '0 2px 6px', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 11, color: 'var(--color-text-tertiary)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: showBranches ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
              <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Developer — branches
          </button>

          {showBranches && (
            <div className="s-card">
              {status.branches.map((b, i) => (
                <div
                  key={b.name}
                  className="s-row"
                  style={{ borderTop: i > 0 ? '0.5px solid var(--color-border-tertiary)' : undefined }}
                >
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)' }}>{b.name}</div>
                  <button className="sm-btn" onClick={() => handleApply(b.name, 'branch')}>
                    Switch
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
    </>
  )
}
