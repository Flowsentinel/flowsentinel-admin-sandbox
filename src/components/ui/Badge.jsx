export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default:  'bg-slate-100 text-slate-600',
    success:  'bg-green-100 text-green-700',
    warning:  'bg-amber-100 text-amber-700',
    danger:   'bg-red-100 text-red-700',
    info:     'bg-blue-100 text-blue-700',
    purple:   'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant] ?? variants.default} ${className}`}>
      {children}
    </span>
  )
}
