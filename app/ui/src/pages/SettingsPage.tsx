import { useState } from 'react'
import { useBeacon } from '../context/BeaconContext'
import { Toggle } from '../components/Toggle'
import { IconReset } from '../components/icons'
import Savebar from '../components/layout/savebar/Savebar'
import { DeviceAlertState, DeviceAlertTarget } from '../../../src/tally/types/ConsumerStates'
import { UIAlertSlot, DEFAULT_UI_ALERT_CONFIG } from '../../../src/types/UIStates'
import type { AlertSlot, AlertAction, AlertTarget } from '../types/beacon'
import { ALERT_COLORS, ALERT_SHORT, ALERT_LONG } from '../types/beacon'
import type { OrchestratorConfig } from '../../../src/tally/TallyLifecycle'
import type { AedesConsumerConfig } from '../../../src/tally/consumer/networkConsumer/AedesNetworkConsumer'
import { HARDWARE_VERSION_STRING, HardwareVersion } from '../../../src/types/SystemInfo'

// ? Enum ↔ string bridge helpers

function toAlertSlot(slot: UIAlertSlot): AlertSlot {
  return {
    action:  DeviceAlertState[slot.action]  as AlertAction,
    target:  slot.target !== null ? DeviceAlertTarget[slot.target] as AlertTarget : null,
    timeout: slot.timeout,
  }
}

function toUIAlertSlot(slot: AlertSlot): UIAlertSlot {
  return {
    action:  DeviceAlertState[slot.action as keyof typeof DeviceAlertState],
    target:  slot.target !== null ? DeviceAlertTarget[slot.target as keyof typeof DeviceAlertTarget] : null,
    timeout: slot.timeout,
  }
}

// ? Alert icons

const ALERT_ICONS: Record<AlertAction, React.ReactNode> = {
  IDENT: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="7" cy="7" r="2" fill="currentColor"/>
    </svg>
  ),
  INFO: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="7" y1="6" x2="7" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="7" cy="4.5" r=".8" fill="currentColor"/>
    </svg>
  ),
  NORMAL: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7.5L5.5 10.5L11.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  PRIO: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2L8.8 5.8H12.5L9.5 8.2L10.5 12L7 9.8L3.5 12L4.5 8.2L1.5 5.8H5.2z"
            stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  CLEAR: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.5 2"/>
      <path d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
}

// ? NetworkRow — stateless, controlled by parent pending state

function NetworkRow({ label, sub, value, defaultVal, readOnly, onChange }: {
  label: string
  sub?: string
  value: number | undefined
  defaultVal: number
  readOnly?: boolean
  onChange?: (v: number) => void
}) {
  return (
    <div className="s-row">
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{sub}</div>}
      </div>
      <input
        className="s-input"
        type="number"
        value={value ?? defaultVal}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={readOnly ? undefined : e => onChange?.(parseInt(e.target.value) || defaultVal)}
        style={readOnly ? { color: 'var(--color-text-tertiary)' } : undefined}
      />
    </div>
  )
}

// ? AlertRow

interface AlertRowProps {
  slot: AlertSlot
  index: number
  editing: boolean
  onEdit: () => void
  onSave: (slot: AlertSlot) => void
  onReset: () => void
  onCancel: () => void
}

