import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, FlaskConical, Shuffle, Users, 
  GitBranch, BookOpen, Zap, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sql', icon: FlaskConical, label: 'SQL Lab' },
  { to: '/mapreduce', icon: Shuffle, label: 'MapReduce' },
  { to: '/segmentation', icon: Users, label: 'Segmentation' },
  { to: '/pipeline', icon: GitBranch, label: 'Architecture' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong flex flex-col border-r border-violet/10 overflow-hidden flex-shrink-0 relative z-10"
      style={{ minHeight: '100vh' }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 p-4 border-b border-violet/10 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7C5CFF, #22D3EE)' }}>
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <div className="font-heading font-bold text-sm gradient-text leading-none">SalesSpark</div>
            <div className="text-[9px] text-muted mt-0.5 font-mono uppercase tracking-wider">Apache Spark</div>
          </motion.div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to
          return (
            <NavLink key={to} to={to}>
              <div className={`nav-item ${active ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}>
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm font-medium truncate"
                  >
                    {label}
                  </motion.span>
                )}
                {active && !collapsed && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-violet"
                  />
                )}
              </div>
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="m-3 p-2 rounded-xl transition-colors hover:bg-violet/10 flex justify-center text-muted hover:text-white"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Cluster status note */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div className="text-[10px] text-center text-muted px-2 py-1.5 rounded-lg"
            style={{ background: 'rgba(34, 211, 238, 0.05)', border: '1px solid rgba(34, 211, 238, 0.15)' }}>
            ⚡ 500K Distributed Orders
          </div>
        </div>
      )}
    </motion.aside>
  )
}
