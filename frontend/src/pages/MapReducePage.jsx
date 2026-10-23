import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, ChevronRight, Code2 } from 'lucide-react'
import { useFilterStore } from '../store'
import { fetchMapReduce } from '../api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartCard } from '../components/UI'
import toast from 'react-hot-toast'

const CODE_MAP = `# MAP PHASE
rdd = df.select("product").rdd

mapped = rdd.map(
    lambda row: (row["product"], 1)
)
# Output: [("Laptop", 1), ("T-Shirt", 1), ...]`

const CODE_REDUCE = `# REDUCE PHASE
reduced = mapped.reduceByKey(
    lambda a, b: a + b
)
# Output: [("Laptop", 4521), ("T-Shirt", 3890), ...]

top15 = reduced \\
    .sortBy(lambda x: -x[1]) \\
    .take(15)`

const COLORS = ['#7C5CFF', '#22D3EE', '#F472B6', '#F59E0B', '#10B981', '#6366F1']

function StageBox({ title, color, icon, items, animating, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex-1 rounded-2xl p-4 min-h-[280px]"
      style={{ background: `${color}10`, border: `1px solid ${color}35` }}
    >
      <div className="text-sm font-semibold mb-3" style={{ color }}>
        {icon} {title}
      </div>
      <div className="space-y-1.5 max-h-[230px] overflow-y-auto">
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={`${item}-${i}`}
              initial={{ opacity: 0, x: -10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="text-xs font-mono px-2 py-1.5 rounded-lg truncate"
              style={{ background: `${color}15`, color: 'rgba(226, 232, 240, 0.85)', border: `1px solid ${color}25` }}
            >
              {item}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default function MapReducePage() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(0) // 0=idle, 1=map, 2=shuffle, 3=reduce, 4=done
  const { getQueryParams } = useFilterStore()

  const handleRun = async () => {
    setLoading(true)
    setStage(0)
    setResult(null)
    toast('🗺️ Mapping...', { duration: 1500 })
    try {
      const data = await fetchMapReduce(getQueryParams())
      
      // Animate stages
      setTimeout(() => setStage(1), 200)
      setTimeout(() => { setStage(2); toast('🔀 Shuffling...', { duration: 1000 }) }, 1200)
      setTimeout(() => { setStage(3); toast('📦 Reducing...', { duration: 1000 }) }, 2400)
      setTimeout(() => {
        setStage(4)
        setResult(data)
        toast.success(`✅ MapReduce done! ⚡ ${(data.spark_ms/1000).toFixed(2)}s`)
      }, 3600)
    } catch (e) {
      toast.error('MapReduce failed: ' + (e.response?.data?.detail || e.message))
    }
    setLoading(false)
  }

  const mapItems = result?.sample_map_pairs?.slice(0, 15).map(p => `("${p.key}", ${p.value})`) || []
  const shuffleItems = result?.top15?.slice(0, 10).map(p => `"${p.product}": [1, 1, 1, ...]`) || []
  const reduceItems = result?.top15?.slice(0, 10).map(p => `"${p.product}": ${p.count}`) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass p-5 rounded-2xl">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="font-heading font-bold text-xl gradient-text">MapReduce Visualizer</h2>
            <p className="text-sm text-muted mt-0.5">Spark RDD — map() → shuffle → reduceByKey()</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleRun}
            disabled={loading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
            ) : (
              <><Play size={15} /> Run Job</>
            )}
          </motion.button>
        </div>
        <div className="text-xs text-muted">
          This uses Spark's RDD API: products are counted using distributed map() and reduceByKey() operations.
        </div>
      </div>

      {/* 3-stage diagram */}
      <div className="glass p-5 rounded-2xl">
        <div className="text-sm font-semibold text-dim mb-4">Pipeline Stages</div>
        <div className="flex items-stretch gap-3">
          <StageBox
            title="Map Phase"
            color="#7C5CFF"
            icon="🗺️"
            items={stage >= 1 ? mapItems : ['Click "Run Job" to start...']}
            animating={stage === 1}
            delay={0}
          />
          <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
            <ChevronRight size={20} className={`transition-colors ${stage >= 2 ? 'text-cyan' : 'text-muted'}`} />
            <span className="text-[10px] font-mono text-muted">shuffle</span>
          </div>
          <StageBox
            title="Shuffle Phase"
            color="#22D3EE"
            icon="🔀"
            items={stage >= 2 ? shuffleItems : []}
            delay={0.1}
          />
          <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
            <ChevronRight size={20} className={`transition-colors ${stage >= 3 ? 'text-pink' : 'text-muted'}`} />
            <span className="text-[10px] font-mono text-muted">reduce</span>
          </div>
          <StageBox
            title="Reduce Phase"
            color="#F472B6"
            icon="📦"
            items={stage >= 3 ? reduceItems : []}
            delay={0.2}
          />
        </div>
      </div>

      {/* Code + Result */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code snippets */}
        <div className="space-y-4">
          <div className="glass p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Code2 size={14} className="text-violet" />
              <span className="text-sm font-semibold text-dim">PySpark Code</span>
            </div>
            <pre className="text-xs font-mono p-3 rounded-xl overflow-x-auto leading-relaxed"
              style={{ background: '#050810', color: '#e2e8f0', border: '1px solid rgba(124,92,255,0.2)' }}>
              <span style={{ color: '#7C5CFF' }}>{CODE_MAP}</span>
            </pre>
            <pre className="text-xs font-mono p-3 rounded-xl overflow-x-auto mt-3 leading-relaxed"
              style={{ background: '#050810', color: '#e2e8f0', border: '1px solid rgba(124,92,255,0.2)' }}>
              <span style={{ color: '#22D3EE' }}>{CODE_REDUCE}</span>
            </pre>
            <div className="mt-3 text-xs text-muted p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
              💡 <strong>Plain English:</strong> Each product name is tagged with a count of 1 (map), all same-named products are grouped (shuffle), then their counts are summed (reduce).
            </div>
          </div>
        </div>

        {/* Bar chart result */}
        {stage === 4 && result && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <ChartCard title="Top 15 Products" badge="By order count (reduceByKey)" sparkMs={result.spark_ms}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={result.top15} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="product" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(7,11,26,0.95)', border: '1px solid rgba(124,92,255,0.3)', borderRadius: 12 }}
                  />
                  <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]}>
                    {result.top15.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>
        )}
      </div>
    </div>
  )
}
