export default function BarbersLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="h-9 w-40 rounded-lg mb-2 animate-pulse" style={{ backgroundColor: 'var(--color-gray-200)' }} />
        <div className="h-5 w-48 rounded animate-pulse" style={{ backgroundColor: 'var(--color-gray-100)' }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-5 border flex flex-col items-center gap-3 animate-pulse"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-gray-200)' }}
          >
            <div className="w-16 h-16 rounded-full" style={{ backgroundColor: 'var(--color-gray-200)' }} />
            <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--color-gray-200)' }} />
            <div className="h-3 w-12 rounded" style={{ backgroundColor: 'var(--color-gray-100)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
