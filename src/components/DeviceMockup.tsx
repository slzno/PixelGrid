import type { ReactNode } from 'react'
import type { MockupSpec } from '@/lib/deviceMockup'

type DeviceMockupProps = {
  spec: MockupSpec
  scale: number
  screenW: number
  screenH: number
  outerW: number
  frameW: number
  frameH: number
  baseW: number
  baseH: number
  children: ReactNode
}

export function DeviceMockup({
  spec,
  scale,
  screenW,
  screenH,
  outerW,
  frameW,
  frameH,
  baseW,
  baseH,
  children,
}: DeviceMockupProps) {
  if (spec.kind === 'none') {
    return <>{children}</>
  }

  const pad = {
    top: Math.round(spec.top * scale),
    right: Math.round(spec.right * scale),
    bottom: Math.round(spec.bottom * scale),
    left: Math.round(spec.left * scale),
  }
  const radius = Math.max(4, Math.round(spec.radius * scale))
  const screenRadius = Math.max(2, Math.round(spec.screenRadius * scale))

  return (
    <div
      className={`device-mockup kind-${spec.kind}`}
      style={{ width: outerW }}
    >
      <div
        className="device-mockup-frame"
        style={{
          width: frameW,
          height: frameH,
          borderRadius: radius,
          paddingTop: pad.top,
          paddingRight: pad.right,
          paddingBottom: pad.bottom,
          paddingLeft: pad.left,
        }}
      >
        {spec.chrome === 'island' && (
          <span
            className="device-mockup-island"
            style={{
              top: Math.max(4, Math.round(pad.top * 0.35)),
              width: Math.round(Math.min(screenW * scale * 0.28, 92 * scale)),
              height: Math.round(Math.max(8, 22 * scale * 0.55)),
              borderRadius: 999,
            }}
            aria-hidden
          />
        )}
        {spec.chrome === 'pill' && (
          <span
            className="device-mockup-pill"
            style={{
              top: Math.max(3, Math.round(pad.top * 0.28)),
              width: Math.round(Math.max(10, 48 * scale * 0.45)),
              height: Math.round(Math.max(5, 14 * scale * 0.4)),
              borderRadius: 999,
            }}
            aria-hidden
          />
        )}
        {spec.chrome === 'camera' && (
          <span
            className="device-mockup-camera"
            style={{
              top: Math.max(3, Math.round(pad.top * 0.38)),
              width: Math.round(Math.max(5, 8 * scale)),
              height: Math.round(Math.max(5, 8 * scale)),
            }}
            aria-hidden
          />
        )}

        <div
          className="device-mockup-screen"
          style={{
            width: screenW,
            height: screenH,
            borderRadius: screenRadius,
          }}
        >
          {children}
        </div>
      </div>

      {spec.kind === 'laptop' && baseH > 0 && (
        <div
          className="device-mockup-laptop-base"
          style={{ width: baseW, height: baseH }}
          aria-hidden
        >
          <span className="device-mockup-laptop-lip" />
        </div>
      )}

      {spec.kind === 'desktop' && baseH > 0 && (
        <div
          className="device-mockup-desktop-stand"
          style={{ width: baseW, height: baseH }}
          aria-hidden
        >
          <span className="device-mockup-desktop-neck" />
          <span className="device-mockup-desktop-foot" />
        </div>
      )}
    </div>
  )
}
