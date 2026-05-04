const originals = {}
const changed   = new Set()

let elSavebar, elPage, elReboot, elSaveBtn, elDiscardBtn

async function fetchWithTimeout(url, opts = {}, ms = 4000) {
  const ctrl = new AbortController()
  const tid  = setTimeout(() => ctrl.abort(), ms)
  try { return await fetch(url, { ...opts, signal: ctrl.signal }) }
  finally { clearTimeout(tid) }
}

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
      .forEach(r => r.checked = r.value === val)
  } else if (box) {
    box.checked = Boolean(val)
  } else if (visual) {
    visual.value = val
    if (slider) updateSliderDisplay(slider)
  }
  const color = row.querySelector('input[type=color]')
  if (color) syncColorHex(color)
}

function onFieldChange(row) {
  const id       = row.dataset.field
  const changed_ = getCurrentValue(row) !== originals[id]
  const visual   = getVisualInput(row)
  const rg       = row.querySelector('.radio-group')

  row.classList.toggle('changed', changed_)
  visual?.classList.toggle('changed', changed_)
  rg?.classList.toggle('changed', changed_)

  changed_  ? changed.add(id) : changed.delete(id)
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

async function saveChanges() {
  setSaving(true)
  elSaveBtn.disabled = elDiscardBtn.disabled = true

  const payload = {}
  changed.forEach(id => {
    const row = document.querySelector(`.s-row[data-field="${id}"]`)
    if (row) payload[id] = getCurrentValue(row)
  })

  try {
    const res = await fetchWithTimeout('/api/settings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    if (!res.ok) throw new Error()
    Object.assign(originals, payload)
    document.querySelectorAll('.changed').forEach(el => el.classList.remove('changed'))
    changed.clear()
    updateSavebar()
  } catch {
    // savebar stays open for retry
  }

  setSaving(false)
  elSaveBtn.disabled = elDiscardBtn.disabled = false
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

  wifiPill.className            = data.wifi ? 'status-pill ok' : 'status-pill err'
  document.getElementById('pill-wifi-text').textContent
    = data.wifi ? `WiFi · ${data.ssid ?? 'Connected'}` : 'WiFi · Offline'

  beaconPill.className          = data.beacon ? 'status-pill ok' : 'status-pill'
  document.getElementById('pill-beacon-text').textContent
    = data.beacon ? 'Beacon · Online' : 'Beacon · Offline'
}

async function loadSettings() {
  try {
    const res = await fetchWithTimeout('/api/settings')
    if (!res.ok) return
    const data = await res.json()
    Object.entries(data).forEach(([id, val]) => {
      const row = document.querySelector(`.s-row[data-field="${id}"]`)
      if (row) setFieldValue(row, val)
    })
  } catch {}
}

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

  document.querySelectorAll('.s-slider').forEach(s => {
    s.addEventListener('input', () => updateSliderDisplay(s))
    updateSliderDisplay(s)
  })

  document.querySelectorAll('input[type=color]').forEach(c => {
    c.addEventListener('input', () => syncColorHex(c))
    syncColorHex(c)
  })

  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.password-wrap').querySelector('input')
      const show  = input.type === 'text'
      input.type      = show ? 'password' : 'text'
      btn.textContent = show ? 'Show' : 'Hide'
    })
  })
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings()
  init()
  pollStatus()
})
