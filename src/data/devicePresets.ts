export type DevicePreset = {
  id: string
  name: string
  width: number
  height: number
  scale?: number
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667 },
  { id: 'iphone-14', name: 'iPhone 14', width: 390, height: 844 },
  { id: 'ipad', name: 'iPad', width: 768, height: 1024 },
  { id: 'desktop-1280', name: 'Desktop 1280', width: 1280, height: 800 },
  { id: 'desktop-1440', name: 'Desktop 1440', width: 1440, height: 900 },
  { id: 'freeform', name: 'Freeform', width: 1024, height: 768 },
]

export function getPresetById(id: string): DevicePreset | undefined {
  return DEVICE_PRESETS.find((preset) => preset.id === id)
}
