import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import { useThemeStore } from './store'

// Pages
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import SQLLab from './pages/SQLLab'
import MapReducePage from './pages/MapReducePage'
import SegmentationPage from './pages/SegmentationPage'
import PipelinePage from './pages/PipelinePage'

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

function AppShell({ children }) {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  if (isLanding) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--bg-base)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="h-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sql" element={<SQLLab />} />
          <Route path="/mapreduce" element={<MapReducePage />} />
          <Route path="/segmentation" element={<SegmentationPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/architecture" element={<PipelinePage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  const init = useThemeStore((s) => s.init)
  useEffect(() => { init() }, [])

  return (
    <BrowserRouter>
      <AppShell>
        <AnimatedRoutes />
      </AppShell>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(13, 19, 38, 0.95)',
            color: '#e2e8f0',
            border: '1px solid rgba(124, 92, 255, 0.3)',
            borderRadius: '12px',
            backdropFilter: 'blur(16px)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#22D3EE', secondary: '#070B1A' },
          },
          error: {
            iconTheme: { primary: '#F472B6', secondary: '#070B1A' },
          },
        }}
      />
    </BrowserRouter>
  )
}
