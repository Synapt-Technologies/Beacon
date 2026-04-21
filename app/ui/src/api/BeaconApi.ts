import type { ProducerBundle, ProducerId } from '../../../src/tally/types/ProducerTypes'
import type { GlobalSource } from '../../../src/tally/types/SourceTypes'
import type { ConsumerExportMap, LifeCycleConsumerConfig, LifecycleConfig, OrchestratorConfig } from '../../../src/tally/TallyLifecycle'
import type { TallyDevice, DeviceAddress, DeviceAlertAction, DeviceAlertTarget } from '../../../src/tally/types/DeviceTypes'
import type { ConsumerId } from '../types/beacon'
import { SystemInfo } from '../../../src/types/SystemInfo'

const BASE = '/api'

async function request<T = void>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, init)
    if (!res.ok) {
        let message = `${init?.method ?? 'GET'} ${path} failed: ${res.status}`
        try { const body = await res.json(); if (body?.error) message = body.error } catch {}
        throw new Error(message)
    }
    if (res.status === 204) return undefined as T
    return res.json()
}

// ? Producers

export function getProducers(): Promise<ProducerBundle[]> {
    return request('/producers')
}

export function addProducer(type: string, config: object): Promise<void> {
    return request('/producers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, config }),
    })
}

export function updateProducer(id: ProducerId, type: string, config: object): Promise<void> {
    return request(`/producers/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, config }),
    })
}

export function removeProducer(id: ProducerId): Promise<void> {
    return request(`/producers/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function setProducerEnabled(id: ProducerId, enabled: boolean): Promise<void> {
    return request(`/producers/${encodeURIComponent(id)}/enabled`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
    })
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

export function patchDevice(device: DeviceAddress, patch: GlobalSource[]): Promise<void> {
    return request(`/devices/${device.consumer}/${device.device}/patch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch }),
    })
}

export function renameDevice(device: DeviceAddress, name: { short?: string; long: string }): Promise<void> {
    return request(`/devices/${device.consumer}/${device.device}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    })
}

export function removeDevice(device: DeviceAddress): Promise<void> {
    return request(`/devices/${device.consumer}/${device.device}`, { method: 'DELETE' })
}

export function sendAlert(device: DeviceAddress, type: DeviceAlertAction, target: DeviceAlertTarget, time: number): Promise<void> {
    return request(`/devices/${device.consumer}/${device.device}/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, target, time }),
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

export function getOrchestratorConfig(): Promise<Partial<OrchestratorConfig>> {
    return request('/config/orchestrator')
}

export function updateOrchestratorConfig(config: Partial<OrchestratorConfig>): Promise<void> {
    return request('/config/orchestrator', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    })
}

export function importConfig(config: LifecycleConfig): Promise<void> {
    return request('/config/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    })
}


// ? Info

export function getSystemInfo(): Promise<Partial<SystemInfo>> {
    return request('/info');
}


// ? Update

import type { UpdateStatus } from '../../../src/types/UpdateTypes'

export function getUpdateStatus(): Promise<UpdateStatus> {
    return request('/update/status');
}

export function checkForUpdates(): Promise<UpdateStatus> {
    return request('/update/check', { method: 'POST' });
}

export function applyUpdate(ref: string, type: 'release' | 'branch'): Promise<void> {
    return request('/update/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, type }),
    });
}