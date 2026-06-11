'use client'

interface SkeletonProps {
  variant?: 'text' | 'card' | 'avatar' | 'circle' | 'rect'
  width?: string | number
  height?: string | number
  className?: string
  lines?: number // For text variant
}

export function Skeleton({ variant = 'text', width, height, className = '', lines = 1 }: SkeletonProps) {
  const baseClass = 'animate-pulse rounded'
  
  const variantStyles: Record<string, string> = {
    text: 'h-4 bg-gray-200 rounded',
    card: 'h-48 bg-gray-200 rounded-lg',
    avatar: 'w-12 h-12 bg-gray-200 rounded-full',
    circle: 'w-12 h-12 bg-gray-200 rounded-full',
    rect: 'bg-gray-200 rounded-lg',
  }

  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClass} ${variantStyles.text}`}
            style={{
              width: i === lines - 1 && lines > 1 ? '70%' : '100%',
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClass} ${variantStyles[variant]} ${className}`}
      style={{
        width: width,
        height: height,
      }}
    />
  )
}

// Preset: Chef Card Skeleton
export function ChefCardSkeleton() {
  return (
    <div className="rounded-lg p-6 bg-white border flex gap-5" style={{ borderColor: 'var(--color-mdc-border)' }}>
      <Skeleton variant="circle" width={96} height={96} />
      <div className="flex-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="rect" width={60} height={24} className="rounded-full" />
        </div>
        <Skeleton variant="text" width="40%" />
        <div className="flex flex-wrap gap-1.5">
          <Skeleton variant="rect" width={70} height={24} className="rounded-full" />
          <Skeleton variant="rect" width={70} height={24} className="rounded-full" />
          <Skeleton variant="rect" width={70} height={24} className="rounded-full" />
        </div>
        <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--color-mdc-border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="rect" width={16} height={16} className="rounded" />
              ))}
            </div>
            <Skeleton variant="text" width={80} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Preset: Chef Profile Hero Skeleton
export function ChefProfileHeroSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg p-6 bg-white border shadow-sm">
        <div className="flex flex-col md:flex-row gap-6">
          <Skeleton variant="circle" width={160} height={160} className="mx-auto md:mx-0" />
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="space-y-2">
              <Skeleton variant="text" width="50%" height={32} />
              <Skeleton variant="text" width="30%" />
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <Skeleton variant="rect" width={70} height={28} className="rounded-full" />
              <Skeleton variant="rect" width={70} height={28} className="rounded-full" />
              <Skeleton variant="rect" width={70} height={28} className="rounded-full" />
            </div>
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} variant="rect" width={20} height={20} className="rounded" />
                ))}
              </div>
              <Skeleton variant="text" width={100} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Preset: Service Card Skeleton
export function ServiceCardSkeleton() {
  return (
    <div className="rounded-lg p-6 bg-white border shadow-sm space-y-4">
      <Skeleton variant="text" width="60%" height={24} />
      <Skeleton variant="text" lines={3} />
      <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--color-mdc-border)' }}>
        <div className="flex justify-between">
          <Skeleton variant="text" width={60} />
          <Skeleton variant="text" width={40} />
        </div>
        <div className="flex justify-between">
          <Skeleton variant="text" width={60} />
          <Skeleton variant="text" width={40} />
        </div>
        <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
          <Skeleton variant="text" width={80} />
          <Skeleton variant="text" width={60} />
        </div>
      </div>
    </div>
  )
}

// Preset: Review Skeleton
export function ReviewSkeleton() {
  return (
    <div className="pb-6 border-b space-y-3" style={{ borderColor: 'var(--color-mdc-border)' }}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" width="30%" height={16} />
          <Skeleton variant="text" width="50%" height={12} />
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rect" width={16} height={16} className="rounded" />
          ))}
        </div>
      </div>
      <Skeleton variant="text" lines={2} />
    </div>
  )
}
