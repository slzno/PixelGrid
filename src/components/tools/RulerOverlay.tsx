import { useCallback, useRef, useState, type PointerEvent } from 'react'

type Point = { x: number; y: number }

export function RulerOverlay() {
  const [start, setStart] = useState<Point | null>(null)
  const [end, setEnd] = useState<Point | null>(null)
  const dragging = useRef(false)

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    dragging.current = true
    setStart(point)
    setEnd(point)
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    setEnd({ x: event.clientX - rect.left, y: event.clientY - rect.top })
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  const width = start && end ? Math.abs(end.x - start.x) : 0
  const height = start && end ? Math.abs(end.y - start.y) : 0
  const left = start && end ? Math.min(start.x, end.x) : 0
  const top = start && end ? Math.min(start.y, end.y) : 0

  return (
    <div
      className="tool-overlay ruler-overlay"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {start && end && (
        <>
          <div
            className="ruler-box"
            style={{ left, top, width, height }}
          />
          <div className="ruler-label" style={{ left: left + width + 8, top }}>
            {Math.round(width)} × {Math.round(height)} px
          </div>
        </>
      )}
    </div>
  )
}
