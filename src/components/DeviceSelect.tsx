import { MonitorSmartphone } from 'lucide-react'
import { getDeviceGroups, getPresetById } from '@/data/devicePresets'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type DeviceSelectProps = {
  value: string
  onValueChange: (presetId: string) => void
  /** Icon-only trigger (pane toolbar). */
  compact?: boolean
  className?: string
  contentClassName?: string
}

export function DeviceSelect({
  value,
  onValueChange,
  compact = false,
  className,
  contentClassName,
}: DeviceSelectProps) {
  const groups = getDeviceGroups()
  const current = getPresetById(value)

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        hideChevron={compact}
        className={cn(
          compact
            ? 'pane-icon-btn h-7 w-7 shrink-0 justify-center border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>span]:line-clamp-none'
            : 'h-8 min-w-[200px]',
          className,
        )}
        aria-label="Selector de dispositivo"
        title={
          current
            ? `${current.name} (${current.width}×${current.height})`
            : 'Dispositivo'
        }
        onClick={(event) => event.stopPropagation()}
      >
        {compact ? (
          <MonitorSmartphone
            size={18}
            strokeWidth={1.75}
            className="pointer-events-none shrink-0"
            aria-hidden
          />
        ) : (
          <SelectValue placeholder="Dispositivo" />
        )}
      </SelectTrigger>
      <SelectContent
        className={cn('max-h-[min(420px,70vh)] w-[280px]', contentClassName)}
        position="popper"
        sideOffset={6}
        onClick={(event) => event.stopPropagation()}
      >
        {groups.map((group, index) => (
          <div key={group.id}>
            {index > 0 && <SelectSeparator />}
            <SelectGroup>
              <SelectLabel>{group.label}</SelectLabel>
              {group.presets.map((item) => (
                <SelectItem key={item.id} value={item.id} textValue={item.name}>
                  {item.name}
                  <span className="ml-3 font-mono text-[11px] text-muted-foreground">
                    {item.width}×{item.height}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </div>
        ))}
      </SelectContent>
    </Select>
  )
}
