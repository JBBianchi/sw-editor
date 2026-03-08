# Data Model: Rete Dynamic Socket Orientation

## Entities

### ReteNodePayload

- `id: string`
- `label: string`
- `selected?: boolean`
- `inputs?: Record<string, InputPayload | undefined>`
- `outputs?: Record<string, OutputPayload | undefined>`
- `controls?: Record<string, ControlPayload | undefined>`

### NodeRenderMode

- `vertical` (derived from `top-to-bottom`)
- `horizontal` (derived from `left-to-right`)

### PortSideMeasurement

- `edgeId: string`
- `sourceSide: top | right | bottom | left`
- `targetSide: top | right | bottom | left`
- `orientation: top-to-bottom | left-to-right`
- `sourceDistancePx: number`
- `targetDistancePx: number`

## Invariants

- For `top-to-bottom`: `sourceSide=bottom` and `targetSide=top`.
- For `left-to-right`: `sourceSide=right` and `targetSide=left`.
- Endpoint side checks apply to every rendered edge in test scope.
- Orientation toggle TB -> LR -> TB preserves side invariants after each switch.
