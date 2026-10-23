import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, ShoppingCart, Users, DollarSign, Sparkles } from 'lucide-react'
import { useFilterStore } from '../store'
import { fetchKPIs, fetchMonthly, fetchCategory, fetchRegion, fetchPayment, fetchHeatmap, fetchInsights, fetchProducts } from '../api'
import { ChartCard, KpiCard, Skeleton, fmt, fmtNum } from '../components/UI'
import toast from 'react-hot-toast'

const COLORS = ['#7C5CFF', '#22D3EE', '#F472B6', '#F59E0B', '#10B981', '#6366F1']

function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="p-3 rounded-xl text-sm" style={{
      background: 'rgba(7, 11, 26, 0.95)',
      border: '1px solid rgba(124, 92, 255, 0.3)',
      backdropFilter: 'blur(16px)',
    }}>
      <div className="font-semibold text-white mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex gap-2" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <span className="font-mono">{typeof p.value === 'number' && p.value > 1000 ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

function HeatmapChart({ data, loading, sparkMs }) {
  const regions = [...new Set(data.map(d => d.region))].sort()
  const categories = [...new Set(data.map(d => d.category))].sort()
  const map = {}
  data.forEach(d => { map[`${d.region}|${d.category}`] = d.revenue })
  const maxVal = Math.max(...data.map(d => d.revenue), 1)

  return (
    <ChartCard title="Revenue Heatmap" badge="Region × Category" sparkMs={sparkMs} loading={loading}>
      {data.length === 0 ? <div className="text-center text-muted py-8">No data</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted">Region</th>
                {categories.map(c => <th key={c} className="p-2 text-muted truncate max-w-[80px]">{c.slice(0,8)}</th>)}
              </tr>
            </thead>
            <tbody>
              {regions.map(r => (
                <tr key={r}>
                  <td className="p-2 font-medium text-dim">{r}</td>
                  {categories.map(c => {
                    const val = map[`${r}|${c}`] || 0
                    const intensity = val / maxVal
                    return (
                      <td key={c} className="p-1">
                        <div
                          className="w-full h-10 rounded-lg flex items-center justify-center text-[10px] font-mono transition-all hover:scale-105 cursor-default"
                          style={{
                            background: `rgba(124, 92, 255, ${0.05 + intensity * 0.7})`,
                            border: `1px solid rgba(124, 92, 255, ${0.1 + intensity * 0.4})`,
                            color: intensity > 0.5 ? 'white' : 'rgba(226, 232, 240, 0.5)',
                          }}
                          title={`${r} × ${c}: ${fmt(val)}`}
                        >
                          {fmt(val)}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  )
}

export default function Dashboard() {
  const getQueryParams = useFilterStore(s => s.getQueryParams)
  const categories = useFilterStore(s => s.categories)
  const regions = useFilterStore(s => s.regions)
  const dateFrom = useFilterStore(s => s.dateFrom)
  const dateTo = useFilterStore(s => s.dateTo)

  const [kpis, setKpis] = useState(null)
  const [monthly, setMonthly] = useState(null)
  const [catData, setCatData] = useState(null)
  const [regionData, setRegionData] = useState(null)
  const [paymentData, setPaymentData] = useState(null)
  const [heatmap, setHeatmap] = useState(null)
  const [insights, setInsights] = useState(null)
  const [products, setProducts] = useState(null)
  const [topN, setTopN] = useState(10)
  const [loading, setLoading] = useState(true)
  const [sparkWarmup, setSparkWarmup] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const isFirstLoad = useRef(true)

  const load = useCallback(async () => {
    const params = getQueryParams()
    setLoading(true)
    const t0 = Date.now()
    let timer
    if (isFirstLoad.current) {
      setSparkWarmup(true)
      timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000)
    }
    try {
      const [k, m, c, r, p, h, ins, pr] = await Promise.all([
        fetchKPIs(params),
        fetchMonthly(params),
        fetchCategory(params),
        fetchRegion(params),
        fetchPayment(params),
        fetchHeatmap(params),
        fetchInsights(params),
        fetchProducts(params, topN),
      ])
      setKpis(k); setMonthly(m); setCatData(c); setRegionData(r)
      setPaymentData(p); setHeatmap(h); setInsights(ins); setProducts(pr)
      if (!isFirstLoad.current) toast.success('Dashboard refreshed ⚡', { duration: 1200 })
      isFirstLoad.current = false
    } catch (e) {
      toast.error('Backend not ready — restart backend and wait ~30s for Spark to initialize')
    }
    clearInterval(timer)
    setSparkWarmup(false)
    setLoading(false)
  }, [categories, regions, dateFrom, dateTo, topN])

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [categories, regions, dateFrom, dateTo])

  useEffect(() => { if (!isFirstLoad.current) load() }, [topN])

  const kpiLoading = loading || !kpis

  return (
    <div className="space-y-6">
      {/* Insights strip */}
      <div className="glass p-4 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-amber" />
          <span className="text-xs font-semibold uppercase tracking-wider text-amber">AI-Style Insights</span>
          <div className="spark-badge ml-auto">{insights ? `⚡ ${(insights.spark_ms/1000).toFixed(2)}s` : '...'}</div>
        </div>
        {loading ? (
          <div className="flex gap-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-6 flex-1" />)}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {insights?.insights?.map((ins, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex-shrink-0 text-sm px-3 py-2 rounded-xl"
                style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)', color: 'rgba(226, 232, 240, 0.85)' }}
              >
                {ins}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Orders" value={kpis ? fmtNum(kpis.orders) : '—'} sub="clean orders" color="violet" loading={kpiLoading} icon={ShoppingCart} />
        <KpiCard label="Total Revenue" value={kpis ? fmt(kpis.revenue) : '—'} sub="after discounts" color="cyan" loading={kpiLoading} icon={TrendingUp} />
        <KpiCard label="Avg Order Value" value={kpis ? fmt(kpis.avg_order) : '—'} sub="per order" color="pink" loading={kpiLoading} icon={DollarSign} />
        <KpiCard label="Unique Customers" value={kpis ? fmtNum(kpis.customers) : '—'} sub="distinct IDs" color="amber" loading={kpiLoading} icon={Users} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <ChartCard title="Monthly Revenue" badge="Jan–Dec 2024" sparkMs={monthly?.spark_ms} loading={loading}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly?.data || []} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => v >= 1e7 ? `${(v/1e7).toFixed(1)}Cr` : `${(v/1e5).toFixed(0)}L`} tick={{ fontSize: 10 }} />
              <Tooltip content={<GlassTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#7C5CFF" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#7C5CFF' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category Bar */}
        <ChartCard title="Revenue by Category" badge="Spark groupBy + sum" sparkMs={catData?.spark_ms} loading={loading}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData?.data || []} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => `${(v/1e7).toFixed(0)}Cr`} tick={{ fontSize: 10 }} />
              <Tooltip content={<GlassTooltip />} />
              <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                {(catData?.data || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Region Donut */}
        <ChartCard title="Region Split" badge="Revenue share" sparkMs={regionData?.spark_ms} loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={regionData?.data || []} dataKey="revenue" nameKey="region" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {(regionData?.data || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<GlassTooltip />} formatter={(v) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Payment Donut */}
        <ChartCard title="Payment Modes" badge="By order count" sparkMs={paymentData?.spark_ms} loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={paymentData?.data || []} dataKey="orders" nameKey="payment_mode" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                {(paymentData?.data || []).map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<GlassTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Monthly Orders */}
        <ChartCard title="Monthly Orders" badge="Order volume" sparkMs={monthly?.spark_ms} loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthly?.data || []} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => fmtNum(v)} tick={{ fontSize: 10 }} />
              <Tooltip content={<GlassTooltip />} />
              <Area type="monotone" dataKey="orders" name="Orders" stroke="#22D3EE" strokeWidth={2} fill="url(#ordGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top Products */}
      <ChartCard title="Top Products by Revenue" badge={`Top ${topN} products`} sparkMs={products?.spark_ms} loading={loading}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-muted">Show top:</span>
          {[5, 10, 15, 20].map(n => (
            <button key={n} onClick={() => setTopN(n)}
              className={`chip ${topN === n ? 'active' : ''}`}>
              {n}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={Math.max(topN * 34, 200)}>
          <BarChart data={products?.data || []} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="product" width={120} tick={{ fontSize: 11 }} />
            <Tooltip content={<GlassTooltip />} />
            <Bar dataKey="revenue" name="Revenue" radius={[0, 6, 6, 0]}>
              {(products?.data || []).map((d, i) => (
                <Cell key={i} fill={`rgba(124, 92, 255, ${1 - i * 0.04})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Heatmap */}
      <HeatmapChart data={heatmap?.data || []} loading={loading} sparkMs={heatmap?.spark_ms} />
    </div>
  )
}
