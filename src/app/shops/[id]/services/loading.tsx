export default function ServicesLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="h-9 w-40 rounded-lg mb-2 animate-pulse" style={{ backgroundColor: 'var(--color-gray-200)' }} />
        <div className="h-5 w-56 rounded animate-pulse" style={{ backgroundColor: 'var(--color-gray-100)' }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-5 border flex items-center gap-4 animate-pulse"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-gray-200)' }}
          >
            <div className="w-1 h-16 rounded-full" style={{ backgroundColor: 'var(--color-gray-200)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 rounded" style={{ backgroundColor: 'var(--color-gray-200)' }} />
              <div className="h-4 w-1/2 rounded" style={{ backgroundColor: 'var(--color-gray-100)' }} />
              <div className="h-3 w-1/4 rounded" style={{ backgroundColor: 'var(--color-gray-100)' }} />
            </div>
            <div className="text-left">
              <div className="h-6 w-12 rounded mb-1" style={{ backgroundColor: 'var(--color-gray-200)' }} />
              <div className="h-3 w-8 rounded" style={{ backgroundColor: 'var(--color-gray-100)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
