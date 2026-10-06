import type { DeviceCategory, DeviceForm } from '../data/devicePresets'

export type MockupKind = 'none' | 'phone' | 'tablet' | 'laptop' | 'desktop'

export type MockupSpec = {
  kind: MockupKind
  /** Bezel thickness in CSS device px (before zoom). */
  top: number
  right: number
  bottom: number
  left: number
  /** Outer corner radius (device px). */
  radius: number
  /** Screen corner radius inside bezel (device px). */
  screenRadius: number
  /** iPhone-style dynamic island / Android camera. */
  chrome: 'island' | 'pill' | 'camera' | 'none'
}

const NONE: MockupSpec = {
  kind: 'none',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  radius: 0,
  screenRadius: 0,
  chrome: 'none',
}

export function resolveMockupKind(
  form: DeviceForm | undefined,
  category: DeviceCategory | undefined,
): MockupKind {
  if (form === 'phone') return 'phone'
  if (form === 'tablet') return 'tablet'
  if (form === 'laptop') return 'laptop'
  if (form === 'desktop') return 'desktop'
  if (category === 'iphone' || category === 'android' || category === 'xiaomi') {
    return 'phone'
  }
  if (category === 'ipad' || category === 'android-tablet') return 'tablet'
  if (category === 'laptop') return 'laptop'
  if (category === 'desktop') return 'desktop'
  return 'none'
}

export function getMockupSpec(
  form: DeviceForm | undefined,
  category: DeviceCategory | undefined,
): MockupSpec {
  const kind = resolveMockupKind(form, category)

  if (kind === 'phone') {
    const isIphone = category === 'iphone'
    return {
      kind,
      top: 16,
      right: 12,
      bottom: 16,
      left: 12,
      radius: 42,
      screenRadius: 32,
      chrome: isIphone ? 'island' : 'pill',
    }
  }

  if (kind === 'tablet') {
    return {
      kind,
      top: 18,
      right: 16,
      bottom: 18,
      left: 16,
      radius: 28,
      screenRadius: 12,
      chrome: 'camera',
    }
  }

  if (kind === 'laptop') {
    return {
      kind,
      top: 20,
      right: 14,
      bottom: 14,
      left: 14,
      radius: 12,
      screenRadius: 4,
      chrome: 'camera',
    }
  }

  if (kind === 'desktop') {
    return {
      kind,
      top: 12,
      right: 12,
      bottom: 12,
      left: 12,
      radius: 10,
      screenRadius: 3,
      chrome: 'none',
    }
  }

  return NONE
}

/** screenW/H are already zoom-scaled clip sizes. */
export function mockupOuterSize(
  spec: MockupSpec,
  screenW: number,
  screenH: number,
  scale: number,
) {
  const padX = Math.round((spec.left + spec.right) * scale)
  const padY = Math.round((spec.top + spec.bottom) * scale)
  const frameW = screenW + padX
  const frameH = screenH + padY
  const baseExtra =
    spec.kind === 'laptop'
      ? {
          width: Math.round(frameW * 1.1),
          height: Math.round(20 * scale),
        }
      : spec.kind === 'desktop'
        ? {
            width: Math.round(frameW * 0.4),
            height: Math.round(30 * scale),
          }
        : { width: 0, height: 0 }

  return {
    frameW,
    frameH,
    outerW: Math.max(frameW, baseExtra.width),
    outerH: frameH + baseExtra.height,
    baseW: baseExtra.width,
    baseH: baseExtra.height,
  }
}
