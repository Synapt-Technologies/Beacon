interface IconProps { size?: number; className?: string; style?: React.CSSProperties }

const i = (d: string, extra?: string) =>
  ({ size = 16, className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
         className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <path d={d} stroke="currentColor" strokeWidth="1.3"
            strokeLinecap="round" strokeLinejoin="round" {...(extra ? { dangerouslySetInnerHTML: { __html: extra } } : {})} />
    </svg>
  )

export function IconGrid({ size = 16, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...p}>
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9"   y="9"   width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
}

export function IconCircleDot({ size = 16, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...p}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
    </svg>
  )
}

export function IconTallyDevice({ size = 16, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...p}>
      <rect x="1" y="4" width="14" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="13" cy="8" r="1" fill="currentColor"/>
      <line x1="3" y1="8" x2="8" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

export function IconConnections({ size = 16, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...p}>
      <circle cx="4"  cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="6" y1="7.2" x2="10" y2="5"  stroke="currentColor" strokeWidth="1.2"/>
      <line x1="6" y1="8.8" x2="10" y2="11" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

export function IconSettings({ size = 16, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...p}>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.42 1.42M11.36 11.36l1.42 1.42M3.22 12.78l1.42-1.42M11.36 4.64l1.42-1.42"
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconChevronRight({ size = 12, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" {...p}>
      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconChevronLeft({ size = 13, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none" {...p}>
      <path d="M8 2L4 6.5L8 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconFullscreen({ size = 12, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" {...p}>
      <path d="M1.5 1.5h4M1.5 1.5v4M10.5 10.5H6.5M10.5 10.5V6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconCheck({ size = 13, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none" {...p}>
      <path d="M2 6.5L5 9.5L11 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconReset({ size = 12, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" {...p}>
      <path d="M10 6A4 4 0 1 1 7 2.1V1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <polyline points="5,1 7,1 7,3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconBeacon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" fill="white"/>
      <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.2" fill="none" opacity=".6"/>
      <circle cx="8" cy="8" r="7.5" stroke="white" strokeWidth=".8" fill="none" opacity=".3"/>
    </svg>
  )
}

export function IconSource({ size = 16, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 -960 960 960" {...p}>
      <path d="M200-120q-17 0-28.5-11.5T160-160v-40h-40v-160q0-17 11.5-28.5T160-400h40v-280q0-66 47-113t113-47q66 0 113 47t47 113v400q0 33 23.5 56.5T600-200q33 0 56.5-23.5T680-280v-280h-40q-17 0-28.5-11.5T600-600v-160h40v-40q0-17 11.5-28.5T680-840h80q17 0 28.5 11.5T800-800v40h40v160q0 17-11.5 28.5T800-560h-40v280q0 66-47 113t-113 47q-66 0-113-47t-47-113v-400q0-33-23.5-56.5T360-760q-33 0-56.5 23.5T280-680v280h40q17 0 28.5 11.5T360-360v160h-40v40q0 17-11.5 28.5T280-120h-80Z"
            fill="currentColor"/>
    </svg>
  )
}

export function IconCollapse({ size = 14, flipped = false, ...p }: IconProps & { flipped?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" {...p}
         style={{ transform: flipped ? 'scaleX(-1)' : undefined }}>
      <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}