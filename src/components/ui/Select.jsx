export function Select({ label, error, className = '', options = [], ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <select
        className={`block w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors ${
          error ? 'border-red-400' : 'border-slate-300'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
