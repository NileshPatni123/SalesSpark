import { Zap } from 'lucide-react'

export function SparkBadge({ ms, loading }) {
  return (
    <div className="spark-badge">
      <Zap size={10} className="text-cyan" />
      {loading ? '...' : `${ms ? (ms/1000).toFixed(2) : '?'}s`}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return (
    <div className={`skeleton rounded-xl ${className}`} />
  )
}

export function ChartCard({ title, badge, sparkMs, loading, children, info }) {
  return (
    <div className="glass p-5 relative overflow-hidden group transition-all duration-300 hover:border-violet/30"
      style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.3)' }}>
      {/* Hover spotlight */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(124,92,255,0.04), transparent)' }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.parentElement.getBoundingClientRect()
          e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`)
          e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`)
        }}
      />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          {badge && <div className="text-xs text-muted mt-0.5">{badge}</div>}
        </div>
        <SparkBadge ms={sparkMs} loading={loading} />
      </div>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : children}
    </div>
  )
}

export function KpiCard({ label, value, sub, color, loading, icon: Icon }) {
  const colors = {
    violet: { bg: 'rgba(124,92,255,0.08)', border: '#7C5CFF40', text: '#7C5CFF' },
    cyan: { bg: 'rgba(34,211,238,0.08)', border: '#22D3EE40', text: '#22D3EE' },
    pink: { bg: 'rgba(244,114,182,0.08)', border: '#F472B640', text: '#F472B6' },
    amber: { bg: 'rgba(245,158,11,0.08)', border: '#F59E0B40', text: '#F59E0B' },
  }
  const c = colors[color] || colors.violet

  return (
    <div
      className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 cursor-default relative overflow-hidden group"
      style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: `0 4px 30px ${c.border}` }}
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: c.text }}>{label}</span>
            {Icon && <Icon size={16} style={{ color: c.text, opacity: 0.7 }} />}
          </div>
          <div className="font-heading font-bold text-2xl leading-none mb-1" style={{ color: 'var(--text-primary)' }}>
            {value}
          </div>
          {sub && <div className="text-xs text-muted">{sub}</div>}
          <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10"
            style={{ background: c.text }} />
        </>
      )}
    </div>
  )
}

export function fmt(n) {
  if (n === undefined || n === null) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n.toFixed(0)}`
}

export function fmtNum(n) {
  if (n === undefined || n === null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}
