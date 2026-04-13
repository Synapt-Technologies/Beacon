/** Single source of truth for producer type metadata. */

export interface ProducerFieldDef {
    key:         string
    label:       string
    type:        'text' | 'number'
    placeholder: string
    default:     string | number
}

export interface ProducerTypedef {
    id:          string        // matches TallyFactory switch case
    label:       string        // long label, e.g. "ATEM Switcher"
    shortLabel:  string        // short brand label, e.g. "ATEM"
    defaultName: string
    fields:      ProducerFieldDef[]
}

export const PRODUCER_TYPES: ProducerTypedef[] = [
    {
        id:          'AtemNetClientTallyProducer',
        label:       'ATEM Switcher',
        shortLabel:  'ATEM',
        defaultName: 'ATEM',
        fields: [
            { key: 'host', label: 'Host / IP', type: 'text',   placeholder: '192.168.1.100', default: ''   },
            { key: 'port', label: 'Port',       type: 'number', placeholder: '9910',          default: 9910 },
        ],
    },
]

/** Map from producer type id → metadata (for fast lookup). */
export const PRODUCER_TYPE_MAP: Record<string, ProducerTypedef> = Object.fromEntries(
    PRODUCER_TYPES.map(t => [t.id, t])
)
