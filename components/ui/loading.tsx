import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeMap = {
  sm: "h-4 w-4 border-[2px]",
  md: "h-6 w-6 border-[2px]",
  lg: "h-8 w-8 border-[2.5px]",
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-primary/20 border-t-primary",
        sizeMap[size],
        className
      )}
    />
  )
}

interface LoadingPageProps {
  message?: string
  className?: string
}

export function LoadingPage({ message = "Loading...", className }: LoadingPageProps) {
  return (
    <div className={cn("flex min-h-[60vh] flex-col items-center justify-center", className)}>
      <LoadingSpinner size="lg" />
      <p className="mt-4 font-body text-sm text-on-surface-variant">{message}</p>
    </div>
  )
}

interface LoadingOverlayProps {
  message?: string
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-surface-container-lowest px-8 py-6 shadow-xl">
        <LoadingSpinner size="lg" />
        {message && (
          <p className="font-body text-sm text-on-surface-variant">{message}</p>
        )}
      </div>
    </div>
  )
}
