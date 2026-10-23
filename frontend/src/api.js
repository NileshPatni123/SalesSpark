import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

export const fetchMeta = () => api.get('/meta').then(r => r.data)
export const fetchPipeline = () => api.get('/pipeline').then(r => r.data)
export const fetchKPIs = (params) => api.get('/kpis?' + params).then(r => r.data)
export const fetchMonthly = (params) => api.get('/monthly?' + params).then(r => r.data)
export const fetchCategory = (params) => api.get('/category?' + params).then(r => r.data)
export const fetchProducts = (params, limit = 10) => api.get(`/products?limit=${limit}&${params}`).then(r => r.data)
export const fetchRegion = (params) => api.get('/region?' + params).then(r => r.data)
export const fetchPayment = (params) => api.get('/payment?' + params).then(r => r.data)
export const fetchHeatmap = (params) => api.get('/heatmap?' + params).then(r => r.data)
export const fetchInsights = (params) => api.get('/insights?' + params).then(r => r.data)
export const fetchMapReduce = (params) => api.get('/mapreduce?' + params).then(r => r.data)
export const fetchSegmentation = (k, params) => api.get(`/segmentation?k=${k}&${params}`).then(r => r.data)
export const runSQL = (body) => api.post('/sql', body).then(r => r.data)
export const fetchHealth = () => api.get('/health').then(r => r.data)

export default api
