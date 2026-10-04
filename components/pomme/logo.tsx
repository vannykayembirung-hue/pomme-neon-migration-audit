import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span aria-hidden="true" className="relative inline-flex size-7 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-apple shadow-[inset_-3px_-4px_6px_rgba(0,0,0,0.25)]" />
        <span className="absolute -top-1 left-1/2 h-2.5 w-4 -translate-x-[10%] -rotate-[25deg] rounded-[100%_0] bg-leaf" />
      </span>
      <span className="text-xl font-black tracking-tight">pomme</span>
    </span>
  )
}
