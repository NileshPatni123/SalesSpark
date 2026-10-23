import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, TrendingUp, Users, ShoppingCart, Target } from 'lucide-react'
import { useFilterStore } from '../store'
import { fetchSegmentation } from '../api'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'
import { ChartCard, fmt, fmtNum } from '../components/UI'
import toast from 'react-hot-toast'

const SEG_COLORS = ['#7C5CFF', '#22D3EE', '#F472B6', '#F59E0B', '#10B981', '#6366F1']

function SilhouetteGauge({ score }) {
  const pct = (score + 1) / 2 * 100
  const color = score > 0.5 ? '#10B981' : score > 0.3 ? '#F59E0B' : '#F472B6'
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${2 * Math.PI * 42 * pct / 100} ${2 * Math.PI * 42}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-heading font-bold text-xl" style={{ color }}>{score.toFixed(3)}</div>
          <div className="text-[10px] text-muted">silhouette</div>
        </div>
      </div>
      <div className="text-xs text-muted mt-1 text-center">
        {score > 0.5 ? '✅ Excellent separation' : score > 0.3 ? '⚠️ Reasonable clustering' : '❌ Poor separation'}
      </div>
    </div>
  )
}

function SegmentCard({ seg, color, index }) {
  const icons = ['🌱', '🔥', '💎', '⭐', '🏆', '💤']
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.03, y: -4 }}
      className="rounded-2xl p-5 cursor-default relative overflow-hidden"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}35`,
        boxShadow: `0 4px 30px ${color}15`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-2xl">{icons[index % icons.length]}</div>
        <div className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
          {seg.count.toLocaleString()} customers
        </div>
      </div>
      <h4 className="font-heading font-bold text-sm text-white mb-3">{seg.name}</h4>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted">Avg Revenue:</span>
          <span className="font-mono font-semibold" style={{ color }}>{fmt(seg.avg_revenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Avg Orders:</span>
          <span className="font-mono">{seg.avg_orders.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Avg Order Value:</span>
          <span className="font-mono">{fmt(seg.avg_order_value)}</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: `${color}20`, color: 'rgba(226,232,240,0.65)' }}>
        🎯 {seg.marketing_action}
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10" style={{ background: color }} />
    </motion.div>
  )
}

export default function SegmentationPage() {
  const [k, setK] = useState(3)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const { getQueryParams } = useFilterStore()

  const handleRun = async () => {
    setLoading(true)
    setResult(null)
    toast('🤖 Running KMeans on Spark MLlib...', { duration: 3000 })
    try {
      const data = await fetchSegmentation(k, getQueryParams())
      setResult(data)
      toast.success(`✅ Segmentation done! Silhouette: ${data.silhouette.toFixed(3)} ⚡ ${(data.spark_ms/1000).toFixed(2)}s`)
    } catch (e) {
      toast.error('Segmentation failed: ' + (e.response?.data?.detail || e.message))
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="glass p-5 rounded-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-heading font-bold text-xl gradient-text">Segmentation Studio</h2>
            <p className="text-sm text-muted mt-0.5">KMeans clustering with Spark MLlib — VectorAssembler → StandardScaler → KMeans</p>
          </div>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <div className="text-xs text-muted mb-2">Number of Clusters (k)</div>
            <div className="flex gap-2">
              {[2,3,4,5,6].map(val => (
                <button
                  key={val}
                  onClick={() => setK(val)}
                  className={`chip ${k === val ? 'active' : ''} text-sm w-9 h-9 justify-center`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleRun}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Clustering...</>
            ) : (
              <><Play size={15} /> Run KMeans (k={k})</>
            )}
          </motion.button>
          {result && (
            <div className="text-xs font-mono text-muted">
              ⚡ Spark time: <span className="text-cyan">{(result.spark_ms/1000).toFixed(2)}s</span>
            </div>
          )}
        </div>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Silhouette + Segments */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="glass p-5 rounded-2xl flex flex-col items-center justify-center">
              <div className="text-sm font-semibold text-dim mb-3">Cluster Quality</div>
              <SilhouetteGauge score={result.silhouette} />
            </div>
            <div className="col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.segments.map((seg, i) => (
                <SegmentCard key={i} seg={seg} color={SEG_COLORS[i % SEG_COLORS.length]} index={i} />
              ))}
            </div>
          </div>

          {/* Scatter + Elbow */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scatter plot */}
            <ChartCard title="Customer Scatter Plot" badge="Revenue vs Orders by Segment" sparkMs={result.spark_ms}>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" name="Revenue" tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} label={{ value: 'Revenue (₹)', position: 'insideBottom', offset: -5, fontSize: 10, fill: 'rgba(226,232,240,0.5)' }} />
                  <YAxis dataKey="y" name="Orders" tick={{ fontSize: 10 }} label={{ value: 'Orders', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'rgba(226,232,240,0.5)' }} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ background: 'rgba(7,11,26,0.95)', border: '1px solid rgba(124,92,255,0.3)', borderRadius: 12 }}
                    formatter={(v, n) => [n === 'Revenue' ? fmt(v) : v, n]}
                  />
                  {Array.from({ length: result.k }).map((_, si) => (
                    <Scatter
                      key={si}
                      name={`Segment ${si}`}
                      data={result.scatter.filter(p => p.segment === si)}
                      fill={SEG_COLORS[si % SEG_COLORS.length]}
                      fillOpacity={0.7}
                    />
                  ))}
                  <Legend />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Elbow chart */}
            <ChartCard title="Elbow & Silhouette" badge="Optimal k selection" sparkMs={result.spark_ms}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={result.elbow} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="k" label={{ value: 'k (clusters)', position: 'insideBottom', offset: -5, fontSize: 10, fill: 'rgba(226,232,240,0.5)' }} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => v >= 1e9 ? `${(v/1e9).toFixed(0)}B` : v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'rgba(7,11,26,0.95)', border: '1px solid rgba(124,92,255,0.3)', borderRadius: 12 }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="inertia" name="Inertia (↓ better)" stroke="#7C5CFF" strokeWidth={2} dot={{ fill: '#7C5CFF', r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="silhouette" name="Silhouette (↑ better)" stroke="#22D3EE" strokeWidth={2} dot={{ fill: '#22D3EE', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </motion.div>
      )}

      {!result && !loading && (
        <div className="glass p-12 rounded-2xl text-center text-muted">
          <div className="text-5xl mb-4">🤖</div>
          <div className="text-sm">Choose k and click "Run KMeans" to cluster your customers</div>
          <div className="text-xs mt-2">Features: total_revenue, order_count, avg_order_value</div>
        </div>
      )}
    </div>
  )
}
