import { create } from 'zustand'

export const useFilterStore = create((set, get) => ({
  categories: [],
  regions: [],
  dateFrom: '',
  dateTo: '',
  
  setCategories: (categories) => set({ categories }),
  setRegions: (regions) => set({ regions }),
  setDateFrom: (dateFrom) => set({ dateFrom }),
  setDateTo: (dateTo) => set({ dateTo }),
  clearFilters: () => set({ categories: [], regions: [], dateFrom: '', dateTo: '' }),
  
  getQueryParams: () => {
    const { categories, regions, dateFrom, dateTo } = get()
    const params = new URLSearchParams()
    if (categories.length > 0) params.set('categories', categories.join(','))
    if (regions.length > 0) params.set('regions', regions.join(','))
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    return params.toString()
  },
  
  activeFilterCount: () => {
    const { categories, regions, dateFrom, dateTo } = get()
    return categories.length + regions.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)
  }
}))

export const useThemeStore = create((set) => ({
  dark: true,
  toggle: () => set((s) => {
    const next = !s.dark
    if (next) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', next ? 'dark' : 'light')
    return { dark: next }
  }),
  init: () => {
    const saved = localStorage.getItem('theme')
    const dark = saved ? saved === 'dark' : true
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    set({ dark })
  }
}))
