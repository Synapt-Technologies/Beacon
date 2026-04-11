import type { ProducerBundle, ProducerId, GlobalTallySource } from '../../../src/tally/types/ProducerStates'
import type { ConsumerExportMap, LifeCycleConsumerConfig, LifecycleConfig } from '../../../src/tally/TallyLifecycle'
import type { TallyDevice, DeviceAddress, DeviceAlertState, DeviceAlertTarget } from '../../../src/tally/types/ConsumerStates'
import type { ConsumerId } from '../types/beacon'

const BASE = '/api'

async function request<T = void>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, init)
    if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status}`)
    if (res.status === 204) return undefined as T
    return res.json()
}

// ? Producers

export function getProducers(): Promise<ProducerBundle[]> {
    return request('/producers')
}

export function removeProducer(id: ProducerId): Promise<void> {
    return request(`/producers/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ? Consumers

export function getConsumers(): Promise<Partial<ConsumerExportMap>> {
    return request('/consumers')
}

export function patchConsumer(id: ConsumerId, update: LifeCycleConsumerConfig): Promise<void> {
    return request(`/consumers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
    })
}

// ? Devices

export function getDevices(): Promise<Record<string, TallyDevice[]>> {
    return request('/devices')
}

export function patchDevice(device: DeviceAddress, patch: GlobalTallySource[]): Promise<void> {
    return request(`/devices/${device.consumer}/${device.device}/patch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch }),
    })
}

export function renameDevice(device: DeviceAddress, name: { short: string; long: string }): Promise<void> {
    return request(`/devices/${device.consumer}/${device.device}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    })
}

export function sendAlert(device: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget): Promise<void> {
    return request(`/devices/${device.consumer}/${device.device}/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, target }),
    })
}

// ? Config

export async function exportConfig(): Promise<void> {
    const config = await request<LifecycleConfig>('/config/export')
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: 'beacon-config.json' })
    a.click()
    URL.revokeObjectURL(url)
}

export function importConfig(config: LifecycleConfig): Promise<void> {
    return request('/config/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    })
}
