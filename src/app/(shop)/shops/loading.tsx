// Skeleton for the shops list page
export default function ShopsLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--color-gray-200)' }} />
          <div className="h-4 w-4 rounded animate-pulse" style={{ backgroundColor: 'var(--color-gray-200)' }} />
          <div className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--color-gray-200)' }} />
        </div>
        <div className="h-9 w-40 rounded-lg mb-2 animate-pulse" style={{ backgroundColor: 'var(--color-gray-200)' }} />
        <div className="h-5 w-64 rounded animate-pulse" style={{ backgroundColor: 'var(--color-gray-100)' }} />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-6 border animate-pulse"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-gray-200)' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl shrink-0" style={{ backgroundColor: 'var(--color-gray-200)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 rounded" style={{ backgroundColor: 'var(--color-gray-200)' }} />
                <div className="h-4 w-1/2 rounded" style={{ backgroundColor: 'var(--color-gray-100)' }} />
                <div className="h-4 w-1/3 rounded" style={{ backgroundColor: 'var(--color-gray-100)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
