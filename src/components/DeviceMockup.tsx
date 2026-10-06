import type { CSSProperties, ReactNode } from 'react'
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
  buttonGutter?: number
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
  buttonGutter = 0,
  children,
}: DeviceMockupProps) {
  if (spec.kind === 'none') {
    return <>{children}</>
  }

  const pad = {
    top: Math.max(1, Math.round(spec.top * scale)),
    right: Math.max(1, Math.round(spec.right * scale)),
    bottom: Math.max(1, Math.round(spec.bottom * scale)),
    left: Math.max(1, Math.round(spec.left * scale)),
  }
  const radius = Math.max(8, Math.round(spec.radius * scale))
  const screenRadius = Math.max(3, Math.round(spec.screenRadius * scale))

  const shellStyle = {
    width: frameW,
    height: frameH,
    borderRadius: radius,
    paddingTop: pad.top,
    paddingRight: pad.right,
    paddingBottom: pad.bottom,
    paddingLeft: pad.left,
    ['--dm-radius' as string]: `${radius}px`,
    ['--dm-screen-radius' as string]: `${screenRadius}px`,
  } as CSSProperties

  return (
    <div
      className={`device-mockup kind-${spec.kind}`}
      style={{ width: outerW }}
    >
      <div
        className="device-mockup-shell-wrap"
        style={{ paddingInline: buttonGutter }}
      >
        {spec.buttons && (
          <>
            <span className="device-mockup-hardbtn power" aria-hidden />
            <span className="device-mockup-hardbtn mute" aria-hidden />
            <span className="device-mockup-hardbtn vol-up" aria-hidden />
            <span className="device-mockup-hardbtn vol-down" aria-hidden />
          </>
        )}

        <div className="device-mockup-shell" style={shellStyle}>
          {spec.chrome === 'camera' && (
            <span
              className="device-mockup-webcam"
              style={{
                width: Math.round(Math.max(5, 7 * scale)),
                height: Math.round(Math.max(5, 7 * scale)),
                top: Math.round(Math.max(3, pad.top * 0.38)),
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

            {spec.chrome === 'island' && (
              <span
                className="device-mockup-island"
                style={{
                  width: Math.round(Math.min(screenW * 0.3, 100 * scale)),
                  height: Math.round(Math.max(8, 26 * scale * 0.5)),
                  top: Math.round(Math.max(6, 10 * scale)),
                }}
                aria-hidden
              />
            )}
            {spec.chrome === 'punch' && (
              <span
                className="device-mockup-punch"
                style={{
                  width: Math.round(Math.max(7, 11 * scale)),
                  height: Math.round(Math.max(7, 11 * scale)),
                  top: Math.round(Math.max(6, 10 * scale)),
                }}
                aria-hidden
              />
            )}
          </div>
        </div>
      </div>

      {spec.kind === 'laptop' && baseH > 0 && (
        <div
          className="device-mockup-laptop-base"
          style={{ width: baseW, height: baseH }}
          aria-hidden
        >
          <span className="device-mockup-laptop-indent" />
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
