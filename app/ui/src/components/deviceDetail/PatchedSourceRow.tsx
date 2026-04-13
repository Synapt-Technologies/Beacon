import type { GlobalTallySource, ProducerBundle, SourceInfo } from '../../../../src/tally/types/ProducerStates'

interface PatchedSourceRowProps {
    src: GlobalTallySource
    producers: ProducerBundle[]
}

export default function PatchedSourceRow({ src, producers }: PatchedSourceRowProps) {
    const globalKey = `${src.producer}:${src.source}`

    // sources are plain objects at runtime (serialized from Map by the server)
    let srcInfo: SourceInfo | undefined
    for (const p of producers) {
        const sources = p.info?.sources as unknown as Record<string, SourceInfo>
        if (sources?.[globalKey]) { srcInfo = sources[globalKey]; break }
    }
    const prod = producers.find(p => p.config.id === src.producer)

    return (
        <div style={{
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-md)',
            padding: '8px 11px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5,
        }}>
            <span style={{
                fontSize: 10, fontWeight: 500, padding: '2px 7px',
                borderRadius: 4, border: '0.5px solid currentColor',
                flexShrink: 0, minWidth: 30, textAlign: 'center',
                color: 'var(--color-text-secondary)',
            }}>
                {srcInfo?.short ?? src.source}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {srcInfo?.long ?? `Source ${src.source}`}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                    {prod?.config.name ?? src.producer}
                </div>
            </div>
        </div>
    )
}
