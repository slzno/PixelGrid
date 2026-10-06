import {
  AppWindow,
  Camera,
  CodeXml,
  Image as ImageLucide,
  Pipette,
  Ruler,
  type LucideProps,
} from 'lucide-react'

const defaults: LucideProps = {
  size: 16,
  strokeWidth: 1.75,
  absoluteStrokeWidth: false,
}

export function RulerIcon(props: LucideProps) {
  return <Ruler {...defaults} {...props} />
}

export function CameraIcon(props: LucideProps) {
  return <Camera {...defaults} {...props} />
}

export function ImageIcon(props: LucideProps) {
  return <ImageLucide {...defaults} {...props} />
}

export function EyedropperIcon(props: LucideProps) {
  return <Pipette {...defaults} {...props} />
}

export function PanesIcon(props: LucideProps) {
  return <AppWindow {...defaults} {...props} />
}

export function CodeIcon(props: LucideProps) {
  return <CodeXml {...defaults} {...props} />
}
