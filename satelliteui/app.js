const originals = {}
const changed   = new Set()

let elSavebar, elPage, elReboot, elSaveBtn, elDiscardBtn

// ── Fetch helper ───────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, opts = {}, ms = 4000) {
  const ctrl = new AbortController()
  const tid  = setTimeout(() => ctrl.abort(), ms)
  try { return await fetch(url, { ...opts, signal: ctrl.signal }) }
  finally { clearTimeout(tid) }
}

// ── Field access ───────────────────────────────────────────────────────────────

function getCurrentValue(row) {
  const radio = row.querySelector('input[type=radio]')
  if (radio) {
    const checked = document.querySelector(`input[name="${radio.name}"]:checked`)
    return checked ? checked.value : null
  }
  const checkbox = row.querySelector('input[type=checkbox]')
  if (checkbox) return checkbox.checked
  const el = row.querySelector('input, select, textarea')
  return el ? el.value : null
}

function getVisualInput(row) {
  return row.querySelector('input:not([type=radio]):not([type=checkbox]), select, textarea')
}

function setFieldValue(row, val) {
  const radio  = row.querySelector('input[type=radio]')
  const box    = row.querySelector('input[type=checkbox]')
  const slider = row.querySelector('input[type=range]')
  const visual = getVisualInput(row)
  if (radio) {
    document.querySelectorAll(`input[name="${radio.name}"]`)
      .forEach(r => r.checked = r.value === String(val))
  } else if (box) {
    box.checked = Boolean(val)
  } else if (visual) {
    visual.value = val
    if (slider) slider.classList.contains('trim-slider')
      ? updateTrimSlider(slider)
      : updateSliderDisplay(slider)
  }
  const color = row.querySelector('input[type=color]')
  if (color) syncColorHex(color)
}

// ── Change detection ───────────────────────────────────────────────────────────

function onFieldChange(row) {
  const id       = row.dataset.field
  const isChange = getCurrentValue(row) !== originals[id]
  const visual   = getVisualInput(row)
  const rg       = row.querySelector('.radio-group')

  row.classList.toggle('changed', isChange)
  visual?.classList.toggle('changed', isChange)
  rg?.classList.toggle('changed', isChange)

  isChange ? changed.add(id) : changed.delete(id)
  updateSavebar()
}

function updateSavebar() {
  const hasChanges  = changed.size > 0
  let   needsReboot = false
  changed.forEach(id => {
    const row = document.querySelector(`.s-row[data-field="${id}"]`)
    if (row?.dataset.reboot === 'true') needsReboot = true
  })
  elSavebar.classList.toggle('visible', hasChanges)
  elPage.classList.toggle('has-savebar', hasChanges)
  elReboot.classList.toggle('visible', needsReboot)
}

function discardChanges() {
  document.querySelectorAll('.s-row[data-field]').forEach(row => {
    const id = row.dataset.field
    if (id in originals) setFieldValue(row, originals[id])
    row.classList.remove('changed')
    getVisualInput(row)?.classList.remove('changed')
    row.querySelector('.radio-group')?.classList.remove('changed')
  })
  changed.clear()
  updateSavebar()
}

// ── Save ───────────────────────────────────────────────────────────────────────

async function saveChanges() {
  setSaving(true)
  elSaveBtn.disabled = elDiscardBtn.disabled = true

  try {
    const res = await fetchWithTimeout('/api/config', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(buildPayload()),
    })
    if (!res.ok) throw new Error()

    document.querySelectorAll('.s-row[data-field]').forEach(row => {
      originals[row.dataset.field] = getCurrentValue(row)
      row.classList.remove('changed')
      getVisualInput(row)?.classList.remove('changed')
      row.querySelector('.radio-group')?.classList.remove('changed')
    })
    changed.clear()
    updateSavebar()
  } catch {
    showSaveError()
  }

  setSaving(false)
  elSaveBtn.disabled = elDiscardBtn.disabled = false
}

function buildPayload() {
  const cfg = {}
  changed.forEach(id => {
    const row = document.querySelector(`.s-row[data-field="${id}"]`)
    if (!row) return
    applyToPayload(cfg, id, getCurrentValue(row))
  })
  return cfg
}

