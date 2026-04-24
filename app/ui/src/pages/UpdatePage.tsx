import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkGithubAlerts from 'remark-github-alerts'
import type { UpdateStatus, GitHubRelease } from '../../../src/types/UpdateTypes'
import * as BeaconApi from '../api/BeaconApi'

type OverlayState = 'updating' | 'done' | 'error'

const RELEASE_NOTES_STYLE = `
  .release-notes { font-size: 13px; color: var(--color-text-primary); line-height: 1.55; }
  .release-notes h1, .release-notes h2, .release-notes h3, .release-notes h4, .release-notes h5, .release-notes h6 {
    font-weight: 600;
    line-height: 1.25;
    margin: 16px 0 10px;
  }
  .release-notes h1 { font-size: 21px; padding-bottom: 0.25em; border-bottom: 1px solid var(--color-border-tertiary); }
  .release-notes h2 { font-size: 17px; padding-bottom: 0.2em; border-bottom: 1px solid var(--color-border-tertiary); }
  .release-notes h3 { font-size: 15px; }
  .release-notes h4 { font-size: 14px; }
  .release-notes h5 { font-size: 13px; }
  .release-notes h6 { font-size: 12px; color: var(--color-text-tertiary); }
  .release-notes p { margin: 0 0 10px; }
  .release-notes ul, .release-notes ol { padding-left: 20px; margin: 0 0 10px; }
  .release-notes li { margin-bottom: 3px; }
  .release-notes code {
    font-family: ui-monospace, SFMono-Regular, SFMono, Menlo, Consolas, 'Liberation Mono', monospace;
    font-size: 11px;
    background: var(--color-background-secondary);
    padding: 1px 4px;
    border-radius: 4px;
  }
  .release-notes pre { background: var(--color-background-secondary); padding: 10px 12px; border-radius: 6px; overflow-x: auto; margin-bottom: 10px; }
  .release-notes pre code { background: none; padding: 0; }
  .release-notes table { border-collapse: collapse; width: 100%; margin-bottom: 10px; font-size: 12px; }
  .release-notes th, .release-notes td { border: 1px solid var(--color-border-tertiary); padding: 6px 8px; text-align: left; }
  .release-notes th { background: var(--color-background-secondary); font-weight: 600; }
  .release-notes a { color: var(--acc); }
  .release-notes blockquote:not(.markdown-alert) {
    border-left: 0.25em solid var(--color-border-secondary);
    padding: 0 1em;
    color: var(--color-text-tertiary);
    margin: 0 0 10px;
  }
  .release-notes .markdown-alert {
    margin: 0 0 10px;
    padding: 8px 12px;
    color: var(--color-text-primary);
    border-left: 0.25em solid var(--color-border-secondary);
    border-radius: 0 4px 4px 0;
    background: color-mix(in srgb, var(--color-border-secondary) 8%, transparent);
  }
  .release-notes .markdown-alert > *:last-child { margin-bottom: 0; }
  .release-notes .markdown-alert-title {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
  }
  .release-notes .markdown-alert-title::before {
    content: '';
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    background-color: currentColor;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    mask-size: contain;
  }
  .release-notes .markdown-alert-title svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .release-notes .markdown-alert-note .markdown-alert-title::before {
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8.93-3.588-1.66.332a.25.25 0 0 0-.196.244v3.76c0 .132.107.239.24.239h1.13a.24.24 0 0 0 .24-.24V4.656a.25.25 0 0 0-.304-.244ZM8 10.904a1.08 1.08 0 1 0 0 2.16 1.08 1.08 0 0 0 0-2.16Z'/%3E%3C/svg%3E");
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8.93-3.588-1.66.332a.25.25 0 0 0-.196.244v3.76c0 .132.107.239.24.239h1.13a.24.24 0 0 0 .24-.24V4.656a.25.25 0 0 0-.304-.244ZM8 10.904a1.08 1.08 0 1 0 0 2.16 1.08 1.08 0 0 0 0-2.16Z'/%3E%3C/svg%3E");
  }
  .release-notes .markdown-alert-tip .markdown-alert-title::before {
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M8 1a5 5 0 0 0-3.547 8.523c.598.598.973 1.371 1.113 2.228A1.75 1.75 0 0 0 7.296 13h1.408a1.75 1.75 0 0 0 1.73-1.249c.14-.857.515-1.63 1.113-2.228A5 5 0 0 0 8 1Zm-.25 13a.75.75 0 0 0 1.5 0v-.25h-1.5V14Z'/%3E%3C/svg%3E");
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M8 1a5 5 0 0 0-3.547 8.523c.598.598.973 1.371 1.113 2.228A1.75 1.75 0 0 0 7.296 13h1.408a1.75 1.75 0 0 0 1.73-1.249c.14-.857.515-1.63 1.113-2.228A5 5 0 0 0 8 1Zm-.25 13a.75.75 0 0 0 1.5 0v-.25h-1.5V14Z'/%3E%3C/svg%3E");
  }
  .release-notes .markdown-alert-important .markdown-alert-title::before,
  .release-notes .markdown-alert-warning .markdown-alert-title::before,
  .release-notes .markdown-alert-caution .markdown-alert-title::before {
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M6.457 1.047a1.75 1.75 0 0 1 3.086 0l5.48 9.75A1.75 1.75 0 0 1 13.48 13.5H2.52A1.75 1.75 0 0 1 .977 10.797l5.48-9.75ZM8 5.25a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0V6A.75.75 0 0 0 8 5.25Zm0 6.25a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75Z'/%3E%3C/svg%3E");
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M6.457 1.047a1.75 1.75 0 0 1 3.086 0l5.48 9.75A1.75 1.75 0 0 1 13.48 13.5H2.52A1.75 1.75 0 0 1 .977 10.797l5.48-9.75ZM8 5.25a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0V6A.75.75 0 0 0 8 5.25Zm0 6.25a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75Z'/%3E%3C/svg%3E");
  }

  .release-notes .markdown-alert-note {
    border-left-color: #0969DA;
    background: color-mix(in srgb, #0969DA 10%, transparent);
  }
  .release-notes .markdown-alert-note .markdown-alert-title { color: #0969DA; }

  .release-notes .markdown-alert-tip {
    border-left-color: #1A7F37;
    background: color-mix(in srgb, #1A7F37 10%, transparent);
  }
  .release-notes .markdown-alert-tip .markdown-alert-title { color: #1A7F37; }

  .release-notes .markdown-alert-important {
    border-left-color: #8250DF;
    background: color-mix(in srgb, #8250DF 10%, transparent);
  }
  .release-notes .markdown-alert-important .markdown-alert-title { color: #8250DF; }

  .release-notes .markdown-alert-warning {
    border-left-color: #9A6700;
    background: color-mix(in srgb, #9A6700 12%, transparent);
  }
  .release-notes .markdown-alert-warning .markdown-alert-title { color: #9A6700; }

  .release-notes .markdown-alert-caution {
    border-left-color: #CF222E;
    background: color-mix(in srgb, #CF222E 10%, transparent);
  }
  .release-notes .markdown-alert-caution .markdown-alert-title { color: #CF222E; }

  .release-notes input[type=checkbox] { margin-right: 5px; }
  .release-notes > *:first-child { margin-top: 0; }
`

