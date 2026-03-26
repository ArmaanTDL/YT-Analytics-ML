'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = 'http://localhost:8000'

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'charts', label: 'Visualizations', icon: '📈' },
  { id: 'ml', label: 'ML Models', icon: '🤖' },
  { id: 'predict', label: 'Predict Viral', icon: '🎯' },
]

const CHART_CONFIGS = [
  { id: 'views-distribution', label: 'Views Distribution', icon: '👁️' },
  { id: 'category-analysis', label: 'Category Analysis', icon: '🏷️' },
  { id: 'engagement', label: 'Engagement Analysis', icon: '💬' },
  { id: 'title-analysis', label: 'Title Analysis', icon: '✍️' },
  { id: 'likes-dislikes', label: 'Likes & Dislikes', icon: '👍' },
  { id: 'correlation', label: 'Correlation Matrix', icon: '🔗' },
  { id: 'wordcloud', label: 'Word Cloud', icon: '☁️' },
  { id: 'top-channels', label: 'Top Channels', icon: '⭐' },
]

const MODELS = [
  { id: 'random_forest', label: 'Random Forest', desc: 'Ensemble of decision trees, great accuracy' },
  { id: 'gradient_boosting', label: 'Gradient Boosting', desc: 'Sequential boosting, high performance' },
  { id: 'logistic_regression', label: 'Logistic Regression', desc: 'Linear baseline classifier' },
]

const CATEGORIES: Record<number, string> = {
  1: 'Film & Animation', 2: 'Autos & Vehicles', 10: 'Music',
  15: 'Pets & Animals', 17: 'Sports', 20: 'Gaming',
  22: 'People & Blogs', 23: 'Comedy', 24: 'Entertainment',
  25: 'News & Politics', 26: 'Howto & Style', 27: 'Education',
  28: 'Science & Technology',
}

function formatNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toString()
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview')
  const [uploaded, setUploaded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [overview, setOverview] = useState<any>(null)
  const [charts, setCharts] = useState<Record<string, string>>({})
  const [loadingCharts, setLoadingCharts] = useState<Record<string, boolean>>({})
  const [mlResult, setMlResult] = useState<any>(null)
  const [mlLoading, setMlLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('random_forest')
  const [predictResult, setPredictResult] = useState<any>(null)
  const [predictLoading, setPredictLoading] = useState(false)
  const [predictForm, setPredictForm] = useState({
    title_length: 45,
    tag_count: 12,
    category_id: 24,
    likes: 50000,
    dislikes: 1000,
    comment_count: 5000,
    contains_capitalized: false,
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file!')
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axios.post(`${API}/api/upload`, formData)
      setUploaded(true)
      toast.success(`✅ Loaded ${res.data.rows.toLocaleString()} videos!`)
      const overviewRes = await axios.get(`${API}/api/overview`)
      setOverview(overviewRes.data)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.response?.data?.detail || 'Upload failed. Is the backend running?')
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  })

  const loadChart = async (chartId: string) => {
    if (charts[chartId]) return
    setLoadingCharts(p => ({ ...p, [chartId]: true }))
    try {
      const res = await axios.get(`${API}/api/charts/${chartId}`)
      setCharts(p => ({ ...p, [chartId]: res.data.image }))
    } catch (e) {
      toast.error(`Failed to load chart: ${chartId}`)
    } finally {
      setLoadingCharts(p => ({ ...p, [chartId]: false }))
    }
  }

  const loadAllCharts = async () => {
    for (const c of CHART_CONFIGS) {
      loadChart(c.id)
    }
  }

  const trainModel = async () => {
    setMlLoading(true)
    setMlResult(null)
    try {
      const res = await axios.post(`${API}/api/ml/train?model_type=${selectedModel}`)
      setMlResult(res.data)
      toast.success(`🤖 ${selectedModel.replace('_', ' ')} trained! Accuracy: ${(res.data.accuracy * 100).toFixed(1)}%`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Training failed')
    } finally {
      setMlLoading(false)
    }
  }

  const predictViral = async () => {
    setPredictLoading(true)
    setPredictResult(null)
    try {
      const params = new URLSearchParams({
        title_length: predictForm.title_length.toString(),
        tag_count: predictForm.tag_count.toString(),
        category_id: predictForm.category_id.toString(),
        likes: predictForm.likes.toString(),
        dislikes: predictForm.dislikes.toString(),
        comment_count: predictForm.comment_count.toString(),
        contains_capitalized: predictForm.contains_capitalized.toString(),
      })
      const res = await axios.post(`${API}/api/ml/predict?${params}`)
      setPredictResult(res.data)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Prediction failed')
    } finally {
      setPredictLoading(false)
    }
  }

  return (
    <div className="app-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <a href="#" className="navbar-brand">
          <div className="navbar-logo">▶</div>
          <span className="navbar-title">YT TrendLens</span>
        </a>
        <div className="navbar-links">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-badge">
          <span className="dot" />
          AI-Powered Analytics
        </div>
        <h1 className="hero-title">
          YouTube Trending<br />
          <span className="gradient-text">Analysis Platform</span>
        </h1>
        <p className="hero-subtitle">
          Upload your dataset to unlock deep insights, stunning visualizations, and machine learning predictions on what makes a video go viral.
        </p>

        {/* Upload */}
        <div className="upload-section">
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="dropzone-icon">{uploading ? '⏳' : uploaded ? '✅' : '📂'}</div>
            <div className="dropzone-title">
              {uploading
                ? 'Uploading & Analyzing...'
                : uploaded
                ? 'Dataset Loaded — Drop a new one to replace'
                : isDragActive
                ? 'Drop it here!'
                : 'Drop USvideos.csv here'}
            </div>
            <div className="dropzone-sub">
              {uploading ? (
                <span>Processing your data...</span>
              ) : (
                <span>or <span>click to browse</span> — CSV format required</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      {overview && (
        <div className="stats-bar animate-fade-up">
          <div className="stat-card">
            <div className="stat-icon">🎬</div>
            <div className="stat-label">Total Videos</div>
            <div className="stat-value">{formatNum(overview.total_videos)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📺</div>
            <div className="stat-label">Unique Channels</div>
            <div className="stat-value">{formatNum(overview.unique_channels)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👁️</div>
            <div className="stat-label">Avg Views</div>
            <div className="stat-value">{formatNum(Math.round(overview.stats?.views?.mean || 0))}</div>
            <div className="stat-sub">Median: {formatNum(Math.round(overview.stats?.views?.median || 0))}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👍</div>
            <div className="stat-label">Avg Likes</div>
            <div className="stat-value">{formatNum(Math.round(overview.stats?.likes?.mean || 0))}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💬</div>
            <div className="stat-label">Avg Comments</div>
            <div className="stat-value">{formatNum(Math.round(overview.stats?.comment_count?.mean || 0))}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-label">Max Views</div>
            <div className="stat-value">{formatNum(Math.round(overview.stats?.views?.max || 0))}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {uploaded && (
        <div className="tabs-wrapper">
          <div className="tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="content-area">
        {!uploaded && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">Ready to Analyze</div>
            <div className="empty-sub">
              Upload your <strong>USvideos.csv</strong> dataset above to unlock<br />
              all analysis features, charts, and ML predictions.
            </div>
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {uploaded && activeTab === 'overview' && overview && (
          <div className="animate-fade-up">
            <div className="section-header">
              <h2>📊 Dataset Overview</h2>
              <p>Summary statistics and quick insights from your dataset</p>
            </div>

            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
              {/* Stats table */}
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">📈 Numeric Statistics</div>
                </div>
                <div className="chart-body">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Mean</th>
                        <th>Median</th>
                        <th>Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(overview.stats).map(([col, s]: any) => (
                        <tr key={col}>
                          <td><span className="tag tag-purple">{col.replace('_', ' ')}</span></td>
                          <td>{formatNum(Math.round(s.mean))}</td>
                          <td>{formatNum(Math.round(s.median))}</td>
                          <td>{formatNum(Math.round(s.max))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top videos */}
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">🏆 Top Viewed Videos</div>
                </div>
                <div className="chart-body">
                  <table className="data-table">
                    <thead>
                      <tr><th>#</th><th>Title</th><th>Views</th><th>Likes</th></tr>
                    </thead>
                    <tbody>
                      {overview.top_viewed?.map((v: any, i: number) => (
                        <tr key={i}>
                          <td><span className="tag tag-yellow">{i + 1}</span></td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={v.title}>{v.title}</td>
                          <td>{formatNum(v.views)}</td>
                          <td>{formatNum(v.likes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Category distribution */}
            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">🏷️ Top Categories</div>
              </div>
              <div className="chart-body">
                {Object.entries(overview.category_distribution)
                  .sort(([, a]: any, [, b]: any) => b - a)
                  .map(([cat, count]: any) => {
                    const max = Math.max(...Object.values(overview.category_distribution) as number[])
                    const pct = (count / max) * 100
                    return (
                      <div key={cat} style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cat}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {count.toLocaleString()}
                          </span>
                        </div>
                        <div className="progress-bar-wrap">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${pct}%`,
                              background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Key observations */}
            <div className="ml-card">
              <div className="ml-card-title">💡 Key Observations</div>
              <div className="grid-3">
                {[
                  { icon: '👁️', title: 'Average Views', detail: `${formatNum(Math.round(overview.stats?.views?.mean || 0))} per video — half of trending videos have less than ${formatNum(Math.round(overview.stats?.views?.median || 0))} views.` },
                  { icon: '👍', title: 'Likes vs Dislikes', detail: `Average ${formatNum(Math.round(overview.stats?.likes?.mean || 0))} likes vs ${formatNum(Math.round(overview.stats?.dislikes?.mean || 0))} dislikes — a ~${Math.round((overview.stats?.likes?.mean || 1) / (overview.stats?.dislikes?.mean || 1))}:1 ratio.` },
                  { icon: '💬', title: 'Comment Engagement', detail: `Videos get an avg of ${formatNum(Math.round(overview.stats?.comment_count?.mean || 0))} comments. The top 1% are extremely viral.` },
                ].map(obs => (
                  <div key={obs.title} style={{ padding: '1rem', background: 'rgba(124,58,237,0.05)', borderRadius: 12, border: '1px solid rgba(124,58,237,0.1)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{obs.icon}</div>
                    <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>{obs.title}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{obs.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CHARTS TAB ── */}
        {uploaded && activeTab === 'charts' && (
          <div className="animate-fade-up">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2>📈 Visualizations</h2>
                <p>Click any chart to generate it, or load all at once</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={loadAllCharts}
              >
                🚀 Load All Charts
              </button>
            </div>

            {CHART_CONFIGS.map(chart => (
              <div key={chart.id} className="chart-card" style={{ marginBottom: '1.5rem' }}>
                <div className="chart-header">
                  <div className="chart-title">{chart.icon} {chart.label}</div>
                  {!charts[chart.id] && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      onClick={() => loadChart(chart.id)}
                      disabled={loadingCharts[chart.id]}
                    >
                      {loadingCharts[chart.id] ? <><span className="loading-spinner" style={{ width: 14, height: 14 }} /> Generating...</> : '▶ Generate'}
                    </button>
                  )}
                </div>
                <div className="chart-body">
                  {loadingCharts[chart.id] ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <div className="loading-spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: '0 auto 1rem' }} />
                      <div>Generating chart...</div>
                    </div>
                  ) : charts[chart.id] ? (
                    <img src={charts[chart.id]} alt={chart.label} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.4 }}>{chart.icon}</div>
                      <div>Click "Generate" to create this visualization</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ML TAB ── */}
        {uploaded && activeTab === 'ml' && (
          <div className="animate-fade-up">
            <div className="section-header">
              <h2>🤖 Machine Learning Models</h2>
              <p>Train classifiers to predict viral videos (top 33% by views)</p>
            </div>

            <div className="grid-2">
              <div>
                <div className="ml-card">
                  <div className="ml-card-title">🧠 Select & Train Model</div>

                  <div className="form-group">
                    <label className="form-label">Algorithm</label>
                    {MODELS.map(m => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: `1px solid ${selectedModel === m.id ? 'var(--accent-purple)' : 'var(--border)'}`,
                          background: selectedModel === m.id ? 'rgba(124,58,237,0.1)' : 'transparent',
                          cursor: 'pointer',
                          marginBottom: 8,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 16, height: 16, border: `2px solid ${selectedModel === m.id ? 'var(--accent-purple)' : 'var(--border)'}`,
                            borderRadius: '50%', background: selectedModel === m.id ? 'var(--accent-purple)' : 'transparent',
                            flexShrink: 0,
                          }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{m.label}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.07)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600, marginBottom: 6 }}>ℹ️ Features Used</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['Title Length', 'Tag Count', 'Like/Dislike Ratio', 'Engagement Rate', 'Has Caps', 'Category', 'Comments', 'Dislikes'].map(f => (
                        <span key={f} className="tag tag-blue" style={{ fontSize: '0.72rem' }}>{f}</span>
                      ))}
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={trainModel}
                    disabled={mlLoading}
                  >
                    {mlLoading ? <><span className="loading-spinner" /> Training...</> : '🚀 Train Model'}
                  </button>
                </div>
              </div>

              <div>
                {mlResult ? (
                  <div className="animate-fade-up">
                    {/* Accuracy */}
                    <div className="ml-card" style={{ borderColor: 'rgba(124,58,237,0.3)' }}>
                      <div className="ml-card-title">📊 Model Performance</div>
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '3rem', fontWeight: 900, background: 'var(--gradient-purple)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {(mlResult.accuracy * 100).toFixed(1)}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Accuracy</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="metric-row">
                            <span className="metric-label">CV Mean Accuracy</span>
                            <span className="metric-value">{(mlResult.cv_mean * 100).toFixed(1)}%</span>
                          </div>
                          <div className="metric-row">
                            <span className="metric-label">CV Std Dev</span>
                            <span className="metric-value">±{(mlResult.cv_std * 100).toFixed(2)}%</span>
                          </div>
                          <div className="metric-row">
                            <span className="metric-label">Train Samples</span>
                            <span className="metric-value">{mlResult.train_samples?.toLocaleString()}</span>
                          </div>
                          <div className="metric-row">
                            <span className="metric-label">Viral Threshold</span>
                            <span className="metric-value">{formatNum(mlResult.threshold_views)} views</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Accuracy</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-green)' }}>{(mlResult.accuracy * 100).toFixed(1)}%</span>
                        </div>
                        <div className="progress-bar-wrap" style={{ height: 10 }}>
                          <div className="progress-bar-fill"
                            style={{ width: `${mlResult.accuracy * 100}%`, background: 'linear-gradient(90deg, #7c3aed, #10b981)' }} />
                        </div>
                      </div>
                    </div>

                    {/* Feature importance */}
                    <div className="ml-card">
                      <div className="ml-card-title">⚡ Feature Importance</div>
                      {Object.entries(mlResult.feature_importance).map(([feat, val]: any, i) => (
                        <div key={feat} style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {feat.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {(val * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="progress-bar-wrap">
                            <div className="progress-bar-fill"
                              style={{
                                width: `${val * 100}%`,
                                background: `hsl(${250 + i * 20}, 70%, 60%)`,
                              }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="ml-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🤖</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Train a model to see performance metrics, confusion matrix, and feature importance scores.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Confusion matrix image */}
            {mlResult?.image && (
              <div className="chart-card animate-fade-up">
                <div className="chart-header">
                  <div className="chart-title">🎯 Confusion Matrix & Feature Importance</div>
                  <span className="tag tag-green">
                    {MODELS.find(m => m.id === selectedModel)?.label}
                  </span>
                </div>
                <div className="chart-body">
                  <img src={mlResult.image} alt="Confusion Matrix" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PREDICT TAB ── */}
        {uploaded && activeTab === 'predict' && (
          <div className="animate-fade-up">
            <div className="section-header">
              <h2>🎯 Viral Video Predictor</h2>
              <p>Enter video attributes to predict if it will go viral</p>
            </div>

            <div className="grid-2">
              <div className="ml-card">
                <div className="ml-card-title">📝 Video Attributes</div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Title Length (chars)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={predictForm.title_length}
                      onChange={e => setPredictForm(p => ({ ...p, title_length: Number(e.target.value) }))}
                      min={1} max={100}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Tags</label>
                    <input
                      type="number"
                      className="form-input"
                      value={predictForm.tag_count}
                      onChange={e => setPredictForm(p => ({ ...p, tag_count: Number(e.target.value) }))}
                      min={0} max={100}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Likes</label>
                    <input
                      type="number"
                      className="form-input"
                      value={predictForm.likes}
                      onChange={e => setPredictForm(p => ({ ...p, likes: Number(e.target.value) }))}
                      min={0}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Dislikes</label>
                    <input
                      type="number"
                      className="form-input"
                      value={predictForm.dislikes}
                      onChange={e => setPredictForm(p => ({ ...p, dislikes: Number(e.target.value) }))}
                      min={0}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Comments</label>
                    <input
                      type="number"
                      className="form-input"
                      value={predictForm.comment_count}
                      onChange={e => setPredictForm(p => ({ ...p, comment_count: Number(e.target.value) }))}
                      min={0}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={predictForm.category_id}
                      onChange={e => setPredictForm(p => ({ ...p, category_id: Number(e.target.value) }))}
                    >
                      {Object.entries(CATEGORIES).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={predictForm.contains_capitalized}
                      onChange={e => setPredictForm(p => ({ ...p, contains_capitalized: e.target.checked }))}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Title contains ALL CAPS word (e.g. "VIRAL", "INSANE")
                    </span>
                  </label>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={predictViral}
                  disabled={predictLoading}
                >
                  {predictLoading
                    ? <><span className="loading-spinner" /> Predicting...</>
                    : '🎯 Predict Viral Potential'}
                </button>
              </div>

              {/* Result */}
              <div>
                {predictResult ? (
                  <div className="animate-fade-up">
                    <div className={`ml-card ${predictResult.prediction === 'Viral' ? '' : ''}`}
                      style={{
                        borderColor: predictResult.prediction === 'Viral'
                          ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
                        background: predictResult.prediction === 'Viral'
                          ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
                      }}>
                      <div className="ml-card-title">🎬 Prediction Result</div>

                      <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                        <div style={{
                          fontSize: '4rem',
                          marginBottom: '0.5rem',
                          filter: 'drop-shadow(0 0 20px currentColor)',
                        }}>
                          {predictResult.prediction === 'Viral' ? '🔥' : '❄️'}
                        </div>

                        <div className={`prediction-badge ${predictResult.prediction === 'Viral' ? 'prediction-viral' : 'prediction-not-viral'}`}>
                          {predictResult.prediction === 'Viral' ? '✅' : '❌'} {predictResult.prediction}
                        </div>

                        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                          Needs &gt;{formatNum(predictResult.threshold_views)} views to be viral
                        </div>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--accent-green)' }}>🔥 Viral Probability</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                            {(predictResult.viral_probability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="progress-bar-wrap" style={{ height: 12 }}>
                          <div className="progress-bar-fill"
                            style={{
                              width: `${predictResult.viral_probability * 100}%`,
                              background: 'linear-gradient(90deg, #10b981, #34d399)',
                            }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--accent-red)' }}>❄️ Not Viral Probability</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-red)' }}>
                            {(predictResult.not_viral_probability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="progress-bar-wrap" style={{ height: 12 }}>
                          <div className="progress-bar-fill"
                            style={{
                              width: `${predictResult.not_viral_probability * 100}%`,
                              background: 'linear-gradient(90deg, #ef4444, #f87171)',
                            }} />
                        </div>
                      </div>

                      <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                        <div className="metric-row">
                          <span className="metric-label">Model Confidence</span>
                          <span className="metric-value" style={{ color: predictResult.confidence > 0.7 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
                            {(predictResult.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-card">
                      <div className="ml-card-title">💡 Tips to Improve Virality</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { tip: 'Keep title between 30-55 characters', good: predictForm.title_length >= 30 && predictForm.title_length <= 55 },
                          { tip: 'Use 10-20 relevant tags', good: predictForm.tag_count >= 10 && predictForm.tag_count <= 20 },
                          { tip: 'Use at least one ALL CAPS word in title', good: predictForm.contains_capitalized },
                          { tip: 'Upload Entertainment or Music content', good: [10, 24, 23].includes(predictForm.category_id) },
                        ].map(({ tip, good }) => (
                          <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{good ? '✅' : '⚠️'}</span>
                            <span style={{ fontSize: '0.82rem', color: good ? 'var(--accent-green)' : 'var(--text-secondary)', lineHeight: 1.5 }}>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="ml-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3 }}>🎯</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                      Fill in your video&apos;s attributes and click <strong style={{ color: 'var(--text-secondary)' }}>Predict Viral Potential</strong> to see if your video has what it takes to trend!
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="footer">
        <strong style={{ color: 'var(--text-secondary)' }}>YT TrendLens</strong> — YouTube Trending Analysis Platform &nbsp;·&nbsp;
        Built with Next.js + FastAPI + scikit-learn
      </footer>
    </div>
  )
}
