import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Zap, ArrowRight, Database, Server, Code2, BarChart3, Brain, Cpu } from 'lucide-react'

const TECH_BADGES = [
  { label: 'Apache Spark', color: '#F59E0B', icon: '⚡' },
  { label: 'PySpark', color: '#22D3EE', icon: '🐍' },
  { label: 'MLlib', color: '#F472B6', icon: '🤖' },
  { label: 'Spark SQL', color: '#7C5CFF', icon: '📊' },
  { label: 'FastAPI', color: '#22D3EE', icon: '🚀' },
  { label: 'React', color: '#7C5CFF', icon: '⚛️' },
]

const STATS = [
  { label: 'Orders Processed', value: 500000, suffix: '', prefix: '' },
  { label: 'Spark Partitions', value: 8, suffix: '', prefix: '' },
  { label: 'ML Segments', value: 3, suffix: '', prefix: 'K-' },
  { label: 'API Endpoints', value: 12, suffix: '+', prefix: '' },
]

function CountUp({ target, duration = 2000, prefix = '', suffix = '' }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target])
  return <>{prefix}{count >= 1000 ? count.toLocaleString() : count}{suffix}</>
}

const TYPEWRITER_TEXTS = [
  'E-Commerce Analytics',
  'Customer Segmentation',
  'Real-Time Insights',
  'Big Data Processing',
]

function Typewriter() {
  const [index, setIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) {
      const t = setTimeout(() => setPaused(false), 1500)
      return () => clearTimeout(t)
    }
    const target = TYPEWRITER_TEXTS[index]
    if (!deleting) {
      if (displayed.length < target.length) {
        const t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 80)
        return () => clearTimeout(t)
      } else {
        setPaused(true)
        setDeleting(true)
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40)
        return () => clearTimeout(t)
      } else {
        setDeleting(false)
        setIndex((i) => (i + 1) % TYPEWRITER_TEXTS.length)
      }
    }
  }, [displayed, deleting, index, paused])

  return (
    <span className="gradient-text">
      {displayed}<span className="animate-pulse text-violet">|</span>
    </span>
  )
}

function Orb({ x, y, size, color, delay = 0 }) {
  return (
    <motion.div
      className="orb"
      style={{ left: x, top: y, width: size, height: size, background: color }}
      animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const heroRef = useRef()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 40, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 40, damping: 20 })

  useEffect(() => {
    const handler = (e) => {
      if (!heroRef.current) return
      const rect = heroRef.current.getBoundingClientRect()
      mouseX.set((e.clientX - rect.left - rect.width / 2) * 0.02)
      mouseY.set((e.clientY - rect.top - rect.height / 2) * 0.02)
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return (
    <div ref={heroRef} className="relative min-h-screen bg-[#070B1A] overflow-hidden flex flex-col">
      {/* Animated grid */}
      <div className="absolute inset-0 bg-grid opacity-40" />

      {/* Orbs */}
      <Orb x="10%" y="15%" size={500} color="#7C5CFF" delay={0} />
      <Orb x="65%" y="5%" size={400} color="#22D3EE" delay={2} />
      <Orb x="75%" y="60%" size={350} color="#F472B6" delay={1} />
      <Orb x="20%" y="65%" size={300} color="#F59E0B" delay={3} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C5CFF, #22D3EE)' }}>
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-heading font-bold text-lg gradient-text">SalesSpark</span>
        </div>
        <div className="text-xs text-muted font-mono px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(34, 211, 238, 0.1)', border: '1px solid rgba(34, 211, 238, 0.25)', color: '#22D3EE' }}>
          ⚡ Big Data Analytics Engine — Apache Spark 3.5
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        {/* Subtitle badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-medium"
          style={{
            background: 'rgba(124, 92, 255, 0.1)',
            border: '1px solid rgba(124, 92, 255, 0.3)',
          }}
        >
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Scalable E-Commerce Analytics with Apache Spark
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="font-heading font-bold text-6xl md:text-7xl leading-tight mb-6 max-w-4xl"
          style={{ lineHeight: 1.1 }}
        >
          <Typewriter />
          <br />
          <span className="text-white">at Spark Scale</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-dim max-w-xl mb-12 leading-relaxed"
        >
          High-performance distributed in-memory computing across <span className="text-cyan font-semibold font-mono">500,000 orders</span> using
          Apache Spark — Catalyst SQL engine, MLlib customer clustering, and parallel RDD transformations.
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.65, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.05, boxShadow: '0 0 60px rgba(124, 92, 255, 0.6)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/dashboard')}
          className="relative overflow-hidden group flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-semibold text-white mb-16"
          style={{ background: 'linear-gradient(135deg, #7C5CFF, #22D3EE)' }}
        >
          <span className="relative z-10">Launch Dashboard</span>
          <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
          {/* Ripple bg */}
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 w-full max-w-2xl"
        >
          {STATS.map(({ label, value, prefix, suffix }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.1 }}
              className="glass p-4 rounded-2xl text-center"
            >
              <div className="font-heading font-bold text-3xl gradient-text">
                <CountUp target={value} prefix={prefix} suffix={suffix} />
              </div>
              <div className="text-xs text-muted mt-1">{label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tech Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {TECH_BADGES.map(({ label, color, icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 + i * 0.07 }}
              whileHover={{ scale: 1.1, y: -2 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium cursor-default"
              style={{
                background: `${color}15`,
                border: `1px solid ${color}40`,
                color: color,
              }}
            >
              <span>{icon}</span> {label}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom architecture hint */}
      <div className="relative z-10 border-t border-white/5 py-6 px-8 flex items-center justify-center gap-8 text-xs text-muted flex-wrap">
        {['CSV Ingest', '→', 'Spark Clean', '→', 'Cache', '→', 'SQL / RDD / MLlib', '→', 'FastAPI', '→', 'React UI'].map((s, i) => (
          <span key={i} className={s === '→' ? 'text-violet opacity-60' : 'font-mono'}>{s}</span>
        ))}
      </div>
    </div>
  )
}