function applyToPayload(cfg, id, val) {
  if (id === 'deviceName') {
    (cfg.device ??= {}).name = val
  } else if (id === 'wifiSsid') {
    (cfg.network ??= {}).ssid = val
  } else if (id === 'wifiPassword') {
    if (val) (cfg.network ??= {}).password = val
  } else if (id === 'apPassword') {
    (cfg.network ??= {}).apPassword = val
  } else if (id === 'baseUrl') {
    (cfg.beacon ??= {}).mqttUrl = val
  } else if (id === 'consumerId' || id === 'deviceId') {
    cfg.beacon ??= {}
    cfg.beacon.consumers ??= [{}]
    if (id === 'consumerId') cfg.beacon.consumers[0].consumerId = val
    else                     cfg.beacon.consumers[0].deviceId   = val
  } else if (/^trim\d+$/.test(id)) {
    cfg.display ??= {}
    if (!cfg.display.brightnessTrims) cfg.display.brightnessTrims = collectTrimValues()
  }
}

function showSaveError() {
  const msg = elSavebar.querySelector('.savebar-msg')
  elSavebar.classList.add('err')
  msg.textContent = 'Save failed — try again'
  setTimeout(() => {
    elSavebar.classList.remove('err')
    msg.textContent = 'Unsaved changes'
  }, 3000)
}

function setSaving(on) {
  elSaveBtn.innerHTML = on
    ? `<svg class="spin" width="13" height="13" viewBox="0 0 13 13" fill="none">
         <circle cx="6.5" cy="6.5" r="5" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
         <path d="M6.5 1.5A5 5 0 0 1 11.5 6.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
       </svg> Saving…`
    : `<svg width="11" height="11" viewBox="0 0 11 11" fill="none">
         <path d="M1.5 5.5L4 8.5L9.5 2.5" stroke="currentColor" stroke-width="1.5"
               stroke-linecap="round" stroke-linejoin="round"/>
       </svg> Save changes`
}

// ── Slider display ─────────────────────────────────────────────────────────────

function updateTrimSlider(slider) {
  const v   = parseInt(slider.value)
  const pos = (v + 50) / 100 * 100
  slider.style.setProperty('--fill-start', Math.min(50, pos) + '%')
  slider.style.setProperty('--fill-end',   Math.max(50, pos) + '%')

  const valEl = document.getElementById(slider.id + 'Val')
  if (valEl) valEl.textContent = (v >= 0 ? '+' : '') + v + '%'

  const effEl = document.getElementById(slider.id + 'Eff')
  if (effEl) {
    const master = parseInt(slider.dataset.master ?? 80)
    effEl.textContent = Math.max(0, Math.min(100, master + v)) + '%'
  }
}

function updateSliderDisplay(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100
  slider.style.setProperty('--fill', pct + '%')
  const el = document.getElementById(slider.id + 'Val')
  if (el) el.textContent = slider.value + (slider.dataset.unit || '')
}

function syncColorHex(input) {
  const el = document.getElementById(input.id + 'Hex')
  if (el) el.textContent = input.value.toUpperCase()
}

// ── Master brightness ──────────────────────────────────────────────────────────

function setMasterBrightness(pct) {
  const fill = document.querySelector('.master-fill')
  const val  = document.querySelector('.s-row--master .slider-value')
  if (fill) fill.style.setProperty('--fill', pct + '%')
  if (val)  val.textContent = pct + '%'
  document.querySelectorAll('.trim-slider').forEach(s => {
    s.dataset.master = pct
    updateTrimSlider(s)
  })
}

// ── Brightness trim rows ───────────────────────────────────────────────────────

const TRIM_LABELS = ['Front Display', 'Back Panel', 'Side Strip']

function collectTrimValues() {
  return Array.from(document.querySelectorAll('.trim-slider'))
              .map(s => parseInt(s.value))
}

