import { Moon, Sun, SunDim } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme, type Theme } from '../hooks/useTheme'

interface BtnProps {
  value: Theme
  current: Theme
  icon: React.ElementType
  label: string
  onClick: (t: Theme) => void
}

function ThemeBtn({ value, current, icon: Icon, label, onClick }: BtnProps) {
  const active = value === current
  return (
    <button
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={() => onClick(value)}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-brand text-white'
          : 'text-text-muted hover:bg-hover hover:text-text',
      )}
    >
      <Icon size={13} strokeWidth={2.2} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card px-1 py-1">
      <ThemeBtn value="light" current={theme} icon={Sun}    label="Claro"  onClick={setTheme} />
      <ThemeBtn value="mid"   current={theme} icon={SunDim} label="Médio"  onClick={setTheme} />
      <ThemeBtn value="dark"  current={theme} icon={Moon}   label="Escuro" onClick={setTheme} />
    </div>
  )
}
