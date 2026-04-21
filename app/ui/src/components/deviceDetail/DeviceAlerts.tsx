import { AlertButtons } from '../AlertButtons'
import { useBeacon } from '../../context/BeaconContext'
import { DeviceAlertAction, DeviceAlertTarget } from '../../../../src/tally/types/DeviceTypes'
import type { DeviceAddress } from '../../../../src/tally/types/DeviceTypes'
import type { UIAlertSlot } from '../../../../src/types/UIStates'
import type { AlertSlot } from '../../types/beacon'

interface DeviceAlertsProps {
    device: DeviceAddress
    slots: UIAlertSlot[]
}

export default function DeviceAlerts({ device, slots }: DeviceAlertsProps) {
    const { sendAlert } = useBeacon()

    const alertSlots: AlertSlot[] = slots.map(slot => ({
        action: DeviceAlertAction[slot.action] as AlertSlot['action'],
        target: slot.target !== null ? DeviceAlertTarget[slot.target] as AlertSlot['target'] : null,
        timeout: slot.timeout,
    }))

    const handleAlert = async (action: string, target: string | null, time: number) => {
        const type = DeviceAlertAction[action as keyof typeof DeviceAlertAction]
        const tgt  = target ? DeviceAlertTarget[target as keyof typeof DeviceAlertTarget] : DeviceAlertTarget.ALL
        try { await sendAlert(device, type, tgt, time) } catch { /* fire-and-forget */ }
    }

    return (
        <div style={{
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-lg)', padding: '12px 14px', marginTop: 10,
        }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                Alerts
            </div>
            <AlertButtons slots={alertSlots} onAlert={handleAlert} />
        </div>
    )
}
