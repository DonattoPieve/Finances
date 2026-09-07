import { getCategoryIcon } from '../../lib/categoryIcon'

interface CategoryIconBadgeProps {
  icon: string
  color: string
  size?: number
}

export function CategoryIconBadge({ icon, color, size = 34 }: CategoryIconBadgeProps) {
  const Icon = getCategoryIcon(icon)

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
        color
      }}
    >
      <Icon size={size * 0.5} strokeWidth={1.75} />
    </span>
  )
}
