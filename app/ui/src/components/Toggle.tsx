interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 30, height: 17,
        background: checked ? '#1D9E75' : 'var(--color-border-secondary)',
        borderRadius: 9, position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background .15s', flexShrink: 0,
        opacity: disabled ? .5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: 2,
        width: 13, height: 13, background: '#fff', borderRadius: '50%',
        transition: 'transform .15s',
        transform: checked ? 'translateX(13px)' : 'translateX(0)',
      }} />
    </div>
  )
}