// GitHub release bodies sometimes contain two-space hard breaks after alert headers:
// > [!CAUTION]··\n> text
// That is valid markdown for a <br>, which shows as an extra blank line before content.
// We only strip that hard-break on alert header lines.
function normalizeAlertHeaderLineBreaks(md: string): string {
  return md.replace(
    /(^>\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\])\s{2,}(\r?\n)/gm,
    '$1$2',
  )
}

function ReleaseDetailView({ release, isCurrent, onBack, onUpdate }: {
  release: GitHubRelease
  isCurrent: boolean
  onBack: () => void
  onUpdate: () => void | Promise<void>
}) {
  return (
    <div>
      <style>{RELEASE_NOTES_STYLE}</style>

      {/* Back + badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, background: 'none',
            border: 'none', cursor: 'pointer', padding: '4px 0',
            fontSize: 12, color: 'var(--color-text-secondary)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2.5L4.5 7L9 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Releases
        </button>
      </div>

      {/* Title */}
      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 3 }}>
        {release.name}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 16, display: 'flex', gap: 5 }}>
        <span>{new Date(release.publishedAt).toLocaleDateString()}</span>
        {release.prerelease && (
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

      {/* Notes */}
      <div className="s-card" style={{ padding: '14px 16px' }}>
        {release.body ? (
          <div className="release-notes">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkGithubAlerts]}
            >
              {normalizeAlertHeaderLineBreaks(release.body)}
            </ReactMarkdown>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>No release notes available.</div>
        )}
      </div>

      {/* Update action */}
      {!isCurrent && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="sm-btn" onClick={onUpdate} style={{ background: 'var(--acc)', color: '#fff', border: 'none' }}>
            Update to {release.tag}
          </button>
        </div>
      )}
    </div>
  )
}

function UpdateProgressOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 10,
      background: 'var(--color-background-primary)',
    }}>
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none"
        style={{ animation: 'spin 0.9s linear infinite', marginBottom: 2 }}>
        <circle cx="17" cy="17" r="13" stroke="var(--color-border-secondary)" strokeWidth="2.5"/>
        <path d="M17 4 A13 13 0 0 1 30 17" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
        Updating Beacon…
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        The app is restarting. Please wait.
      </div>
    </div>
  )
}

function UpdateErrorOverlay({ error, onDismiss }: {
  error: string | null
  onDismiss: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 10,
      background: 'var(--color-background-primary)',
    }}>
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" style={{ marginBottom: 2 }}>
        <circle cx="17" cy="17" r="13" stroke="#E24B4A" strokeWidth="2"/>
        <path d="M12 12L22 22M22 12L12 22" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
        Update failed
      </div>
      {error && (
        <div style={{
          marginTop: 4, padding: '8px 12px', borderRadius: 6, maxWidth: 400,
          background: 'color-mix(in srgb, #E24B4A 10%, transparent)',
          border: '0.5px solid color-mix(in srgb, #E24B4A 40%, transparent)',
          fontSize: 11, color: '#E24B4A', textAlign: 'center', wordBreak: 'break-word',
        }}>
          {error}
        </div>
      )}
      <button className="sm-btn" onClick={onDismiss} style={{ marginTop: 8 }}>
        Back to Settings
      </button>
    </div>
  )
}

