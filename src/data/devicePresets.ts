export type DeviceForm = 'phone' | 'tablet' | 'laptop' | 'desktop' | 'freeform'

export type DevicePreset = {
  id: string
  name: string
  width: number
  height: number
  scale?: number
  platform?: string
  ppi?: number
  form?: DeviceForm
}

/** Default workspace order: Mobile → Tablet → Laptop. */
export const DEFAULT_PANE_PRESET_IDS = [
  'mobile-phone',
  'small-tablet',
  'laptop',
] as const

/** Presets shown in the "Add pane" menu. */
export const ADD_PANE_PRESETS = [
  'iphone-17-pro-max',
  'ipad',
  'desktop',
  'freeform',
] as const

export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: 'mobile-phone',
    name: 'Mobile Phone',
    width: 320,
    height: 568,
    platform: 'iOS',
    ppi: 326,
    form: 'phone',
  },
  {
    id: 'small-tablet',
    name: 'Small Tablet',
    width: 500,
    height: 768,
    platform: 'iPadOS',
    ppi: 264,
    form: 'tablet',
  },
  {
    id: 'laptop',
    name: 'Laptop',
    width: 1280,
    height: 800,
    platform: 'Desktop',
    ppi: 96,
    form: 'laptop',
  },
  {
    id: 'iphone-17-pro-max',
    name: 'iPhone 17 Pro Max',
    width: 440,
    height: 956,
    platform: 'iOS',
    ppi: 460,
    form: 'phone',
  },
  {
    id: 'ipad',
    name: 'iPad',
    width: 820,
    height: 1180,
    platform: 'iPadOS',
    ppi: 264,
    form: 'tablet',
  },
  {
    id: 'desktop',
    name: 'Desktop',
    width: 1920,
    height: 1080,
    platform: 'Desktop',
    ppi: 96,
    form: 'desktop',
  },
  {
    id: 'iphone-16-pro',
    name: 'iPhone 16 Pro',
    width: 402,
    height: 874,
    platform: 'iOS',
    ppi: 460,
    form: 'phone',
  },
  {
    id: 'iphone-se',
    name: 'iPhone SE',
    width: 375,
    height: 667,
    platform: 'iOS',
    ppi: 326,
    form: 'phone',
  },
  {
    id: 'freeform',
    name: 'Custom size',
    width: 1024,
    height: 768,
    platform: 'Custom',
    ppi: 96,
    form: 'freeform',
  },
]

export function getPresetById(id: string): DevicePreset | undefined {
  return DEVICE_PRESETS.find((preset) => preset.id === id)
}

/** Label format: "320×568px" */
export function formatSizeLabel(width: number, height: number) {
  return `${Math.round(width)}×${Math.round(height)}px`
}

export function formatDeviceMeta(opts: {
  width: number
  height: number
  platform?: string
  ppi?: number
}) {
  const platform = opts.platform ?? 'Custom'
  const ppi = opts.ppi ?? 96
  return `${platform} · ${opts.width}×${opts.height}/${ppi}ppi`
}