function renderTrimRows(count, trims) {
  const card = document.getElementById('brightness-card')
  if (!card) return

  card.querySelectorAll('.s-row--trim').forEach(r => r.remove())

  const master = parseInt(document.querySelector('.trim-slider')?.dataset.master ?? 80)

  for (let i = 0; i < count; i++) {
    const id    = `trim${i}`
    const label = TRIM_LABELS[i] ?? `Channel ${i + 1}`
    const val   = trims[i] ?? 0
    const row   = document.createElement('div')
    row.className        = 's-row s-row--trim'
    row.dataset.field    = id
    row.innerHTML = `
      <div class="field-label"><div class="field-name">${label}</div></div>
      <div class="field-control">
        <input class="s-slider trim-slider" type="range" id="${id}" min="-50" max="50" step="1"
               value="${val}" data-master="${master}" data-default="0">
        <span class="slider-value" id="${id}Val">${val >= 0 ? '+' : ''}${val}%</span>
        <span class="effective-val" id="${id}Eff">${Math.max(0, Math.min(100, master + val))}%</span>
      </div>`
    card.appendChild(row)

    originals[id] = val

    const slider = row.querySelector('.trim-slider')
    slider.addEventListener('input', () => {
      updateTrimSlider(slider)
      onFieldChange(row)
    })
    slider.addEventListener('dblclick', () => {
      slider.value = slider.dataset.default
      slider.dispatchEvent(new Event('input', { bubbles: true }))
    })
    updateTrimSlider(slider)
  }
}

// ── Runtime readonly fields ────────────────────────────────────────────────────

function setRuntimeFields(runtime) {
  if (!runtime) return

  const name0 = Array.isArray(runtime.names) ? runtime.names[0] : null
  if (name0) {
    const shortEl = document.getElementById('rt-short-name')
    const longEl  = document.getElementById('rt-long-name')
    if (shortEl) shortEl.value = name0.short ?? ''
    if (longEl)  longEl.value  = name0.long  ?? ''
  }

  const stateEl = document.getElementById('rt-state')
  if (stateEl && runtime.stateOnDisconnect != null)
    stateEl.value = String(runtime.stateOnDisconnect)

  const flipEl = document.getElementById('rt-flip-sides')
  if (flipEl && runtime.flipSides != null)
    flipEl.checked = Boolean(runtime.flipSides)
}

// ── WiFi scan ──────────────────────────────────────────────────────────────────

async function startScan() {
  const btn = document.getElementById('btn-scan')
  btn.classList.add('scanning')
  btn.disabled = true
  try {
    await fetchWithTimeout('/api/scan/start', { method: 'POST' })
  } catch {}
  pollScan()
}

async function pollScan() {
  try {
    const res = await fetchWithTimeout('/api/scan')
    if (res.ok) {
      const data = await res.json()
      if (data.scanning) { setTimeout(pollScan, 1000); return }
      populateScanResults(data.results || [])
    }
  } catch {}
  const btn = document.getElementById('btn-scan')
  btn.classList.remove('scanning')
  btn.disabled = false
}

function populateScanResults(results) {
  const dd = document.getElementById('scan-dropdown')
  dd.innerHTML = ''
  if (!results.length) { dd.hidden = true; return }

  results.sort((a, b) => b.rssi - a.rssi)
  results.forEach(({ ssid, rssi }) => {
    const item = document.createElement('button')
    item.type      = 'button'
    item.className = 'scan-item'
    item.innerHTML = `<span class="scan-ssid">${ssid}</span><span class="scan-rssi">${rssi} dBm</span>`
    item.addEventListener('click', () => {
      const input = document.getElementById('wifiSsid')
      input.value = ssid
      input.dispatchEvent(new Event('input', { bubbles: true }))
      dd.hidden = true
    })
    dd.appendChild(item)
  })
  dd.hidden = false
}

// ── Status polling ─────────────────────────────────────────────────────────────

let pollDelay = 5000

async function pollStatus() {
  try {
    const res = await fetchWithTimeout('/api/status')
    updateStatusPills(res.ok ? await res.json() : {})
    pollDelay = 5000
  } catch {
    updateStatusPills({})
    pollDelay = Math.min(pollDelay * 2, 30000)
  }
  setTimeout(pollStatus, pollDelay)
}

function updateStatusPills(data) {
  const wifiPill   = document.getElementById('pill-wifi')
  const beaconPill = document.getElementById('pill-beacon')

  wifiPill.className = data.wifi ? 'status-pill ok' : 'status-pill err'
  document.getElementById('pill-wifi-text').textContent
    = data.wifi ? `WiFi · ${data.ssid ?? 'Connected'}` : 'WiFi · Offline'
  if (data.ip) wifiPill.dataset.tooltip = data.ip
  else wifiPill.removeAttribute('data-tooltip')

  beaconPill.className = data.beacon ? 'status-pill ok' : 'status-pill'
  document.getElementById('pill-beacon-text').textContent
    = data.beacon ? 'Beacon · Online' : 'Beacon · Offline'
}