function UpdateOverlay({ state, version, error, onDismiss, onNavigate }: {
  state: OverlayState
  version: string | null
  error: string | null
  onDismiss: () => void
  onNavigate: () => void
}) {
  if (state === 'updating') return <UpdateProgressOverlay />
  if (state === 'error')    return <UpdateErrorOverlay error={error} onDismiss={onDismiss} />
  return <UpdateSuccessModal version={version} onStay={onDismiss} onNavigate={onNavigate} />
}

function UpdateSuccessModal({ version, onStay, onNavigate }: {
  version: string | null
  onStay: () => void
  onNavigate: () => void
}) {
  return (
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
        padding: '32px 24px 24px', gap: 8,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'color-mix(in srgb, var(--acc) 15%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 4,
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 11.5L9 16.5L18 6" stroke="var(--acc)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Update complete
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
          {version ? `Now running version ${version}` : 'Beacon is now running the selected version.'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, width: '100%' }}>
          <button
            onClick={onStay}
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
            onClick={onNavigate}
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
  )
}

export default function UpdatePage() {
  const navigate = useNavigate()

  const [status,        setStatus]        = useState<UpdateStatus | null>(null)
  const [checking,      setChecking]      = useState(false)
  const [showBranches,  setShowBranches]  = useState(false)
  const [overlay,       setOverlay]       = useState<OverlayState | null>(null)
  const [newVersion,    setNewVersion]    = useState<string | null>(null)
  const [detailRelease, setDetailRelease] = useState<GitHubRelease | null>(null)

  useEffect(() => {
    const isPending = sessionStorage.getItem('beacon-update-pending') === 'true'
    if (isPending) {
      sessionStorage.removeItem('beacon-update-pending')
      BeaconApi.getUpdateStatus().then(s => {
        setStatus(s)
        setNewVersion(s.current)
        setOverlay(s.updateError ? 'error' : 'done')
      }).catch(() => setOverlay('error'))
    } else {
      BeaconApi.getUpdateStatus().then(setStatus).catch(() => {})
    }
  }, [])

  // Poll update status while an update is in progress.
  // Distinguishes a pre-restart failure (server stays up, updateError set) from
  // a successful restart (server goes down then comes back with updating=false).
  useEffect(() => {
    if (overlay !== 'updating') return
    const id = setInterval(async () => {
      try {
        const s = await BeaconApi.getUpdateStatus()
        if (!s.updating) {
          if (s.updateError) {
            setStatus(s)
            setOverlay('error')
            sessionStorage.removeItem('beacon-update-pending')
          } else {
            // Express is up, but wait for Vite middleware too before reloading —
            // GET / goes through Vite so a 200 means both are ready.
            const viteReady = await fetch('/', { method: 'HEAD' }).then(r => r.ok).catch(() => false)
            if (viteReady) window.location.reload()
          }
        }
      } catch {
        // server still restarting — keep polling
      }
    }, 2000)
    return () => clearInterval(id)
  }, [overlay])

  const handleCheck = async () => {
    setChecking(true)
    try {
      setStatus(await BeaconApi.checkForUpdates())
    } finally {
      setChecking(false)
    }
  }

  const handleApply = async (ref: string, type: 'release' | 'branch'): Promise<boolean> => {
    if (!confirm(`Update to ${ref}? The app will restart.`)) return false
    try {
      sessionStorage.setItem('beacon-update-pending', 'true')
      await BeaconApi.applyUpdate(ref, type)
      setStatus(s => s ? { ...s, updating: true } : s)
      setOverlay('updating')
      return true
    } catch {
      sessionStorage.removeItem('beacon-update-pending')
      return false
    }
  }

  if (detailRelease) {
    const isCurrent = detailRelease.tag === `v${status?.current}` || detailRelease.tag === status?.current
    return (
      <ReleaseDetailView
        release={detailRelease}
        isCurrent={isCurrent}
        onBack={() => setDetailRelease(null)}
        onUpdate={async () => {
          const started = await handleApply(detailRelease.tag, 'release')
          if (started) setDetailRelease(null)
        }}
      />
    )
  }

  return (
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
      {status?.updateError && !overlay && (
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
          <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Loading...
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
              {r.body && (
                <button className="sm-btn" onClick={() => setDetailRelease(r)} style={{ background: 'var(--acc)', color: '#fff', border: 'none' }}>
                  Info
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

      {overlay && (
        <UpdateOverlay
          state={overlay}
          version={newVersion}
          error={status?.updateError ?? null}
          onDismiss={() => setOverlay(null)}
          onNavigate={() => navigate('/')}
        />
      )}
    </div>
  )
}
