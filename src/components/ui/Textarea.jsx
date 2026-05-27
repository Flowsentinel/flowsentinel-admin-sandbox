export function Textarea({ label, error, className = '', rows = 3, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <textarea
        rows={rows}
        className={`block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors resize-none ${
          error ? 'border-red-400' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