// ── Load config ────────────────────────────────────────────────────────────────

async function loadConfig() {
  try {
    const res = await fetchWithTimeout('/api/config')
    if (!res.ok) return
    applyConfig(await res.json())
  } catch {}
}

function applyConfig(cfg) {
  // Header
  if (cfg.device) {
    const nameEl  = document.getElementById('app-device-name')
    const modelEl = document.getElementById('app-device-model')
    if (nameEl  && cfg.device.name)  nameEl.textContent  = cfg.device.name
    if (modelEl && cfg.device.model) modelEl.textContent = cfg.device.model
  }

  // AP SSID (readonly display only)
  const apSsidEl = document.getElementById('apSsid')
  if (apSsidEl) apSsidEl.value = cfg.network?.apSsid ?? ''

  // Editable fields
  const fieldMap = {
    deviceName: cfg.device?.name,
    wifiSsid:   cfg.network?.ssid,
    baseUrl:    cfg.beacon?.mqttUrl,
    consumerId: cfg.beacon?.consumers?.[0]?.consumerId,
    deviceId:   cfg.beacon?.consumers?.[0]?.deviceId,
  }
  Object.entries(fieldMap).forEach(([id, val]) => {
    if (val == null) return
    const row = document.querySelector(`.s-row[data-field="${id}"]`)
    if (row) setFieldValue(row, val)
  })

  // Brightness trims (dynamic per consumerCount)
  const count = cfg.device?.consumerCount ?? 1
  const trims = cfg.display?.brightnessTrims ?? []
  renderTrimRows(count, trims)

  // Master brightness (0–100%)
  if (cfg.runtime?.masterBrightness != null)
    setMasterBrightness(cfg.runtime.masterBrightness)

  // Runtime readonly display
  setRuntimeFields(cfg.runtime)
}

// ── Init ───────────────────────────────────────────────────────────────────────

function init() {
  elSavebar    = document.getElementById('savebar')
  elPage       = document.getElementById('page')
  elReboot     = document.getElementById('savebar-reboot')
  elSaveBtn    = document.getElementById('btn-save')
  elDiscardBtn = document.getElementById('btn-discard')

  document.querySelectorAll('.s-row[data-field]').forEach(row => {
    originals[row.dataset.field] = getCurrentValue(row)
    row.querySelectorAll('input, select, textarea').forEach(el => {
      const evt = (el.type === 'checkbox' || el.type === 'radio') ? 'change' : 'input'
      el.addEventListener(evt, () => onFieldChange(row))
    })
  })

  elSaveBtn.addEventListener('click', saveChanges)
  elDiscardBtn.addEventListener('click', discardChanges)

  document.querySelectorAll('.s-slider:not(.trim-slider)').forEach(s => {
    s.addEventListener('input', () => updateSliderDisplay(s))
    updateSliderDisplay(s)
  })

  document.querySelectorAll('.trim-slider').forEach(updateTrimSlider)

  document.querySelectorAll('input[type=color]').forEach(c => {
    c.addEventListener('input', () => syncColorHex(c))
    syncColorHex(c)
  })

  document.querySelectorAll('input[type=range][data-default]:not(.trim-slider)').forEach(slider => {
    slider.addEventListener('dblclick', () => {
      slider.value = slider.dataset.default
      slider.dispatchEvent(new Event('input', { bubbles: true }))
    })
  })

  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.password-wrap').querySelector('input')
      const show  = input.type === 'text'
      input.type      = show ? 'password' : 'text'
      btn.textContent = show ? 'Show' : 'Hide'
    })
  })

  document.querySelectorAll('.clear-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.clears)
      if (!input) return
      input.value = ''
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  })

  const scanBtn = document.getElementById('btn-scan')
  if (scanBtn) scanBtn.addEventListener('click', startScan)

  document.addEventListener('click', e => {
    if (!e.target.closest('#wifiCombo')) {
      const dd = document.getElementById('scan-dropdown')
      if (dd) dd.hidden = true
    }
  })
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig()
  init()
  pollStatus()
})