function AlertRow({ slot, index, editing, onEdit, onSave, onReset, onCancel }: AlertRowProps) {
  const [action, setAction]   = useState<AlertAction>(slot.action)
  const [target, setTarget]   = useState<AlertTarget>(slot.target ?? 'ALL')
  const [timeout, setTimeout] = useState<number>(slot.timeout ?? 0)

  const isClr = action === 'CLEAR'
  const col   = ALERT_COLORS[slot.action]

  const handleActionChange = (a: AlertAction) => {
    setAction(a)
    if (a === 'CLEAR') {
      setTarget('ALL')
      setTimeout(0)
    }
  }

  const handleSave = () => {
    onSave({
      action,
      target:  isClr ? null : target,
      timeout: isClr ? null : timeout,
    })
  }

  const summaryParts = [ALERT_LONG[slot.action]]
  if (!isClr) {
    if (slot.target)  summaryParts.push(slot.target)
    if (slot.timeout && slot.timeout > 0) summaryParts.push(`${slot.timeout}s`)
  }

  if (!editing) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', padding: '10px 14px',
        borderBottom: index < 3 ? '0.5px solid var(--color-border-tertiary)' : 'none',
        gap: 10,
      }}>
        <div style={{ fontSize: 11, fontWeight: 500, width: 14, textAlign: 'center', color: col, flexShrink: 0 }}>
          {index + 1}
        </div>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${col}1e`, color: col,
        }}>
          {ALERT_ICONS[slot.action]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {ALERT_SHORT[slot.action]}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            {summaryParts.join(' · ')}
          </div>
        </div>
        <button className="sm-btn" onClick={onEdit}>Edit</button>
      </div>
    )
  }

  return (
    <div style={{
      borderBottom: index < 3 ? '0.5px solid var(--color-border-tertiary)' : 'none',
      background: 'var(--color-background-secondary)',
    }}>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Action
            </label>
            <select
              className="pf-input"
              value={action}
              onChange={e => handleActionChange(e.target.value as AlertAction)}
            >
              {(Object.keys(ALERT_LONG) as AlertAction[]).map(a => (
                <option key={a} value={a}>{ALERT_LONG[a]}</option>
              ))}
            </select>
          </div>

          {!isClr && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Target
              </label>
              <select
                className="pf-input"
                value={target}
                onChange={e => setTarget(e.target.value as AlertTarget)}
              >
                <option value="ALL">All</option>
                <option value="OPERATOR">Operator</option>
                <option value="TALENT">Talent</option>
              </select>
            </div>
          )}
        </div>

        {!isClr && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Timeout
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="pf-input"
                type="number"
                min={0}
                max={3600}
                value={timeout}
                onChange={e => setTimeout(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: 90, textAlign: 'right' }}
              />
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>seconds</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                {timeout === 0 ? '— alert stays until manually cleared' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderTop: '0.5px solid var(--color-border-tertiary)',
      }}>
        <button
          onClick={onReset}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
            padding: '5px 10px', borderRadius: 'var(--border-radius-md)',
            border: '0.5px solid var(--color-border-tertiary)', background: 'none',
            color: 'var(--color-text-secondary)', cursor: 'pointer',
          }}
        >
          <IconReset size={11} /> Reset to default
        </button>
        <div style={{ flex: 1 }} />
        <button className="sm-btn" onClick={onCancel}>Cancel</button>
        <button
          onClick={handleSave}
          style={{
            fontSize: 12, padding: '6px 16px',
            borderRadius: 'var(--border-radius-md)', border: 'none',
            background: 'var(--acc)', color: '#fff', cursor: 'pointer',
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

// ? Page

export default function SettingsPage() {
  const {
    consumers,
    orchestratorConfig,
    uiConfig,
    setConsumerEnabled,
    updateConsumer,
    updateOrchestratorConfig,
    updateAlertSlot,
    resetAlertSlot,
    exportConfig,
    importConfig,
    system,
  } = useBeacon()

  console.log('System:', JSON.stringify(system))

  const aedesConfig = consumers.aedes?.config as Partial<AedesConsumerConfig> | undefined

  // ? Pending state for savebar — network and tally behaviour fields
  const [pendingPort,         setPendingPort]         = useState<number | null>(null)
  const [pendingKeepalive,    setPendingKeepalive]    = useState<number | null>(null)
  const [pendingDisconnect,   setPendingDisconnect]   = useState<OrchestratorConfig['state_on_disconnect'] | null>(null)
  const [saving,              setSaving]              = useState(false)

  const serverDisconnect = orchestratorConfig.state_on_disconnect ?? 0
  const settingsUnsaved  = pendingPort !== null || pendingKeepalive !== null || pendingDisconnect !== null

  const handleSave = async () => {
    setSaving(true)
    try {
      if (pendingPort !== null || pendingKeepalive !== null) {
        await updateConsumer('aedes', {
          ...(pendingPort      !== null ? { port: pendingPort }               : {}),
          ...(pendingKeepalive !== null ? { keep_alive_ms: pendingKeepalive } : {}),
        } as Partial<AedesConsumerConfig>)
      }
      if (pendingDisconnect !== null) {
        await updateOrchestratorConfig({ state_on_disconnect: pendingDisconnect })
      }
      setPendingPort(null)
      setPendingKeepalive(null)
      setPendingDisconnect(null)
    } catch {
      // BeaconContext shows the toast; pending state preserved so user can retry
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setPendingPort(null)
    setPendingKeepalive(null)
    setPendingDisconnect(null)
  }

  const [editingAlert, setEditingAlert] = useState<number | null>(null)

  const gpioEnabled    = consumers.gpio?.enabled    ?? true
  const aedesEnabled   = consumers.aedes?.enabled   ?? true
  const gpioAvailable  = consumers.gpio?.available  ?? false
  const aedesAvailable = consumers.aedes?.available ?? true

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type   = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      if (input.files?.[0]) await importConfig(input.files[0])
    }
    input.click()
  }

  const handleResetAlerts = () => {
    for (let i = 0; i < DEFAULT_UI_ALERT_CONFIG.length; i++) resetAlertSlot(i)
  }

  return (
    <div style={{ paddingBottom: settingsUnsaved ? 80 : 20 }}>

      {/* Consumers */}
      <div className="sec-lbl">Consumers</div>
      <div className="s-card">
        <div className="s-row">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>GPIO hardware</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
              Raspberry Pi pin outputs{!gpioAvailable ? ' — not available on this hardware' : ''}
            </div>
          </div>
          <Toggle
            checked={gpioEnabled}
            disabled={!gpioAvailable}
            onChange={v => setConsumerEnabled('gpio', v)}
          />
        </div>
        <div className="s-row">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>MQTT broker</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
              Network tally over MQTT{!aedesAvailable ? ' — not available' : ''}
            </div>
          </div>
          <Toggle
            checked={aedesEnabled}
            disabled={!aedesAvailable}
            onChange={v => setConsumerEnabled('aedes', v)}
          />
        </div>
      </div>

      {/* Network */}
      <div className="sec-lbl">Network</div>
      <div className="s-card">
        <NetworkRow
          label="Admin port"
          sub="Web UI server — requires restart to change"
          value={parseInt(window.location.port) || 3000}
          defaultVal={3000}
          readOnly
        />
        <NetworkRow
          label="MQTT port"
          value={pendingPort ?? aedesConfig?.port}
          defaultVal={1883}
          onChange={setPendingPort}
        />
        <NetworkRow
          label="Keep-alive interval"
          sub="MQTT heartbeat in ms"
          value={pendingKeepalive ?? aedesConfig?.keep_alive_ms}
          defaultVal={500}
          onChange={setPendingKeepalive}
        />
      </div>

      {/* Tally behaviour */}
      <div className="sec-lbl">Tally behaviour</div>
      <div className="s-card">
        <div className="s-row">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>State on producer disconnect</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Applied when a switcher goes offline</div>
          </div>
          <select
            className="s-select"
            value={pendingDisconnect ?? serverDisconnect}
            onChange={e => setPendingDisconnect(parseInt(e.target.value) as OrchestratorConfig['state_on_disconnect'])}
          >
            <option value={0}>None</option>
            <option value={1}>Warning</option>
            <option value={2}>Danger</option>
            <option value={4}>Preview</option>
            <option value={7}>Program</option>
          </select>
        </div>
      </div>

      {/* Alert buttons */}
      <div className="sec-lbl">Alert buttons</div>
      <div className="s-card">
        {uiConfig.alerts.map((slot, i) => (
          <AlertRow
            key={i}
            slot={toAlertSlot(slot)}
            index={i}
            editing={editingAlert === i}
            onEdit={() => setEditingAlert(i)}
            onSave={updated => { updateAlertSlot(i, toUIAlertSlot(updated)); setEditingAlert(null) }}
            onReset={() => { resetAlertSlot(i); setEditingAlert(null) }}
            onCancel={() => setEditingAlert(null)}
          />
        ))}
      </div>

      {/* Config */}
      <div className="sec-lbl">Configuration</div>
      <div className="s-card">
        <div className="s-row">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>Export config</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Download beacon-config.json</div>
          </div>
          <button className="sm-btn" onClick={exportConfig}>Export</button>
        </div>
        <div className="s-row">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>Import config</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Restore from JSON file</div>
          </div>
          <button className="sm-btn" onClick={handleImport}>Import</button>
        </div>
      </div>

      {/* Reset */}
      <div className="sec-lbl">Reset</div>
      <div className="s-card">
        <div className="s-row">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>Reset alert buttons</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Restore alert slots to defaults</div>
          </div>
          <button
            className="sm-btn"
            style={{ color: '#E24B4A', borderColor: 'color-mix(in srgb, #E24B4A 35%, transparent)' }}
            onClick={() => { if (confirm('Reset alert buttons to defaults?')) handleResetAlerts() }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* About */}
      <div className="sec-lbl">About</div>
      <div className="s-card">
        <div className="s-row">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>Beacon</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Firmware Version</div>
          </div>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }}>
            {system.firmware ?? "Unknown"}
          </span>
        </div>
        <div className="s-row">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>Hardware</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Hardware Type</div>
          </div>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }}>
            {HARDWARE_VERSION_STRING[system.hardware ?? HardwareVersion.UNKNOWN]}
          </span>
        </div>
      </div>

      {settingsUnsaved && (
        <Savebar onSave={handleSave} onDiscard={handleDiscard} saving={saving} />
      )}

    </div>
  )
}
