import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, Sun, Moon, X, ChevronDown, Check, Calendar } from 'lucide-react'
import { useFilterStore, useThemeStore } from '../store'
import { fetchMeta } from '../api'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'

function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter(s => s !== val))
    else onChange([...selected, val])
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
        style={{
          background: selected.length > 0 ? 'rgba(124, 92, 255, 0.2)' : 'var(--bg-card)',
          border: `1px solid ${selected.length > 0 ? 'rgba(124, 92, 255, 0.6)' : 'var(--border-color)'}`,
          color: selected.length > 0 ? '#7C5CFF' : 'var(--text-dim)',
        }}
      >
        <Filter size={13} className={selected.length > 0 ? 'text-violet' : 'opacity-70'} />
        <span>{label}{selected.length > 0 ? ` (${selected.length})` : ''}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 z-50 min-w-[180px] rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: 'var(--bg-card-strong)',
              border: '1px solid rgba(124, 92, 255, 0.3)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            }}
          >
            <div className="p-1.5">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider opacity-50" style={{ color: 'var(--text-muted)' }}>
                Filter by {label}
              </div>
              {options.map(opt => {
                const active = selected.includes(opt)
                return (
                  <button
                    key={opt}
                    onClick={() => toggle(opt)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left hover:bg-violet/10"
                    style={{ color: active ? '#7C5CFF' : 'var(--text-primary)' }}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                        active ? 'bg-violet border-none' : 'border border-gray-400 dark:border-white/30'
                      }`}
                      style={{ background: active ? '#7C5CFF' : 'transparent' }}
                    >
                      {active && <Check size={10} className="text-white" />}
                    </div>
                    <span>{opt}</span>
                  </button>
                )
              })}
              {selected.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  className="w-full text-center text-xs py-1.5 mt-1 rounded-lg transition-colors border-t border-violet/10"
                  style={{ color: '#F472B6' }}
                >
                  Clear {label}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function TopBar() {
  const { categories, regions, dateFrom, dateTo, setCategories, setRegions, setDateFrom, setDateTo, clearFilters, activeFilterCount } = useFilterStore()
  const { dark, toggle } = useThemeStore()
  const [meta, setMeta] = useState(null)
  const location = useLocation()

  useEffect(() => {
    fetchMeta().then(setMeta).catch(() => {})
  }, [])

  const pageNames = {
    '/dashboard': 'Executive Analytics Dashboard',
    '/sql': 'Interactive Spark SQL Lab',
    '/mapreduce': 'Distributed MapReduce Visualizer',
    '/segmentation': 'Customer Segmentation Studio (MLlib)',
    '/pipeline': 'Big Data Pipeline & Architecture',
    '/architecture': 'Big Data Pipeline & Architecture',
  }

  const count = activeFilterCount()

  const handleClear = () => {
    clearFilters()
    toast.success('All filters cleared')
  }

  const handleToggle = () => {
    toggle()
    toast.success(dark ? '☀️ Light mode' : '🌙 Dark mode', { duration: 1000 })
  }

  return (
    <div
      className="border-b px-6 py-3 flex items-center justify-between gap-4 flex-wrap relative z-30"
      style={{
        background: 'var(--bg-card-strong)',
        borderColor: 'var(--border-color)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Page title */}
      <div>
        <h2 className="font-heading font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
          {pageNames[location.pathname] || 'SalesSpark'}
        </h2>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>⚡ Powered by Apache Spark 3.5</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {meta && (
          <>
            <MultiSelect
              label="Category"
              options={meta.categories || []}
              selected={categories}
              onChange={(v) => { setCategories(v); toast.success('Category filter applied', { duration: 1000 }) }}
            />
            <MultiSelect
              label="Region"
              options={meta.regions || []}
              selected={regions}
              onChange={(v) => { setRegions(v); toast.success('Region filter applied', { duration: 1000 }) }}
            />

            {/* Date range picker */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
              title="Filter sales orders by date range (dataset covers calendar year 2024)"
            >
              <Calendar size={13} style={{ color: '#7C5CFF' }} />
              <input
                type="date"
                value={dateFrom}
                min={meta.date_min || '2024-01-01'}
                max={meta.date_max || '2024-12-31'}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-transparent border-none text-xs font-mono focus:outline-none"
                style={{ color: 'var(--text-primary)', colorScheme: dark ? 'dark' : 'light' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>–</span>
              <input
                type="date"
                value={dateTo}
                min={meta.date_min || '2024-01-01'}
                max={meta.date_max || '2024-12-31'}
                onChange={e => setDateTo(e.target.value)}
                className="bg-transparent border-none text-xs font-mono focus:outline-none"
                style={{ color: 'var(--text-primary)', colorScheme: dark ? 'dark' : 'light' }}
              />
            </div>

            {count > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-xs transition-colors px-2.5 py-1.5 rounded-xl font-medium"
                style={{ color: '#F472B6', border: '1px solid rgba(244,114,182,0.3)', background: 'rgba(244,114,182,0.08)' }}
              >
                <X size={12} /> Clear ({count})
              </button>
            )}
          </>
        )}

        {/* Theme toggle */}
        <button
          onClick={handleToggle}
          title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl transition-all hover:scale-105 active:scale-95"
          style={{
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
          }}
        >
          {dark
            ? <Sun size={16} style={{ color: '#F59E0B' }} />
            : <Moon size={16} style={{ color: '#7C5CFF' }} />
          }
        </button>
      </div>
    </div>
  )
}
