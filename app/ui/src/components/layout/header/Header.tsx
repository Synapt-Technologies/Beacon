import StatusPill from "../../statusPill/StatusPill"



export default function Header({title}: {title: string}) {
    return(
        <div style={{
          padding: '0 18px', height: 56,
          display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 10,
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          background: 'var(--color-background-primary)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {title}
          </span>
          <StatusPill />
        </div>
    )
}