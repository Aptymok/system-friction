import { cn } from '@/lib/utils/cn'

export function Badge({ children, tone = 'gold' }: { children: React.ReactNode; tone?: 'gold' | 'red' | 'blue' | 'green' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em]',
        tone === 'gold' && 'border-gold/30 bg-gold/10 text-gold',
        tone === 'red' && 'border-signalRed/40 bg-signalRed/15 text-red-300',
        tone === 'blue' && 'border-signalBlue/40 bg-signalBlue/15 text-blue-200',
        tone === 'green' && 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
      )}
    >
      {children}
    </span>
  )
}
