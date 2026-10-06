import { useState } from 'react'
import { Camera } from 'lucide-react'
import {
  SCREENSHOT_QUALITIES,
  capturePaneScreenshot,
  getStoredScreenshotQuality,
  setStoredScreenshotQuality,
  type ScreenshotQuality,
} from '@/lib/screenshot'
import { relockPane } from '@/lib/webviewSize'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

type ScreenshotMenuProps = {
  paneId: string
  width: number
  height: number
  /** Visual style: topbar icon or pane toolbar icon. */
  variant?: 'topbar' | 'pane'
  className?: string
}

export function ScreenshotMenu({
  paneId,
  width,
  height,
  variant = 'pane',
  className,
}: ScreenshotMenuProps) {
  const { setFocusedPane, setStatusMessage } = useAppStore()
  const [quality, setQuality] = useState<ScreenshotQuality>(
    getStoredScreenshotQuality,
  )
  const [busy, setBusy] = useState(false)

  const runCapture = async (nextQuality: ScreenshotQuality) => {
    setQuality(nextQuality)
    setStoredScreenshotQuality(nextQuality)
    setFocusedPane(paneId)
    setBusy(true)
    setStatusMessage(`Capturando ${nextQuality.toUpperCase()}…`)
    try {
      const result = await capturePaneScreenshot(paneId, {
        width,
        height,
        quality: nextQuality,
      })
      if (result.canceled) {
        setStatusMessage('Captura cancelada')
        return
      }
      if (!result.ok) {
        setStatusMessage(result.error || 'Captura fallida')
        return
      }
      const size =
        result.width && result.height
          ? ` (${result.width}×${result.height})`
          : ''
      setStatusMessage(`Guardado${size}: ${result.path}`)
      window.setTimeout(() => relockPane(paneId), 50)
      window.setTimeout(() => relockPane(paneId), 300)
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Captura fallida',
      )
      relockPane(paneId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            variant === 'topbar' ? 'topbar-icon' : 'pane-icon-btn',
            busy ? 'opacity-60' : '',
            className,
          )}
          title="Captura"
          aria-label="Captura"
          disabled={busy}
          onClick={(event) => event.stopPropagation()}
        >
          <Camera size={variant === 'topbar' ? 16 : 18} strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuLabel>Calidad de captura</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SCREENSHOT_QUALITIES.map((option) => (
          <DropdownMenuItem
            key={option.id}
            className={cn(
              'justify-between gap-3',
              quality === option.id ? 'bg-accent' : undefined,
            )}
            onClick={() => void runCapture(option.id)}
          >
            <span>{option.label}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {option.hint}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
