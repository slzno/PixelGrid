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

export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: 'laptop-m',
    name: 'Laptop-M',
    width: 1366,
    height: 768,
    platform: 'Windows',
    ppi: 100,
    form: 'laptop',
  },
  {
    id: 'pixel-8-pro',
    name: 'Google Pixel 8 Pro',
    width: 448,
    height: 998,
    platform: 'Android',
    ppi: 489,
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
    id: 'iphone-14',
    name: 'iPhone 14',
    width: 390,
    height: 844,
    platform: 'iOS',
    ppi: 460,
    form: 'phone',
  },
  {
    id: 'ipad',
    name: 'iPad',
    width: 768,
    height: 1024,
    platform: 'iPadOS',
    ppi: 264,
    form: 'tablet',
  },
  {
    id: 'desktop-1280',
    name: 'Desktop 1280',
    width: 1280,
    height: 800,
    platform: 'Desktop',
    ppi: 96,
    form: 'desktop',
  },
  {
    id: 'desktop-1440',
    name: 'Desktop 1440',
    width: 1440,
    height: 900,
    platform: 'Desktop',
    ppi: 96,
    form: 'desktop',
  },
  {
    id: 'freeform',
    name: 'Freeform',
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

export function formatDeviceLabel(opts: {
  name: string
  width: number
  height: number
  platform?: string
  ppi?: number
}) {
  const platform = opts.platform ?? 'Custom'
  const ppi = opts.ppi ?? 96
  return `${opts.name} | ${platform} (${opts.width}x${opts.height}/${ppi}ppi)`
}
