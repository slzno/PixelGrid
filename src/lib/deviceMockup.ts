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
  /** Screen corner radius — nested inside outer radius. */
  screenRadius: number
  chrome: 'island' | 'punch' | 'camera' | 'none'
  /** Show subtle hardware side buttons. */
  buttons: boolean
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
  buttons: false,
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

/**
 * Proportions inspired by current flagship frames:
 * outer radius ≈ bezel + screen radius (constant-width rim).
 */
export function getMockupSpec(
  form: DeviceForm | undefined,
  category: DeviceCategory | undefined,
): MockupSpec {
  const kind = resolveMockupKind(form, category)

  if (kind === 'phone') {
    const isIphone = category === 'iphone'
    const bezel = 12
    const screenRadius = 34
    return {
      kind,
      top: bezel,
      right: bezel,
      bottom: bezel,
      left: bezel,
      radius: bezel + screenRadius,
      screenRadius,
      chrome: isIphone ? 'island' : 'punch',
      buttons: true,
    }
  }

  if (kind === 'tablet') {
    const bezel = 14
    const screenRadius = 12
    return {
      kind,
      top: bezel,
      right: bezel,
      bottom: bezel,
      left: bezel,
      radius: bezel + screenRadius,
      screenRadius,
      chrome: 'camera',
      buttons: false,
    }
  }

  if (kind === 'laptop') {
    return {
      kind,
      top: 22,
      right: 14,
      bottom: 14,
      left: 14,
      radius: 12,
      screenRadius: 4,
      chrome: 'camera',
      buttons: false,
    }
  }

  if (kind === 'desktop') {
    return {
      kind,
      top: 14,
      right: 14,
      bottom: 14,
      left: 14,
      radius: 10,
      screenRadius: 3,
      chrome: 'camera',
      buttons: false,
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

  // Side buttons sit outside the shell; reserve a few px so toolbar aligns.
  const buttonGutter =
    spec.buttons && scale > 0.2 ? Math.round(4 * scale) : 0

  const baseExtra =
    spec.kind === 'laptop'
      ? {
          width: Math.round(frameW * 1.12),
          height: Math.round(22 * scale),
        }
      : spec.kind === 'desktop'
        ? {
            width: Math.round(frameW * 0.44),
            height: Math.round(36 * scale),
          }
        : { width: 0, height: 0 }

  return {
    frameW,
    frameH,
    outerW: Math.max(frameW, baseExtra.width) + buttonGutter * 2,
    outerH: frameH + baseExtra.height,
    baseW: baseExtra.width,
    baseH: baseExtra.height,
    buttonGutter,
  }
}
