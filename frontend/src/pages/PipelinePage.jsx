import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchPipeline } from '../api'
import { Skeleton } from '../components/UI'

const NODES = [
  { id: 'csv', label: 'sales.csv', sub: '500K rows', color: '#F59E0B', icon: '📂', desc: 'Raw CSV data generated with numpy/pandas. Contains 500,000 synthetic e-commerce orders with festive-season patterns.' },
  { id: 'ingest', label: 'Ingest', sub: 'inferSchema', color: '#7C5CFF', icon: '📥', desc: 'Spark reads the CSV with spark.read.csv(). inferSchema=True auto-detects column types. The data is distributed across partitions.' },
  { id: 'clean', label: 'Clean', sub: 'dropna + dedup', color: '#22D3EE', icon: '🧹', desc: 'dropna() removes rows with null values in critical columns. dropDuplicates(["order_id"]) removes exact duplicate orders.' },
  { id: 'transform', label: 'Transform', sub: 'withColumn', color: '#F472B6', icon: '⚙️', desc: 'withColumn("revenue") computes revenue = quantity * unit_price * (1 - discount/100). withColumn("month") extracts month number.' },
  { id: 'cache', label: 'Cache', sub: 'persist in RAM', color: '#10B981', icon: '💾', desc: 'cache() pins the clean DataFrame in executor memory. First action triggers computation; all subsequent queries hit the cache for <300ms response.' },
  { id: 'api', label: 'DataFrame API', sub: 'groupBy, agg', color: '#7C5CFF', icon: '📊', desc: 'groupBy().agg() computes revenue, order counts, averages. Spark SQL uses Catalyst optimizer to generate optimal physical plans.' },
  { id: 'sql', label: 'Spark SQL', sub: 'SELECT on views', color: '#22D3EE', icon: '🔍', desc: 'createOrReplaceTempView() registers the DataFrame as "sales". SQL queries are compiled through the same Catalyst optimizer.' },
  { id: 'rdd', label: 'RDD MapReduce', sub: 'map + reduceByKey', color: '#F472B6', icon: '🔀', desc: 'rdd.map() transforms each row. reduceByKey() performs distributed aggregation. This demonstrates the classic MapReduce paradigm on Spark.' },
  { id: 'mllib', label: 'MLlib KMeans', sub: 'VectorAssembler→KMeans', color: '#F59E0B', icon: '🤖', desc: 'VectorAssembler combines features. StandardScaler normalizes them. KMeans clusters customers into segments. Evaluated with silhouette score.' },
]

function NodeCard({ node, active, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(node)}
      className="flex flex-col items-center gap-1 cursor-pointer"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300"
        style={{
          background: active ? `${node.color}25` : `${node.color}10`,
          border: `2px solid ${active ? node.color : node.color + '40'}`,
          boxShadow: active ? `0 0 30px ${node.color}50` : 'none',
        }}
      >
        {node.icon}
      </div>
      <div className="text-xs font-semibold text-center text-white">{node.label}</div>
      <div className="text-[10px] text-muted text-center">{node.sub}</div>
    </motion.div>
  )
}

function Arrow({ color }) {
  return (
    <div className="flex flex-col items-center justify-center flex-shrink-0 px-1">
      <div className="flex items-center gap-0">
        <div className="h-0.5 w-8" style={{ background: `linear-gradient(to right, ${color}80, ${color})` }} />
        <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[8px] border-transparent"
          style={{ borderLeftColor: color }} />
      </div>
      {/* Animated dot */}
      <motion.div
        className="w-1.5 h-1.5 rounded-full mt-1"
        style={{ background: color }}
        animate={{ x: [0, 24, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

export default function PipelinePage() {
  const [stats, setStats] = useState(null)
  const [activeNode, setActiveNode] = useState(NODES[4]) // cache by default

  useEffect(() => {
    fetchPipeline().then(setStats).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl gradient-text">Pipeline & Architecture</h2>
        <p className="text-sm text-muted mt-1">Distributed DAG execution graph, in-memory caching lifecycle, and cluster topology</p>
      </div>

      {/* Flow diagram */}
      <div className="glass p-6 rounded-2xl overflow-x-auto">
        <div className="flex items-start gap-1 min-w-max pb-2">
          {NODES.map((node, i) => (
            <div key={node.id} className="flex items-center">
              <NodeCard node={node} active={activeNode?.id === node.id} onClick={setActiveNode} />
              {i < NODES.length - 1 && <Arrow color={NODES[i + 1].color} />}
            </div>
          ))}
        </div>
      </div>

      {/* Node explanation */}
      {activeNode && (
        <motion.div
          key={activeNode.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-5 rounded-2xl"
          style={{ borderColor: `${activeNode.color}30` }}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{activeNode.icon}</span>
            <div>
              <h3 className="font-heading font-bold" style={{ color: activeNode.color }}>{activeNode.label}</h3>
              <div className="text-xs text-muted font-mono">{activeNode.sub}</div>
            </div>
          </div>
          <p className="text-sm text-dim leading-relaxed">{activeNode.desc}</p>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Raw Rows', value: stats ? stats.raw_rows?.toLocaleString() : null, color: '#F59E0B' },
          { label: 'Clean Rows', value: stats ? stats.clean_rows?.toLocaleString() : null, color: '#10B981' },
          { label: 'Removed', value: stats ? stats.removed_rows?.toLocaleString() : null, color: '#F472B6' },
          { label: 'Partitions', value: stats?.partitions, color: '#7C5CFF' },
          { label: 'Spark Version', value: stats?.spark_version, color: '#22D3EE' },
          { label: 'Load Time', value: stats ? `${stats.load_time_s}s` : null, color: '#F59E0B' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass p-4 rounded-xl text-center">
            {value ? (
              <>
                <div className="font-heading font-bold text-lg" style={{ color }}>{value}</div>
                <div className="text-xs text-muted mt-1">{label}</div>
              </>
            ) : (
              <Skeleton className="h-12 w-full" />
            )}
          </div>
        ))}
      </div>

      {/* Architecture table */}
      <div className="glass p-5 rounded-2xl">
        <h3 className="font-heading font-semibold mb-4 gradient-text">Technology Stack</h3>
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Layer</th>
              <th>Technology</th>
              <th>Purpose</th>
              <th>Why Spark?</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Data', 'numpy + pandas', 'Synthetic data generation', 'Avoids Windows winutils issue'],
              ['Processing', 'Apache Spark 3.5 (local[*])', 'Distributed analytics engine', 'In-memory, 100x faster than Hadoop'],
              ['SQL', 'Spark SQL + Catalyst', 'SQL queries on DataFrames', 'Unified API for SQL + code'],
              ['ML', 'MLlib (KMeans)', 'Customer segmentation', 'Scalable ML on same cluster'],
              ['RDD', 'PySpark RDD API', 'MapReduce demonstration', 'Low-level distributed ops'],
              ['Backend', 'FastAPI + Uvicorn', 'REST API for the frontend', 'Async Python, OpenAPI docs'],
              ['Frontend', 'React + Vite + Recharts', 'Interactive visualization', 'Fast HMR, component-based'],
            ].map(([layer, tech, purpose, why]) => (
              <tr key={layer}>
                <td className="text-violet font-semibold">{layer}</td>
                <td className="text-cyan">{tech}</td>
                <td className="text-dim">{purpose}</td>
                <td className="text-muted text-xs">{why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
