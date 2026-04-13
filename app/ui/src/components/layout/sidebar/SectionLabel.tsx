

export default function SectionLabel({ children, collapsed }: { children: string; collapsed: boolean }) {
    return (
        <div style={{
        fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '.08em',
        padding: '10px 14px 4px', whiteSpace: 'nowrap',
        opacity: collapsed ? 0 : 1, transition: 'opacity .15s',
        }}>
        {children}
        </div>
    );
}