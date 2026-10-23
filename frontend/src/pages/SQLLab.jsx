import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Clock, Hash, BarChart2, AlertCircle, Sparkles } from 'lucide-react'
import { useFilterStore } from '../store'
import { runSQL } from '../api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'

const PRESETS = [
  { label: '💰 Revenue by Category', sql: 'SELECT category, ROUND(SUM(revenue),2) as total_revenue, COUNT(*) as orders\nFROM sales\nGROUP BY category\nORDER BY total_revenue DESC' },
  { label: '👥 Top 10 Customers', sql: 'SELECT customer_id, ROUND(SUM(revenue),2) as total_spent, COUNT(*) as orders\nFROM sales\nGROUP BY customer_id\nORDER BY total_spent DESC\nLIMIT 10' },
  { label: '🗓️ Best Month by Region', sql: 'SELECT region, month, ROUND(SUM(revenue),2) as revenue\nFROM sales\nGROUP BY region, month\nORDER BY region, revenue DESC' },
  { label: '🏷️ Discount vs Revenue', sql: 'SELECT ROUND(discount_pct/5)*5 as discount_band,\n  COUNT(*) as orders,\n  ROUND(AVG(revenue),2) as avg_revenue\nFROM sales\nGROUP BY discount_band\nORDER BY discount_band' },
  { label: '📦 Category × Region', sql: 'SELECT category, region, ROUND(SUM(revenue),2) as revenue\nFROM sales\nGROUP BY category, region\nORDER BY revenue DESC\nLIMIT 30' },
  { label: '💳 Payment Analysis', sql: 'SELECT payment_mode, COUNT(*) as orders,\n  ROUND(SUM(revenue),2) as revenue,\n  ROUND(AVG(revenue),2) as avg_order\nFROM sales\nGROUP BY payment_mode\nORDER BY orders DESC' },
]

export default function SQLLab() {
  const [query, setQuery] = useState(PRESETS[0].sql)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { categories, regions, dateFrom, dateTo } = useFilterStore()

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await runSQL({
        query,
        categories: categories.join(',') || undefined,
        regions: regions.join(',') || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setResult(res)
      toast.success(`✅ Query ran — ${res.row_count} rows in ${(res.spark_ms/1000).toFixed(2)}s`)
    } catch (e) {
      const msg = e.response?.data?.detail || e.message
      setError(msg)
      toast.error('Query failed: ' + msg.slice(0, 60))
    }
    setLoading(false)
  }

  // Auto chart: if result has 1 text + 1 number column
  const getAutoChart = () => {
    if (!result || result.columns.length < 2) return null
    const cols = result.columns
    // Try to find a text + number pair
    const firstRow = result.rows[0]
    if (!firstRow) return null
    let labelCol = 0, valCol = 1
    // heuristic: if second col looks numeric
    const numericVal = parseFloat(firstRow[valCol])
    if (isNaN(numericVal)) return null
    const chartData = result.rows.slice(0, 15).map(r => ({
      label: String(r[labelCol]).slice(0, 20),
      value: parseFloat(r[valCol]) || 0,
    }))
    return chartData
  }

  const chartData = getAutoChart()
  const activeFilters = [
    categories.length > 0 && `${categories.length} categories`,
    regions.length > 0 && `${regions.length} regions`,
    dateFrom && `from ${dateFrom}`,
    dateTo && `to ${dateTo}`,
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass p-5 rounded-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-heading font-bold text-xl gradient-text">Spark SQL Lab</h2>
            <p className="text-sm text-muted mt-0.5">Write SQL that runs on the Apache Spark engine</p>
          </div>
          {activeFilters.length > 0 && (
            <div className="text-xs px-3 py-1.5 rounded-full font-mono"
              style={{ background: 'rgba(124, 92, 255, 0.1)', border: '1px solid rgba(124, 92, 255, 0.25)', color: '#9B7FFF' }}>
              🔍 Filters active: {activeFilters.join(', ')}
            </div>
          )}
        </div>

        {/* Preset chips */}
        <div className="flex gap-2 flex-wrap mb-4">
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => setQuery(p.sql)} className="chip hover:chip-active text-xs">
              {p.label}
            </button>
          ))}
        </div>

        {/* Editor */}
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="code-editor w-full p-4 text-sm"
          rows={8}
          spellCheck={false}
          placeholder="SELECT * FROM sales LIMIT 10"
        />

        {/* Run button */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-muted font-mono">
            Table: <span className="text-cyan">sales</span> — SELECT only • max 1,000 rows
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRun}
            disabled={loading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running...</>
            ) : (
              <><Play size={15} /> Run Query</>
            )}
          </motion.button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-2xl flex items-start gap-3"
          style={{ borderColor: 'rgba(244, 114, 182, 0.3)', background: 'rgba(244, 114, 182, 0.05)' }}
        >
          <AlertCircle size={18} className="text-pink flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-pink mb-1">Query Error</div>
            <div className="text-sm text-dim font-mono break-all">{error}</div>
            <div className="text-xs text-muted mt-2">💡 Tip: Only SELECT queries are allowed. Table name is "sales".</div>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats bar */}
          <div className="glass p-4 rounded-2xl flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Hash size={14} className="text-violet" />
              <span className="text-muted">Rows:</span>
              <span className="font-mono font-semibold text-white">{result.row_count}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={14} className="text-cyan" />
              <span className="text-muted">Spark time:</span>
              <span className="font-mono font-semibold text-cyan">{(result.spark_ms / 1000).toFixed(3)}s</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <BarChart2 size={14} className="text-pink" />
              <span className="text-muted">Columns:</span>
              <span className="font-mono font-semibold text-white">{result.columns.join(', ')}</span>
            </div>
          </div>

          {/* Auto chart */}
          {chartData && chartData.length > 1 && (
            <div className="glass p-5 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={14} className="text-amber" />
                <span className="text-sm font-semibold text-amber">Auto Chart</span>
                <span className="text-xs text-muted">({result.columns[0]} vs {result.columns[1]})</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(7,11,26,0.95)', border: '1px solid rgba(124,92,255,0.3)', borderRadius: 12, backdropFilter: 'blur(16px)' }}
                  />
                  <Bar dataKey="value" name={result.columns[1]} radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={`rgba(124, 92, 255, ${1 - i * 0.04})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-auto max-h-96">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    {result.columns.map(col => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{cell ?? <span className="text-muted italic">null</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plan */}
          {result.plan_summary && (
            <div className="glass p-4 rounded-2xl">
              <div className="text-xs text-muted uppercase tracking-wider mb-2 font-semibold">Spark Query Plan</div>
              <pre className="text-xs font-mono text-dim overflow-x-auto whitespace-pre-wrap break-all">
                {result.plan_summary}
              </pre>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
