interface LoadingSkeletonProps {
  lines?: number
  className?: string
}

export default function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`.trim()}>
      <div className="h-6 bg-gray-200 rounded w-3/4" />
      {lines >= 2 && <div className="h-4 bg-gray-200 rounded w-full" />}
      {lines >= 3 && <div className="h-4 bg-gray-200 rounded w-5/6" />}
      {lines >= 4 && <div className="h-4 bg-gray-200 rounded w-4/5" />}
    </div>
  )
}

export function QuestionSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-24" />
      <div className="h-5 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-gray-200 rounded w-full" />
        ))}
      </div>
      <div className="h-10 bg-gray-200 rounded w-28 mt-6" />
    </div>
  )
}
