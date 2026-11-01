export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Memuat">
      <div className="mb-8 h-8 w-64 animate-pulse rounded-md bg-line" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-panel bg-line/60" />)}
      </div>
      <div className="mt-6 h-80 animate-pulse rounded-panel bg-line/50" />
    </div>
  );
}
